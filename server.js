const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------------------------
// ✅ MySQL Connection (Render + Railway Ready)
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
      require: true,
    rejectUnauthorized: false
  }
});


// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
  } else {
    console.log("✅ Connected to MySQL Database!");

    // Create "notices" table if not exists
    db.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        noticeTitle VARCHAR(255),
        noticeDate DATE,
        uploadTime DATETIME DEFAULT CURRENT_TIMESTAMP,
        deadline DATETIME,
        noticeLink VARCHAR(500),
        status ENUM('active', 'archived') DEFAULT 'active'
      )
    `);
  }
});

// ------------------------------------------------------------------
// 🔹 API ROUTES
// ------------------------------------------------------------------

// Get Active Notices (Auto-Archive Expired)
app.get("/notices", (req, res) => {
  const now = new Date();

  db.query(
    "UPDATE notices SET status='archived' WHERE deadline < ? AND status='active'",
    [now],
    (err) => {
      if (err) console.error("⚠️ Auto-archive failed:", err);
    }
  );

  db.query(
    "SELECT * FROM notices WHERE status='active' ORDER BY uploadTime DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Get Archived Notices
app.get("/notices/archived", (req, res) => {
  db.query(
    "SELECT * FROM notices WHERE status='archived' ORDER BY uploadTime DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Add New Notice
app.post("/notices", (req, res) => {
  const { noticeTitle, noticeDate, deadline, noticeLink } = req.body;

  if (!noticeTitle || !noticeDate || !deadline || !noticeLink)
    return res.status(400).json({ message: "All fields are required" });

  db.query(
    `INSERT INTO notices (noticeTitle, noticeDate, deadline, noticeLink)
     VALUES (?, ?, ?, ?)`,
    [noticeTitle, noticeDate, deadline, noticeLink],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        id: result.insertId,
        noticeTitle,
        noticeDate,
        deadline,
        noticeLink,
      });
    }
  );
});

// Update Notice
app.put("/notices/:id", (req, res) => {
  const { id } = req.params;
  const { noticeTitle, noticeDate, deadline, noticeLink } = req.body;

  db.query(
    `UPDATE notices 
     SET noticeTitle=?, noticeDate=?, deadline=?, noticeLink=? 
     WHERE id=?`,
    [noticeTitle, noticeDate, deadline, noticeLink, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✏️ Notice updated successfully!" });
    }
  );
});

// Archive Notice
app.put("/notices/archive/:id", (req, res) => {
  db.query(
    "UPDATE notices SET status='archived' WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "🗂️ Notice archived successfully!" });
    }
  );
});

// Unarchive Notice
app.put("/notices/unarchive/:id", (req, res) => {
  db.query(
    "UPDATE notices SET status='active' WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "♻️ Notice unarchived successfully!" });
    }
  );
});

// Delete Notice
app.delete("/notices/:id", (req, res) => {
  db.query("DELETE FROM notices WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "🗑️ Notice deleted successfully!" });
  });
});

// -------------------------------------------
// USER LOGIN API
// -------------------------------------------
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: "All fields are required" });

  db.query(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length > 0) {
        res.json({ success: true, message: "Login successful!" });
      } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
      }
    }
  );
});

// ------------------------------------------------------------------
// 🚀 START SERVER (Render will use PORT from ENV)
// ------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
