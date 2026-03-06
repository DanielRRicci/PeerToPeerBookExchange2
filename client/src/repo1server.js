const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Create the connection to the database
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

// Test the connection
db.connect((err) => {
  if (err) {
    console.error('Error connecting to Railway MySQL:', err.message);
    return;
  }
  console.log('Successfully connected to the Peer-to-Peer Book Exchange database!');
});

/*PROFILE ROUTES START*/

app.get('/api/users/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM Users WHERE user_id = ?', [id], (err, results) => {
    res.json(results[0]);
  });
});

app.get('/api/listings', (req, res) => {
  const userId = req.query.userId;
  db.query('SELECT * FROM BookListings WHERE user_id = ?', [userId], (err, results) => {
    res.json(results);
  });
});

app.put('/api/listings/:id', (req, res) => {
  const id = req.params.id;
  const { price, condition } = req.body;
  console.log("Editing listing:", id, price, condition);

  db.query(
    'UPDATE BookListings SET price = ?, book_condition = ? WHERE listing_id = ?',
    [price, condition, id],
    (err) => {
      db.query('SELECT * FROM BookListings WHERE listing_id = ?', [id], (err, results) => {
        res.json(results[0]);
      });
    }
  );
});

app.delete('/api/listings/:id', (req, res) => {
  const id = req.params.id;
  console.log("Deleting listing:", id);
  db.query('DELETE FROM BookListings WHERE listing_id = ?', [id], (err) => {
    res.json({ success: true });
  });
});

/*PROFILE ROUTES END*/

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});