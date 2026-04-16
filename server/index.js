// server/index.js
require("dotenv").config({ path: '../client/.env' });
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { requireAuth } = require("./middleware/auth");

const BOOT_MARKER = new Date().toISOString();
const VERIFICATION_CODE_TTL_MINUTES = 15;

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require("multer");

function runQuery(sql, params = []) {
  return pool.query(sql, params).then(([rows]) => rows);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  const [salt, storedHash] = String(storedValue).split(":");
  if (!salt || !storedHash) return false;
  const computedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(storedHash, "hex"),
    Buffer.from(computedHash, "hex")
  );
}

function hashVerificationCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function generateVerificationCode() {
  const value = crypto.randomInt(0, 1000000);
  return String(value).padStart(6, "0");
}

function getVerificationExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + VERIFICATION_CODE_TTL_MINUTES);
  return expiresAt;
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 2525);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendVerificationEmail(email, code) {
  const transporter = getSmtpTransporter();
  if (!transporter) {
    throw new Error(
      'Missing SMTP configuration. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in backend/.env.'
    );
  }

  const fromAddress = process.env.SMTP_FROM ||
    'Peer-To-Peer Book Exchange <no-reply@p2pbookexchange.com>';
  const toAddress = process.env.SMTP_TO_OVERRIDE || email;

  console.log('[SMTP] sending', {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 2525),
    from: fromAddress,
    to: toAddress,
  });

  const info = await transporter.sendMail({
    from: fromAddress,
    to: toAddress,
    subject: 'Peer-To-Peer Book Exchange: Verify your UWM email',
    html: `<p>Your verification code is <strong>${code}</strong>. It expires in ${VERIFICATION_CODE_TTL_MINUTES} minutes.</p>`,
    text: `Your verification code is ${code}. It expires in ${VERIFICATION_CODE_TTL_MINUTES} minutes.`,
  });

  console.log('[SMTP] accepted', {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  });
  return info;
}

