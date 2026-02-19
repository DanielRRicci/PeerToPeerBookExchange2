const express = require("express");
const cors = require("cors");
require("dotenv").config();

const mysql = require("mysql2/promise");

const app = express();
app.use(express.json());

// CORS (Vercel frontend + local dev)
const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
  })
);

// MySQL pool (Railway variables)
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
});

// health
app.get("/health", (req, res) => {
  res.json({ ok: true, message: "API running" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("API listening on", PORT));
