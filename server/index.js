// server/index.js
require("dotenv").config({ path: '../client/.env' });
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const BOOT_MARKER = new Date().toISOString();
const VERIFICATION_CODE_TTL_MINUTES = 15;

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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

  const addColumnStatements = [
    'ALTER TABLE Users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE Users ADD COLUMN verification_code_hash VARCHAR(255)',
    'ALTER TABLE Users ADD COLUMN verification_expires_at DATETIME',
  ];

  for (const statement of addColumnStatements) {
    try {
      await runQuery(statement);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

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

// GET /BookListings — includes seller_name for Contact Seller feature
app.get("/BookListings", async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT bl.*, u.full_name AS seller_name
      FROM BookListings bl
      JOIN Users u ON u.user_id = bl.user_id
      ORDER BY bl.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /BookListings
app.post("/BookListings", async (req, res, next) => {
  try {
    const {
      user_id,
      title,
      author,
      isbn,
      price,
      course_code,
      book_condition,
      image_url
    } = req.body;

    if (!user_id || !title || !author || !book_condition || price == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [result] = await pool.execute(
      `INSERT INTO BookListings 
      (user_id, title, author, isbn, price, course_code, book_condition, status, image_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'available', ?)`,
      [
        user_id,
        title,
        author,
        isbn || null,
        price,
        course_code || null,
        book_condition,
        image_url || null
      ]
    );

    res.status(201).json({
      message: "Book successfully added!",
      listing_id: result.insertId
    });
  } catch (err) {
    next(err);
  }
});

// ---- authentication + utility endpoints ----

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
    smtpFrom: process.env.SMTP_FROM ||
      'Peer-To-Peer Book Exchange <no-reply@p2pbookexchange.com>',
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

    const verificationCode = generateVerificationCode();
    const verificationHash = hashVerificationCode(verificationCode);
    const verificationExpiresAt = getVerificationExpiryDate();

    if (existing.length > 0) {
      const currentUser = existing[0];

      if (currentUser.is_verified) {
        return res.status(409).json({ error: 'Email is already registered.' });
      }

      await runQuery(
        `UPDATE Users
         SET verification_code_hash = ?, verification_expires_at = ?
         WHERE user_id = ?`,
        [verificationHash, verificationExpiresAt, currentUser.user_id]
      );

      await sendVerificationEmail(normalizedEmail, verificationCode);
      return res.status(200).json({ message: 'Verification code resent. Please check your email.' });
    }

    const passwordHash = hashPassword(String(password));

    const result = await runQuery(
      `INSERT INTO Users
       (full_name, email, password_hash, is_verified, verification_code_hash, verification_expires_at)
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
  const normalizedCode = String(code).trim();

  if (!isValidUwmEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Email must be a valid UWM email address.' });
  }

  if (!/^\d{6}$/.test(normalizedCode)) {
    return res.status(400).json({ error: 'Verification code must be a 6-digit number.' });
  }

  try {
    const users = await runQuery(
      `SELECT user_id, verification_code_hash, verification_expires_at, is_verified
       FROM Users WHERE email = ? LIMIT 1`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const user = users[0];

    if (user.is_verified) {
      return res.status(200).json({ message: 'Email is already verified.' });
    }

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
      `UPDATE Users
       SET is_verified = TRUE,
           verification_code_hash = NULL,
           verification_expires_at = NULL
       WHERE user_id = ?`,
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
      'SELECT user_id, full_name, email, password_hash, is_verified FROM Users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];

    if (!user.is_verified) {
      const verificationCode = generateVerificationCode();
      const verificationHash = hashVerificationCode(verificationCode);
      const verificationExpiresAt = getVerificationExpiryDate();

      await runQuery(
        `UPDATE Users
         SET verification_code_hash = ?, verification_expires_at = ?
         WHERE user_id = ?`,
        [verificationHash, verificationExpiresAt, user.user_id]
      );

      await sendVerificationEmail(normalizedEmail, verificationCode);

      return res.status(403).json({
        error: 'Email not verified. A new verification code was sent to your UWM inbox.',
        requiresVerification: true,
      });
    }

    const passwordIsValid = verifyPassword(String(password), user.password_hash);
    if (!passwordIsValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.status(200).json({
      message: 'Login successful.',
      user: { id: user.user_id, fullName: user.full_name, email: user.email },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ error: error.message || 'Unable to log in right now.' });
  }
});

// PROFILE ROUTES

app.get('/api/users/:id', async (req, res, next) => {
  try {
    const users = await runQuery(
      'SELECT user_id, full_name, email, profile_image_url, created_at FROM Users WHERE user_id = ? LIMIT 1',
      [req.params.id]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(users[0]);
  } catch (err) {
    next(err);
  }
});

app.get('/api/listings', async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId query param is required.' });
    const rows = await runQuery(
      'SELECT * FROM BookListings WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.put('/api/listings/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price, condition } = req.body;
    if (price == null || !condition) return res.status(400).json({ error: 'price and condition are required.' });
    await runQuery(
      'UPDATE BookListings SET price = ?, book_condition = ? WHERE listing_id = ?',
      [price, condition, id]
    );
    const updated = await runQuery('SELECT * FROM BookListings WHERE listing_id = ? LIMIT 1', [id]);
    if (updated.length === 0) return res.status(404).json({ error: 'Listing not found.' });
    res.json(updated[0]);
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

app.get("/api/upload-url", async (req, res, next) => {
  try {
    const { filename, contentType } = req.query;
    if (!filename || !contentType) {
      return res.status(400).json({ error: "filename and contentType are required." });
    }
 
    const key = `Profile_Pic/${Date.now()}-${filename}`;
 
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });
 
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
 
    res.json({ uploadUrl, publicUrl });
  } catch (err) {
    next(err);
  }
});
 
app.put("/api/users/:id/avatar", async (req, res, next) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ error: "avatarUrl is required." });
 
    await runQuery(
      "UPDATE Users SET profile_image_url = ? WHERE user_id = ?",
      [avatarUrl, req.params.id]
    );
 
    res.json({ success: true, profile_image_url: avatarUrl });
  } catch (err) {
    next(err);
  }
});

/*PROFILE ROUTES END*/

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGING ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/messages/conversations
app.get("/api/messages/conversations", async (req, res, next) => {
  try {
    const userId = parseInt(req.query.userId, 10);
    if (!userId) return res.status(400).json({ error: "userId is required." });

    // Step 1: Get all distinct (other_user, listing) pairs this user is part of
    const pairs = await runQuery(
      `SELECT DISTINCT
         IF(sender_id = ?, receiver_id, sender_id) AS other_user_id,
         listing_id
       FROM Messages
       WHERE sender_id = ? OR receiver_id = ?`,
      [userId, userId, userId]
    );

    if (pairs.length === 0) {
      return res.json([]);
    }

    // Step 2: For each pair, get the last message, user name, book title, unread count
    const conversations = await Promise.all(
      pairs.map(async ({ other_user_id, listing_id }) => {
        const [lastMsg] = await runQuery(
          `SELECT content, sent_at FROM Messages
           WHERE listing_id = ?
             AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
           ORDER BY sent_at DESC LIMIT 1`,
          [listing_id, userId, other_user_id, other_user_id, userId]
        );

        const [otherUser] = await runQuery(
          `SELECT full_name FROM Users WHERE user_id = ?`,
          [other_user_id]
        );

        const [book] = await runQuery(
          `SELECT title FROM BookListings WHERE listing_id = ?`,
          [listing_id]
        );

        const [unreadRow] = await runQuery(
          `SELECT COUNT(*) AS unread_count FROM Messages
           WHERE listing_id = ?
             AND sender_id = ?
             AND receiver_id = ?
             AND is_read = FALSE`,
          [listing_id, other_user_id, userId]
        );

        return {
          other_user_id,
          other_user_name: otherUser?.full_name || "Unknown",
          listing_id,
          book_title: book?.title || "Unknown Book",
          last_message: lastMsg?.content || "",
          last_sent_at: lastMsg?.sent_at || null,
          unread_count: unreadRow?.unread_count || 0,
        };
      })
    );

    // Sort by most recent message
    conversations.sort((a, b) => new Date(b.last_sent_at) - new Date(a.last_sent_at));

    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

// GET /api/messages
app.get("/api/messages", async (req, res, next) => {
  try {
    const { userId, otherUserId, listingId } = req.query;
    if (!userId || !otherUserId || !listingId) {
      return res.status(400).json({ error: "userId, otherUserId, and listingId are required." });
    }

    const rows = await runQuery(
      `SELECT message_id, sender_id, receiver_id, listing_id, content, is_read, sent_at
       FROM Messages
       WHERE listing_id = ?
         AND (
               (sender_id = ? AND receiver_id = ?)
            OR (sender_id = ? AND receiver_id = ?)
         )
       ORDER BY sent_at ASC`,
      [listingId, userId, otherUserId, otherUserId, userId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/messages
app.post("/api/messages", async (req, res, next) => {
  try {
    const { senderId, receiverId, listingId, content } = req.body;

    if (!senderId || !receiverId || !listingId || !content?.trim()) {
      return res.status(400).json({ error: "senderId, receiverId, listingId, and content are required." });
    }

    const result = await runQuery(
      `INSERT INTO Messages (sender_id, receiver_id, listing_id, content, is_read)
       VALUES (?, ?, ?, ?, FALSE)`,
      [senderId, receiverId, listingId, content.trim()]
    );

    const [newMessage] = await runQuery(
      "SELECT * FROM Messages WHERE message_id = ?",
      [result.insertId]
    );

    res.status(201).json(newMessage);
  } catch (err) {
    next(err);
  }
});

// PUT /api/messages/read
app.put("/api/messages/read", async (req, res, next) => {
  try {
    const { userId, otherUserId, listingId } = req.body;

    if (!userId || !otherUserId || !listingId) {
      return res.status(400).json({ error: "userId, otherUserId, and listingId are required." });
    }

    await runQuery(
      `UPDATE Messages
       SET is_read = TRUE
       WHERE receiver_id = ?
         AND sender_id   = ?
         AND listing_id  = ?
         AND is_read     = FALSE`,
      [userId, otherUserId, listingId]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// END MESSAGING ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Error handler
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