function isValidUwmEmail(email) {
  const normalizedEmail = String(email).trim().toLowerCase();
  return normalizedEmail.includes('@') && normalizedEmail.endsWith('@uwm.edu');
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function isValidUsername(value) {
  return /^[A-Za-z0-9]{2,30}$/.test(value);
}

function normalizeListingStatus(value) {
  const key = String(value || "").trim().toLowerCase();
  const map = {
    pending: "Pending",
    active: "Active",
    sold: "Sold",
    removed: "Removed",
    "under review": "Under Review",
  };
  return map[key] || null;
}

function getModerationState(currentStatus, requestedStatus, isAdmin) {
  const normalizedCurrent = normalizeListingStatus(currentStatus) || "Active";
  const normalizedRequested = normalizeListingStatus(requestedStatus) || normalizedCurrent;

  if (isAdmin) {
    return {
      status: normalizedRequested,
      requiresAdminReview: normalizedRequested !== "Active",
    };
  }

  if (normalizedCurrent === "Active" && normalizedRequested === "Sold") {
    return {
      status: "Sold",
      requiresAdminReview: true,
    };
  }

  if (normalizedCurrent === "Sold" && normalizedRequested === "Active") {
    return {
      status: "Pending",
      requiresAdminReview: true,
    };
  }

  if (normalizedCurrent === "Sold" && normalizedRequested === "Sold") {
    return {
      status: "Sold",
      requiresAdminReview: true,
    };
  }

  if (normalizedCurrent === "Pending" && normalizedRequested === "Pending") {
    return {
      status: "Pending",
      requiresAdminReview: true,
    };
  }

  throw new Error("You can only mark an active listing as sold or relist a sold listing for review.");
}

async function ensureSchema() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS Users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      profile_image_url VARCHAR(255),
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      verification_code_hash VARCHAR(255),
      verification_expires_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS Notes (
      note_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      course_code VARCHAR(100),
      description TEXT,
      file_url VARCHAR(500) NOT NULL,
      file_type VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS UserBlocks (
      block_id INT AUTO_INCREMENT PRIMARY KEY,
      blocker_id INT NOT NULL,
      blocked_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      UNIQUE KEY uq_user_blocks_pair (blocker_id, blocked_id),

      FOREIGN KEY (blocker_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS Notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      message VARCHAR(500) NOT NULL,
      listing_id INT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS ListingFeedback (
      feedback_id INT AUTO_INCREMENT PRIMARY KEY,
      listing_id INT NOT NULL,
      seller_id INT NOT NULL,
      rater_id INT NOT NULL,
      vote ENUM('up', 'down') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_listing_feedback_vote (listing_id, rater_id),
      INDEX idx_listing_feedback_seller (seller_id),
      FOREIGN KEY (listing_id) REFERENCES BookListings(listing_id) ON DELETE CASCADE,
      FOREIGN KEY (seller_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (rater_id) REFERENCES Users(user_id) ON DELETE CASCADE
    )
  `);

  const addColumnStatements = [
    'ALTER TABLE Users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE Users ADD COLUMN verification_code_hash VARCHAR(255)',
    'ALTER TABLE Users ADD COLUMN verification_expires_at DATETIME',
    'ALTER TABLE Users ADD COLUMN role ENUM(\'student\', \'admin\') NOT NULL DEFAULT \'student\'',
    'ALTER TABLE Users ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE Users ADD COLUMN suspended_at TIMESTAMP NULL DEFAULT NULL',
    'ALTER TABLE Users ADD COLUMN suspended_reason VARCHAR(500) NULL DEFAULT NULL',
    'ALTER TABLE BookListings ADD COLUMN requires_admin_review BOOLEAN NOT NULL DEFAULT FALSE',
  ];

  for (const statement of addColumnStatements) {
    try {
      await runQuery(statement);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }

  try {
    await runQuery('ALTER TABLE Notes ADD COLUMN file_type VARCHAR(100)');
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  }

  await runQuery(`
    CREATE TABLE IF NOT EXISTS ModerationLog (
      log_id         INT AUTO_INCREMENT PRIMARY KEY,
      admin_id       INT NOT NULL,
      action_type    VARCHAR(80) NOT NULL,
      target_type    ENUM('listing','user','note') NOT NULL,
      target_id      INT NOT NULL,
      notes          TEXT,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES Users(user_id) ON DELETE CASCADE,
      INDEX idx_mod_admin   (admin_id),
      INDEX idx_mod_created (created_at)
    )
  `);
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 6,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP, and GIF images are allowed."));
    }
    cb(null, true);
  },
});

function getImageExtension(mimetype) {
  switch (mimetype) {
    case "image/jpeg": return ".jpg";
    case "image/png":  return ".png";
    case "image/webp": return ".webp";
    case "image/gif":  return ".gif";
    default:           return "";
  }
}

function buildPostImageKey(listingId, orderNumber, mimetype) {
  return `Post_Pic/${listingId}/${orderNumber}${getImageExtension(mimetype)}`;
}

function buildPublicImageUrl(objectKey) {
  const base = String(process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  return `${base}/${objectKey}`;
}

async function areUsersBlockedEitherWay(userA, userB) {
  if (!userA || !userB) return false;

  const rows = await runQuery(
    `SELECT block_id
     FROM UserBlocks
     WHERE (blocker_id = ? AND blocked_id = ?)
        OR (blocker_id = ? AND blocked_id = ?)
     LIMIT 1`,
    [userA, userB, userB, userA]
  );

  return rows.length > 0;
}

async function getBlockStatusBetweenUsers(currentUserId, otherUserId) {
  const rows = await runQuery(
    `SELECT blocker_id, blocked_id
     FROM UserBlocks
     WHERE (blocker_id = ? AND blocked_id = ?)
        OR (blocker_id = ? AND blocked_id = ?)`,
    [currentUserId, otherUserId, otherUserId, currentUserId]
  );

  const blockedByYou = rows.some(
    (row) => Number(row.blocker_id) === Number(currentUserId)
  );

  return {
    blockedByYou,
    blockedEitherWay: rows.length > 0,
  };
}

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://peer-to-peer-book-exchange2.vercel.app",
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

app.set('db', pool);

const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "API running" });
});

app.get("/db-test", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /BookListings
app.get("/BookListings", async (req, res, next) => {
  try {
    const viewerId = Number(req.query.viewerId || 0);
    let viewerIsAdmin = false;

    if (viewerId > 0) {
      const [viewerRows] = await pool.query(
        "SELECT role FROM Users WHERE user_id = ? LIMIT 1",
        [viewerId]
      );
      viewerIsAdmin = viewerRows[0]?.role === "admin";
    }

    const conditions = [];
    const params = [];

    if (viewerId > 0) {
      conditions.push(`
        NOT EXISTS (
          SELECT 1
          FROM UserBlocks ub
          WHERE (ub.blocker_id = ? AND ub.blocked_id = bl.user_id)
             OR (ub.blocker_id = bl.user_id AND ub.blocked_id = ?)
        )
      `);
      params.push(viewerId, viewerId);
    }

    if (!viewerIsAdmin) {
      if (viewerId > 0) {
        conditions.push(`((LOWER(COALESCE(bl.status, '')) = 'active' AND COALESCE(bl.requires_admin_review, 0) = 0) OR bl.user_id = ?)`);
        params.push(viewerId);
      } else {
        conditions.push(`LOWER(COALESCE(bl.status, '')) = 'active' AND COALESCE(bl.requires_admin_review, 0) = 0`);
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `
      SELECT
        bl.listing_id,
        bl.user_id,
        bl.title,
        bl.author,
        bl.\`Edition\` AS edition,
        bl.isbn,
        bl.price,
        bl.course_code,
        bl.book_condition,
        bl.notes,
        bl.status,
        bl.requires_admin_review,
        bl.image_url,
        bl.created_at,
        u.full_name AS seller_name
      FROM BookListings bl
      JOIN Users u ON u.user_id = bl.user_id
      ${whereClause}
      ORDER BY bl.created_at DESC
      `,
      params
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// PUT /BookListings/:id
app.put("/BookListings/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, author, edition, isbn, course_code, book_condition, price, notes, status } = req.body;
    const currentUser = req.currentUser;

    if (!title || !author || !book_condition || price == null) {
      return res.status(400).json({ error: "title, author, price, and book_condition are required." });
    }

    const cleanedTitle      = String(title).trim();
    const cleanedAuthor     = String(author).trim();
    const cleanedEdition    = edition      ? String(edition).trim()      : null;
    const cleanedIsbn       = isbn         ? String(isbn).trim()         : null;
    const cleanedCourseCode = course_code  ? String(course_code).trim()  : null;
    const cleanedCondition  = String(book_condition).trim();
    const cleanedNotes      = notes        ? String(notes).trim()        : null;
    const numericPrice      = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: "Price must be a valid non-negative number." });
    }

    const [existingListing] = await runQuery(
      'SELECT listing_id, user_id, status FROM BookListings WHERE listing_id = ? LIMIT 1',
      [id]
    );
    if (!existingListing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    const isAdmin = currentUser.role === "admin";
    const isOwner = existingListing.user_id === currentUser.user_id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "You can only edit your own listings." });
    }

    const currentStatus = normalizeListingStatus(existingListing.status) || "Active";
    let moderationState = {
      status: normalizeListingStatus(status) || currentStatus,
      requiresAdminReview: currentStatus !== "Active",
    };

    if (!isAdmin) {
      try {
        moderationState = getModerationState(currentStatus, status, false);
      } catch (error) {
        return res.status(403).json({ error: error.message });
      }
    } else {
      moderationState = getModerationState(currentStatus, status, true);
    }

    await runQuery(
      `UPDATE BookListings
       SET title = ?, author = ?, \`Edition\` = ?, isbn = ?, course_code = ?,
           book_condition = ?, price = ?, notes = ?, status = ?, requires_admin_review = ?
       WHERE listing_id = ?`,
      [cleanedTitle, cleanedAuthor, cleanedEdition, cleanedIsbn, cleanedCourseCode,
       cleanedCondition, numericPrice, cleanedNotes, moderationState.status, moderationState.requiresAdminReview, id]
    );

    const updated = await runQuery(
      `SELECT bl.listing_id, bl.user_id, bl.title, bl.author, bl.\`Edition\` AS edition,
              bl.isbn, bl.price, bl.course_code, bl.book_condition, bl.notes, bl.status, bl.requires_admin_review,
              bl.image_url, bl.created_at, u.full_name AS seller_name
       FROM BookListings bl
       JOIN Users u ON u.user_id = bl.user_id
       WHERE bl.listing_id = ? LIMIT 1`,
      [id]
    );

    res.json({
      ...updated[0],
      message: !isAdmin && currentStatus === "Sold" && moderationState.status === "Pending"
        ? "Relisted listings return to pending review before becoming active again."
        : undefined,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /BookListings/:id
app.delete("/BookListings/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await runQuery("SELECT listing_id FROM BookListings WHERE listing_id = ? LIMIT 1", [id]);
    if (existing.length === 0) return res.status(404).json({ error: "Listing not found." });
    await runQuery("DELETE FROM BookListings WHERE listing_id = ?", [id]);
    res.json({ success: true, message: "Listing deleted successfully." });
  } catch (err) {
    next(err);
  }
});

// POST /BookListings
app.post("/BookListings", async (req, res, next) => {
  try {
    const { user_id, title, author, edition, isbn, price, course_code, book_condition, notes, image_url } = req.body;

    if (!user_id || !title || !author || !book_condition || price == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const cleanedTitle      = String(title).trim();
    const cleanedAuthor     = String(author).trim();
    const cleanedEdition    = edition     ? String(edition).trim()     : null;
    const cleanedIsbn       = isbn        ? String(isbn).trim()        : null;
    const cleanedCourseCode = course_code ? String(course_code).trim() : null;
    const cleanedCondition  = String(book_condition).trim();
    const cleanedNotes      = notes       ? String(notes).trim()       : null;
    const numericPrice      = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: "Price must be a valid non-negative number." });
    }

    const [result] = await pool.execute(
      `INSERT INTO BookListings
       (user_id, title, author, \`Edition\`, isbn, price, course_code, book_condition, notes, status, requires_admin_review, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', TRUE, ?)`,
      [user_id, cleanedTitle, cleanedAuthor, cleanedEdition, cleanedIsbn,
       numericPrice, cleanedCourseCode, cleanedCondition, cleanedNotes, image_url || null]
    );

    res.status(201).json({ message: "Book successfully added!", listing_id: result.insertId });
  } catch (err) {
    next(err);
  }
});

