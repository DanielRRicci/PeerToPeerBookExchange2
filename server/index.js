// server/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db"); // <-- db.js should export the MySQL pool
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const BOOT_MARKER = new Date().toISOString();
const VERIFICATION_CODE_TTL_MINUTES = 15;

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
  // create Users table if it does not exist
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

const app = express();

/**
 * CORS
 * - Local dev: http://localhost:5173 (Vite)
 * - Production: your Vercel domain
 *
 * If you want this more flexible, set CLIENT_ORIGIN in Railway.
 */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://peer-to-peer-book-exchange2.vercel.app", // your known frontend (change if needed)
  "https://peer-to-peer-book-exchange2.vercel.app/", // harmless
  process.env.CLIENT_ORIGIN, // optional (set in Railway if you want)
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (curl, server-to-server, etc.)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

/**
 * Health check (keep this for Railway / sanity)
 */
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "API running" });
});

/**
 * DB sanity check (temporary but very useful)
 * Confirms Railway -> MySQL connection works.
 */
app.get("/db-test", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json(rows[0]); // { ok: 1 }
  } catch (err) {
    next(err);
  }
});

/**
 * LISTINGS
 * Minimal schema expected:
 *
 * CREATE TABLE listings (
 *   id INT AUTO_INCREMENT PRIMARY KEY,
 *   title VARCHAR(255) NOT NULL,
 *   author VARCHAR(255) NOT NULL,
 *   isbn VARCHAR(32),
 *   `condition` VARCHAR(64) NOT NULL,
 *   price DECIMAL(10,2) NOT NULL,
 *   description TEXT,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */

// GET /listings -> all listings
app.get("/listings", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM listings ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /listings -> create listing
app.post("/listings", async (req, res, next) => {
  try {
    const { title, author, isbn, condition, price, description } = req.body;

    if (!title || !author || !condition || price == null) {
      return res.status(400).json({
        error: "Missing required fields: title, author, condition, price",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO listings (title, author, isbn, \`condition\`, price, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, author, isbn || null, condition, price, description || null]
    );

    res.status(201).json({ id: result.insertId });
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

/**
 * Basic error handler (keeps errors readable)
 */
app.use((err, req, res, next) => {
  console.error(err);

  // CORS errors show up here too
  if (String(err.message || "").startsWith("CORS blocked")) {
    return res.status(403).json({ error: err.message });
  }

  res.status(500).json({ error: "Server error" });
});

// make sure we can connect & initialize schema
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
