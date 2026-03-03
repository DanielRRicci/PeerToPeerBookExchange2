// server/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db"); // <-- db.js should export the MySQL pool

const app = express();

/**
 * CORS Configuration
 */
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

/**
 * HEALTH & DB CHECKS
 */
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

/**
 * AUTHENTICATION ROUTES
 */

// POST /api/register -> Create a new user
// POST /api/register -> Create a new user
// server/index.js

app.post("/api/register", async (req, res, next) => {
  try {
    // 1. Destructure fullName from the request body
    const { fullName, email, password } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "All fields (Name, Email, Password) are required" });
    }

    // 2. Check if user already exists
    const [existing] = await pool.execute("SELECT user_id FROM Users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // 3. Include full_name in the INSERT statement
    const [result] = await pool.execute(
      "INSERT INTO Users (email, password_hash, full_name) VALUES (?, ?, ?)",
      [email, password, fullName]
    );

    res.status(201).json({ message: "User registered successfully", id: result.insertId });
  } catch (err) {
    next(err);
  }
});

// POST /api/login -> Verify user
app.post("/api/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Match your DB: table 'Users', column 'password_hash'
    const [rows] = await pool.execute("SELECT * FROM Users WHERE email = ?", [email]);
    const user = rows[0];

    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
      message: "Login successful",
      user: { id: user.user_id, email: user.email }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * LISTINGS ROUTES
 */

// GET /listings -> all listings
app.get("/listings", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM listings ORDER BY created_at DESC");
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
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [result] = await pool.execute(
      "INSERT INTO listings (title, author, isbn, `condition`, price, description) VALUES (?, ?, ?, ?, ?, ?)",
      [title, author, isbn || null, condition, price, description || null]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
});

/**
 * ERROR HANDLER
 */
app.use((err, req, res, next) => {
  console.error(err);
  if (String(err.message || "").startsWith("CORS blocked")) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});