// GET /Notes
app.get("/Notes", async (req, res, next) => {
  try {
    const ownerUserId = Number(req.query.userId || 0);
    const viewerId = Number(req.query.viewerId || 0);

    let sql = `
      SELECT n.*, u.full_name AS seller_name
      FROM Notes n
      JOIN Users u ON u.user_id = n.user_id
    `;

    const clauses = [];
    const params = [];

    if (ownerUserId > 0) {
      clauses.push("n.user_id = ?");
      params.push(ownerUserId);
    }

    if (viewerId > 0) {
      clauses.push(`
        NOT EXISTS (
          SELECT 1
          FROM UserBlocks ub
          WHERE (ub.blocker_id = ? AND ub.blocked_id = n.user_id)
             OR (ub.blocker_id = n.user_id AND ub.blocked_id = ?)
        )
      `);
      params.push(viewerId, viewerId);
    }

    if (clauses.length > 0) {
      sql += ` WHERE ${clauses.join(" AND ")}`;
    }

    sql += " ORDER BY n.created_at DESC";

    const rows = await runQuery(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /Notes
app.post("/Notes", async (req, res, next) => {
  try {
    const { user_id, title, course_code, description, file_url, file_type } = req.body;
    if (!user_id || !title || !file_url) {
      return res.status(400).json({ error: "user_id, title, and file_url are required." });
    }
    const result = await runQuery(
      `INSERT INTO Notes (user_id, title, course_code, description, file_url, file_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, title.trim(), course_code || null, description || null, file_url, file_type || null]
    );
    res.status(201).json({ message: "Notes posted successfully.", note_id: result.insertId });
  } catch (err) {
    next(err);
  }
});

// DELETE /Notes/:id
app.delete("/Notes/:id", async (req, res, next) => {
  try {
    await runQuery("DELETE FROM Notes WHERE note_id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Auth & utility ────────────────────────────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  try {
    await runQuery('SELECT 1 AS ok');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, database: 'disconnected', error: error.message });
  }
});

app.get('/api/debug-env', (_req, res) => {
  res.json({
    hasSmtpHost: Boolean(process.env.SMTP_HOST),
    hasSmtpUser: Boolean(process.env.SMTP_USER),
    hasSmtpPass: Boolean(process.env.SMTP_PASS),
    smtpPort: process.env.SMTP_PORT || '2525',
    smtpFrom: process.env.SMTP_FROM || 'Peer-To-Peer Book Exchange <no-reply@p2pbookexchange.com>',
    smtpToOverride: process.env.SMTP_TO_OVERRIDE || null,
    boot: BOOT_MARKER,
  });
});

app.post('/api/register', async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'fullName, email, and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!isValidUwmEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Email must be a valid UWM email address.' });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const existing = await runQuery(
      'SELECT user_id, is_verified FROM Users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    const verificationCode      = generateVerificationCode();
    const verificationHash      = hashVerificationCode(verificationCode);
    const verificationExpiresAt = getVerificationExpiryDate();

    if (existing.length > 0) {
      const currentUser = existing[0];
      if (currentUser.is_verified) {
        return res.status(409).json({ error: 'Email is already registered.' });
      }
      await runQuery(
        `UPDATE Users SET verification_code_hash = ?, verification_expires_at = ? WHERE user_id = ?`,
        [verificationHash, verificationExpiresAt, currentUser.user_id]
      );
      await sendVerificationEmail(normalizedEmail, verificationCode);
      return res.status(200).json({ message: 'Verification code resent. Please check your email.' });
    }

    const passwordHash = hashPassword(String(password));
    const result = await runQuery(
      `INSERT INTO Users (full_name, email, password_hash, is_verified, verification_code_hash, verification_expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [String(fullName).trim(), normalizedEmail, passwordHash, false, verificationHash, verificationExpiresAt]
    );

    await sendVerificationEmail(normalizedEmail, verificationCode);
    return res.status(201).json({
      message: 'Account created. Check your email for the verification code.',
      userId: result.insertId,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: error.message || 'Unable to register user right now.' });
  }
});

app.post('/api/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'email and code are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedCode  = String(code).trim();

  if (!isValidUwmEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Email must be a valid UWM email address.' });
  }

  if (!/^\d{6}$/.test(normalizedCode)) {
    return res.status(400).json({ error: 'Verification code must be a 6-digit number.' });
  }

  try {
    const users = await runQuery(
      `SELECT user_id, verification_code_hash, verification_expires_at, is_verified FROM Users WHERE email = ? LIMIT 1`,
      [normalizedEmail]
    );

    if (users.length === 0) return res.status(404).json({ error: 'Account not found.' });

    const user = users[0];

    if (user.is_verified) return res.status(200).json({ message: 'Email is already verified.' });

    if (!user.verification_code_hash || !user.verification_expires_at) {
      return res.status(400).json({ error: 'No active verification code. Register again to request a new code.' });
    }

    const expiresAt = new Date(user.verification_expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code expired. Register again to request a new code.' });
    }

    const incomingHash = hashVerificationCode(normalizedCode);
    if (incomingHash !== user.verification_code_hash) {
      return res.status(401).json({ error: 'Invalid verification code.' });
    }

    await runQuery(
      `UPDATE Users SET is_verified = TRUE, verification_code_hash = NULL, verification_expires_at = NULL WHERE user_id = ?`,
      [user.user_id]
    );

    return res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ error: error.message || 'Unable to verify email right now.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!isValidUwmEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Email must be a valid UWM email address.' });
  }

  try {
    const users = await runQuery(
      'SELECT user_id, full_name, email, password_hash, is_verified, profile_image_url, role FROM Users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (users.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });

    const user = users[0];

    if (!user.is_verified) {
      const verificationCode      = generateVerificationCode();
      const verificationHash      = hashVerificationCode(verificationCode);
      const verificationExpiresAt = getVerificationExpiryDate();

      await runQuery(
        `UPDATE Users SET verification_code_hash = ?, verification_expires_at = ? WHERE user_id = ?`,
        [verificationHash, verificationExpiresAt, user.user_id]
      );

      await sendVerificationEmail(normalizedEmail, verificationCode);

      return res.status(403).json({
        error: 'Email not verified. A new verification code was sent to your UWM inbox.',
        requiresVerification: true,
      });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const passwordIsValid = verifyPassword(String(password), user.password_hash);
    if (!passwordIsValid) return res.status(401).json({ error: 'Invalid email or password.' });

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.user_id,
        fullName: user.full_name,
        email: user.email,
        profile_image_url: user.profile_image_url,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ error: error.message || 'Unable to log in right now.' });
  }
});

app.post('/api/logout', async (_req, res) => {
  return res.status(200).json({ message: 'Logout successful.' });
});

// ── Profile routes ────────────────────────────────────────────────────────────

app.get('/api/users/:id', async (req, res, next) => {
  try {
    const users = await runQuery(
      'SELECT user_id, full_name, email, profile_image_url, role, created_at FROM Users WHERE user_id = ? LIMIT 1',
      [req.params.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(users[0]);
  } catch (err) {
    next(err);
  }
});

app.put('/api/users/:id/username', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = Number(req.params.id);
    const currentUserId = Number(req.currentUser?.user_id);
    const username = normalizeUsername(req.body?.username);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (targetUserId !== currentUserId) {
      return res.status(403).json({ error: 'You can only update your own account.' });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        error: 'Username must be 2-30 letters or numbers only.',
      });
    }

    await runQuery('UPDATE Users SET full_name = ? WHERE user_id = ?', [username, targetUserId]);

    const [updatedUser] = await runQuery(
      'SELECT user_id, full_name, email, profile_image_url, role, created_at FROM Users WHERE user_id = ? LIMIT 1',
      [targetUserId]
    );

    res.json({
      message: 'Username updated successfully.',
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
});

app.put('/api/users/:id/password', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = Number(req.params.id);
    const currentUserId = Number(req.currentUser?.user_id);
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (targetUserId !== currentUserId) {
      return res.status(403).json({ error: 'You can only update your own account.' });
    }

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const [existingUser] = await runQuery(
      'SELECT user_id, password_hash FROM Users WHERE user_id = ? LIMIT 1',
      [targetUserId]
    );

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!verifyPassword(currentPassword, existingUser.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const nextPasswordHash = hashPassword(newPassword);
    await runQuery('UPDATE Users SET password_hash = ? WHERE user_id = ?', [nextPasswordHash, targetUserId]);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/users/:id', requireAuth, async (req, res, next) => {
  try {
    const targetUserId = Number(req.params.id);
    const currentUserId = Number(req.currentUser?.user_id);
    const confirmation = String(req.body?.confirmation || '').trim();

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (targetUserId !== currentUserId) {
      return res.status(403).json({ error: 'You can only delete your own account.' });
    }

    if (confirmation !== 'DELETE') {
      return res.status(400).json({ error: 'Please type DELETE to confirm account removal.' });
    }

    const result = await runQuery('DELETE FROM Users WHERE user_id = ?', [targetUserId]);
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

app.get('/api/listings', async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId query param is required.' });
    const rows = await runQuery(
      `SELECT listing_id, user_id, title, author, \`Edition\` AS edition, isbn,
              course_code, book_condition, price, notes, status, requires_admin_review, image_url, created_at
       FROM BookListings WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get('/api/listings/:id/feedback', async (req, res, next) => {
  try {
    const listingId = Number(req.params.id);
    const viewerId = Number(req.query.viewerId);

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ error: 'Invalid listing id.' });
    }

    const [listing] = await runQuery(
      'SELECT listing_id, user_id FROM BookListings WHERE listing_id = ? LIMIT 1',
      [listingId]
    );
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });

    const [summary] = await runQuery(
      `SELECT
         COALESCE(SUM(vote = 'up'), 0) AS thumbs_up,
         COALESCE(SUM(vote = 'down'), 0) AS thumbs_down
       FROM ListingFeedback
       WHERE listing_id = ?`,
      [listingId]
    );

    let currentVote = null;
    if (Number.isInteger(viewerId) && viewerId > 0) {
      const [existingVote] = await runQuery(
        'SELECT vote FROM ListingFeedback WHERE listing_id = ? AND rater_id = ? LIMIT 1',
        [listingId, viewerId]
      );
      currentVote = existingVote?.vote || null;
    }

    res.json({
      listing_id: listingId,
      seller_id: listing.user_id,
      thumbs_up: Number(summary?.thumbs_up || 0),
      thumbs_down: Number(summary?.thumbs_down || 0),
      currentVote,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/listings/:id/feedback', requireAuth, async (req, res, next) => {
  try {
    const listingId = Number(req.params.id);
    const raterId = Number(req.currentUser?.user_id);
    const vote = String(req.body?.vote || '').trim().toLowerCase();

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return res.status(400).json({ error: 'Invalid listing id.' });
    }

    if (!['up', 'down'].includes(vote)) {
      return res.status(400).json({ error: 'Vote must be either up or down.' });
    }

    const [listing] = await runQuery(
      'SELECT listing_id, user_id FROM BookListings WHERE listing_id = ? LIMIT 1',
      [listingId]
    );
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    if (listing.user_id === raterId) {
      return res.status(400).json({ error: 'You cannot react to your own listing.' });
    }

    await runQuery(
      `INSERT INTO ListingFeedback (listing_id, seller_id, rater_id, vote)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE vote = VALUES(vote), seller_id = VALUES(seller_id)`,
      [listingId, listing.user_id, raterId, vote]
    );

    const [summary] = await runQuery(
      `SELECT
         COALESCE(SUM(vote = 'up'), 0) AS thumbs_up,
         COALESCE(SUM(vote = 'down'), 0) AS thumbs_down
       FROM ListingFeedback
       WHERE listing_id = ?`,
      [listingId]
    );

    res.json({
      listing_id: listingId,
      seller_id: listing.user_id,
      thumbs_up: Number(summary?.thumbs_up || 0),
      thumbs_down: Number(summary?.thumbs_down || 0),
      currentVote: vote,
    });
  } catch (err) {
    next(err);
  }
});

app.put('/api/listings/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, author, edition, isbn, course_code, book_condition, price, notes, status } = req.body;
    const currentUser = req.currentUser;

    if (!title || !author || !book_condition || price == null) {
      return res.status(400).json({ error: 'title, author, price, and book_condition are required.' });
    }

    const cleanedTitle      = String(title).trim();
    const cleanedAuthor     = String(author).trim();
    const cleanedEdition    = edition     ? String(edition).trim()     : null;
    const cleanedIsbn       = isbn        ? String(isbn).trim()        : null;
    const cleanedCourseCode = course_code ? String(course_code).trim() : null;
    const cleanedCondition  = String(book_condition).trim();
    const cleanedNotes      = notes       ? String(notes).trim()       : null;
    const numericPrice      = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: 'Price must be a valid non-negative number.' });
    }

    const existing = await runQuery('SELECT listing_id, user_id, status FROM BookListings WHERE listing_id = ? LIMIT 1', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Listing not found.' });

    const listing = existing[0];
    const isAdmin = currentUser.role === 'admin';
    const isOwner = listing.user_id === currentUser.user_id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'You can only edit your own listings.' });
    }

    const currentStatus = normalizeListingStatus(listing.status) || 'Active';
    let moderationState = {
      status: normalizeListingStatus(status) || currentStatus,
      requiresAdminReview: currentStatus !== 'Active',
    };

    if (!isAdmin) {
      try {
        moderationState = getModerationState(currentStatus, status, false);
      } catch (error) {
        return res.status(403).json({ error: error.message });
      }
    } else {
      moderationState = getModerationState(currentStatus, status, true);
    }

    await runQuery(
      `UPDATE BookListings SET title = ?, author = ?, \`Edition\` = ?, isbn = ?, course_code = ?,
              book_condition = ?, price = ?, notes = ?, status = ?, requires_admin_review = ? WHERE listing_id = ?`,
      [cleanedTitle, cleanedAuthor, cleanedEdition, cleanedIsbn, cleanedCourseCode,
       cleanedCondition, numericPrice, cleanedNotes, moderationState.status, moderationState.requiresAdminReview, id]
    );

    const updated = await runQuery(
      `SELECT listing_id, user_id, title, author, \`Edition\` AS edition, isbn,
              course_code, book_condition, price, notes, status, requires_admin_review, image_url, created_at
       FROM BookListings WHERE listing_id = ? LIMIT 1`,
      [id]
    );

    res.json({
      ...updated[0],
      message: !isAdmin && currentStatus === 'Sold' && moderationState.status === 'Pending'
        ? 'Relisted listings return to pending review before becoming active again.'
        : undefined,
    });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/listings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await runQuery('DELETE FROM BookListings WHERE listing_id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/images", upload.array("images", 6), async (req, res, next) => {
  try {
    const { prefix, listingId } = req.body;

    if (prefix !== "Post_Pic") {
      return res.status(400).json({ error: "Only Post_Pic uploads are supported here." });
    }

    const numericListingId = Number(listingId);
    if (!Number.isInteger(numericListingId) || numericListingId <= 0) {
      return res.status(400).json({ error: "A valid listingId is required." });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images were uploaded." });
    }

    const existingListing = await runQuery("SELECT listing_id FROM BookListings WHERE listing_id = ? LIMIT 1", [numericListingId]);
    if (existingListing.length === 0) return res.status(404).json({ error: "Listing not found." });

    const countRows = await runQuery("SELECT COUNT(*) AS count FROM listing_images WHERE listing_id = ?", [numericListingId]);
    const existingCount = Number(countRows[0]?.count || 0);

    if (existingCount + req.files.length > 6) {
      return res.status(400).json({ error: "A listing can have at most 6 images." });
    }

    const uploadedImages = [];

    for (let i = 0; i < req.files.length; i++) {
      const file        = req.files[i];
      const orderNumber = existingCount + i + 1;
      const objectKey   = buildPostImageKey(numericListingId, orderNumber, file.mimetype);
      const bucketName  = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET;

      if (!bucketName) return res.status(500).json({ error: "Missing R2 bucket environment variable." });

      await r2Client.send(new PutObjectCommand({ Bucket: bucketName, Key: objectKey, Body: file.buffer, ContentType: file.mimetype }));

      const insertResult = await runQuery(
        `INSERT INTO listing_images (listing_id, order_number, object_key, file_type, uploaded_at) VALUES (?, ?, ?, ?, NOW())`,
        [numericListingId, orderNumber, objectKey, file.mimetype]
      );

      const publicUrl = buildPublicImageUrl(objectKey);

      if (orderNumber === 1) {
        await runQuery("UPDATE BookListings SET image_url = ? WHERE listing_id = ?", [publicUrl, numericListingId]);
      }

      uploadedImages.push({
        id: insertResult.insertId, listing_id: numericListingId, order_number: orderNumber,
        object_key: objectKey, file_type: file.mimetype, image_url: publicUrl,
      });
    }

    res.status(201).json({ message: "Images uploaded successfully.", images: uploadedImages });
  } catch (err) {
    next(err);
  }
});

app.get("/api/upload-url", async (req, res, next) => {
  try {
    const { filename, contentType, folder } = req.query;
    if (!filename || !contentType) {
      return res.status(400).json({ error: "filename and contentType are required." });
    }

    const allowedFolders = ["Profile_Pic", "Post_Pic", "Notes"];
    const targetFolder   = allowedFolders.includes(folder) ? folder : "Profile_Pic";
    const key            = `${targetFolder}/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ChecksumAlgorithm: undefined,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 900,
      unhoistableHeaders: new Set(["x-amz-checksum-crc32"]),
    });

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    res.json({ uploadUrl, publicUrl });
  } catch (err) {
    next(err);
  }
});

app.put("/api/users/:id/avatar", requireAuth, async (req, res, next) => {
  try {
    const targetUserId = Number(req.params.id);
    const currentUserId = Number(req.currentUser?.user_id);
    const { avatarUrl } = req.body;

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ error: "Invalid user id." });
    }

    if (targetUserId !== currentUserId) {
      return res.status(403).json({ error: "You can only update your own avatar." });
    }

    if (!avatarUrl) return res.status(400).json({ error: "avatarUrl is required." });
    await runQuery("UPDATE Users SET profile_image_url = ? WHERE user_id = ?", [avatarUrl, targetUserId]);
    res.json({ success: true, profile_image_url: avatarUrl });
  } catch (err) {
    next(err);
  }
});

// ── Notification routes ───────────────────────────────────────────────────────

app.get("/api/notifications", async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required." });
    const rows = await runQuery(
      `SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

app.get("/api/notifications/unread-count", async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required." });
    const rows = await runQuery(
      `SELECT COUNT(*) AS count FROM Notifications WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );
    res.json({ count: rows[0]?.count || 0 });
  } catch (err) { next(err); }
});

app.put("/api/notifications/:id/read", async (req, res, next) => {
  try {
    await runQuery(
      `UPDATE Notifications SET is_read = TRUE WHERE notification_id = ?`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.put("/api/notifications/read-all", async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required." });
    await runQuery(
      `UPDATE Notifications SET is_read = TRUE WHERE user_id = ?`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

app.delete("/api/notifications/clear", async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required." });
    await runQuery(`DELETE FROM Notifications WHERE user_id = ?`, [userId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Messaging routes ──────────────────────────────────────────────────────────

app.get("/api/messages/conversations", async (req, res, next) => {
  try {
    const userId = parseInt(req.query.userId, 10);
    if (!userId) return res.status(400).json({ error: "userId is required." });

    const pairs = await runQuery(
      `SELECT DISTINCT IF(sender_id = ?, receiver_id, sender_id) AS other_user_id, listing_id
       FROM Messages WHERE sender_id = ? OR receiver_id = ?`,
      [userId, userId, userId]
    );

    if (pairs.length === 0) return res.json([]);

    const conversations = await Promise.all(
      pairs.map(async ({ other_user_id, listing_id }) => {
        const [lastMsg]   = await runQuery(
          `SELECT content, sent_at FROM Messages WHERE listing_id = ?
           AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
           ORDER BY sent_at DESC LIMIT 1`,
          [listing_id, userId, other_user_id, other_user_id, userId]
        );
        const [otherUser] = await runQuery(`SELECT full_name FROM Users WHERE user_id = ?`, [other_user_id]);
        const [book]      = await runQuery(`SELECT title FROM BookListings WHERE listing_id = ?`, [listing_id]);
        const [unreadRow] = await runQuery(
          `SELECT COUNT(*) AS unread_count FROM Messages WHERE listing_id = ? AND sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
          [listing_id, other_user_id, userId]
        );

        return {
          other_user_id,
          other_user_name: otherUser?.full_name  || "Unknown",
          listing_id,
          book_title:      book?.title           || "Unknown Book",
          last_message:    lastMsg?.content      || "",
          last_sent_at:    lastMsg?.sent_at      || null,
          unread_count:    unreadRow?.unread_count || 0,
        };
      })
    );

    const filteredConversations = [];

    for (const conv of conversations) {
      const blocked = await areUsersBlockedEitherWay(userId, conv.other_user_id);
      if (!blocked) {
        filteredConversations.push(conv);
      }
    }

    filteredConversations.sort((a, b) => new Date(b.last_sent_at) - new Date(a.last_sent_at));
    res.json(filteredConversations);
  } catch (err) {
    next(err);
  }
});

app.get("/api/messages", async (req, res, next) => {
  try {
    const { userId, otherUserId, listingId } = req.query;
    if (await areUsersBlockedEitherWay(userId, otherUserId)) {
      return res.status(403).json({ error: "You cannot view this conversation." });
    }

    const rows = await runQuery(
      `SELECT message_id, sender_id, receiver_id, listing_id, content, is_read, sent_at
       FROM Messages WHERE listing_id = ?
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       ORDER BY sent_at ASC`,
      [listingId, userId, otherUserId, otherUserId, userId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/messages", async (req, res, next) => {
  try {
    const { senderId, receiverId, listingId, content } = req.body;
    const trimmedContent = String(content || "").trim();
    const MAX_MESSAGE_LENGTH = 500;
    const RATE_LIMIT_COUNT = 3;
    const RATE_LIMIT_SECONDS = 10;
    const DUPLICATE_BLOCK_SECONDS = 30;

    if (!senderId || !receiverId || !listingId || !content?.trim()) {
      return res.status(400).json({ error: "senderId, receiverId, listingId, and content are required." });
    }

    if (await areUsersBlockedEitherWay(senderId, receiverId)) {
      return res.status(403).json({ error: "You cannot message this user." });
    }
    
    if (trimmedContent.length > MAX_MESSAGE_LENGTH) { 
      return res.status(400).json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less.`});
    }

    // Rate limit: max 3 messages in 10 seconds from this sender
    const [rateLimitRow] = await runQuery(
      `
      SELECT COUNT(*) AS message_count
      FROM Messages
      WHERE sender_id = ?
        AND receiver_id = ?
        AND listing_id = ?
        AND sent_at >= (NOW() - INTERVAL ? SECOND)
      `,
      [senderId, receiverId, listingId, RATE_LIMIT_SECONDS]
    );

    if ((rateLimitRow?.message_count || 0) >= RATE_LIMIT_COUNT) {
      return res.status(429).json({ error: "You are sending messages too quickly. Please wait a moment."});
    }
    
    // Duplicate check: block exact same message within last 30 seconds
    const [duplicateRow] = await runQuery(
      `
      SELECT message_id
      FROM Messages
      WHERE sender_id = ?
        AND receiver_id = ?
        AND listing_id = ?
        AND LOWER(TRIM(content)) = LOWER(?)
        AND sent_at >= (NOW() - INTERVAL ? SECOND)
      LIMIT 1
      `,
      [senderId, receiverId, listingId, trimmedContent, DUPLICATE_BLOCK_SECONDS]
    );

    if (duplicateRow) {
      return res.status(400).json({ error: "Duplicate message detected. Please do not send the same message again right away."
      });
    }

    const result = await runQuery(
      `INSERT INTO Messages (sender_id, receiver_id, listing_id, content, is_read) VALUES (?, ?, ?, ?, FALSE)`,
      [senderId, receiverId, listingId, content.trim()]
    );

    const [newMessage] = await runQuery("SELECT * FROM Messages WHERE message_id = ?", [result.insertId]);

    // Notify the receiver
    try {
      const [senderUser] = await runQuery(`SELECT full_name FROM Users WHERE user_id = ?`, [senderId]);
      const [listing]    = await runQuery(`SELECT title FROM BookListings WHERE listing_id = ?`, [listingId]);
      const senderName   = senderUser?.full_name || "Someone";
      const bookTitle    = listing?.title        || "a listing";
      await runQuery(
        `INSERT INTO Notifications (user_id, type, message, listing_id) VALUES (?, 'message', ?, ?)`,
        [receiverId, `${senderName} sent you a message about "${bookTitle}"`, listingId]
      );
    } catch {}

    res.status(201).json(newMessage);
  } catch (err) {
    next(err);
  }
});

app.put("/api/messages/read", async (req, res, next) => {
  try {
    const { userId, otherUserId, listingId } = req.body;

    if (!userId || !otherUserId || !listingId) {
      return res.status(400).json({ error: "userId, otherUserId, and listingId are required." });
    }

    if (await areUsersBlockedEitherWay(userId, otherUserId)) {
      return res.status(403).json({ error: "This conversation is unavailable." });
    }

    await runQuery(
      `UPDATE Messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ? AND listing_id = ? AND is_read = FALSE`,
      [userId, otherUserId, listingId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.get("/api/blocks/status", requireAuth, async (req, res, next) => {
  try {
    const currentUserId = Number(req.currentUser.user_id);
    const otherUserId = Number(req.query.otherUserId);

    if (!otherUserId) {
      return res.status(400).json({ error: "otherUserId is required." });
    }

    const status = await getBlockStatusBetweenUsers(currentUserId, otherUserId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

app.post("/api/blocks", requireAuth, async (req, res, next) => {
  try {
    const blockerId = Number(req.currentUser.user_id);
    const blockedId = Number(req.body.blockedId);

    if (!blockedId) {
      return res.status(400).json({ error: "blockedId is required." });
    }

    if (blockerId === blockedId) {
      return res.status(400).json({ error: "You cannot block yourself." });
    }

    await runQuery(
      `INSERT INTO UserBlocks (blocker_id, blocked_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE blocker_id = blocker_id`,
      [blockerId, blockedId]
    );

    res.status(201).json({
      success: true,
      blockedByYou: true,
      blockedEitherWay: true,
      message: "User blocked successfully.",
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/reports/status", requireAuth, async (req, res, next) => {
  try {
    const reporterId = Number(req.currentUser.user_id);
    const reportedUserId = Number(req.query.reportedUserId);

    if (!reportedUserId) {
      return res.status(400).json({ error: "reportedUserId is required." });
    }

    const rows = await runQuery(
      `SELECT report_id
       FROM Reports
       WHERE reporter_id = ? AND reported_user_id = ?
       LIMIT 1`,
      [reporterId, reportedUserId]
    );

    res.json({ reported: rows.length > 0 });
  } catch (err) {
    next(err);
  }
});

app.post("/api/reports", requireAuth, async (req, res, next) => {
  try {
    const reporterId = Number(req.currentUser.user_id);
    const { reportedUserId, listingId, reasonType, reasonText } = req.body;

    const validReasonTypes = [
      "Inappropriate messages",
      "Inappropriate listings",
      "Message spam",
      "Inappropriate name",
      "Other",
    ];

    if (!reportedUserId || !reasonType || !String(reasonText || "").trim()) {
      return res.status(400).json({
        error: "reportedUserId, reasonType, and reasonText are required.",
      });
    }

    if (!validReasonTypes.includes(reasonType)) {
      return res.status(400).json({ error: "Invalid reason type." });
    }

    const existing = await runQuery(
      `SELECT report_id
       FROM Reports
       WHERE reporter_id = ? AND reported_user_id = ?
       LIMIT 1`,
      [reporterId, Number(reportedUserId)]
    );

    if (existing.length > 0) {
      return res.status(200).json({
        success: true,
        alreadyReported: true,
        message: "User has already been reported.",
      });
    }

    await runQuery(
      `INSERT INTO Reports
       (reporter_id, reported_user_id, listing_id, reason_type, reason_text, status)
       VALUES (?, ?, ?, ?, ?, 'Open')`,
      [
        reporterId,
        Number(reportedUserId),
        listingId ? Number(listingId) : null,
        reasonType,
        String(reasonText).trim(),
      ]
    );

    const [reportedUser] = await runQuery(
      `SELECT full_name
      FROM Users
      WHERE user_id = ?
      LIMIT 1`,
      [Number(reportedUserId)]
    );

    const reportedName = reportedUser?.full_name || "that user";

    await runQuery(
      `INSERT INTO Notifications (user_id, type, message, listing_id, is_read)
      VALUES (?, ?, ?, ?, FALSE)`,
      [
        reporterId,
        "report",
        `Thanks for your report on ${reportedName} - it’s been received. We’ll review it as soon as possible. Thank you for helping keep Peer Exchange safe.`,
        listingId ? Number(listingId) : null,
      ]
    );

    res.status(201).json({
      success: true,
      alreadyReported: false,
      message: "Report submitted.",
    });
  } catch (err) {
    next(err);
  }
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  if (String(err.message || "").startsWith("CORS blocked")) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: "Server error" });
});

pool.getConnection()
  .then((conn) => {
    console.log('Successfully connected to the database');
    conn.release();
    return ensureSchema();
  })
  .then(() => console.log('Database schema check complete.'))
  .catch((err) => console.error('Database initialization error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
