// server/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db"); // <-- db.js should export the MySQL pool

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
