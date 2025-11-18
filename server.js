const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------------------------
// MYSQL CONNECTION (RAILWAY READY)
// -------------------------------------------
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),

  ssl: false,   // IMPORTANT for Railway FREE tier
  connectTimeout: 20000,
  acquireTimeout: 20000
});

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

// CONNECT
db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err);
    return;
  }

  console.log("✅ Connected to MySQL Database!");
  

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
});

// -------------------------------------------
// HOME ROUTE (Fixes Cannot GET /)
// -------------------------------------------
app.get("/", (req, res) => {
  res.send("TCET NoticeBoard Backend Running ✔");
});

// -------------------------------------------
//  API ROUTES
// -------------------------------------------

// Get Active Notices
app.get("/notices", (req, res) => {
  const now = new Date();

  // Auto-archive expired
  db.query(
    "UPDATE notices SET status='archived' WHERE deadline < ? AND status='active'",
    [now]
  );

  db.query(
    "SELECT * FROM notices WHERE status='active' ORDER BY uploadTime DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Archived Notices
app.get("/notices/archived", (req, res) => {
  db.query(
    "SELECT * FROM notices WHERE status='archived' ORDER BY uploadTime DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Add Notice
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
      res.json({ id: result.insertId });
    }
  );
});

// CRUD
app.put("/notices/:id", (req, res) => {
  const { id } = req.params;
  const { noticeTitle, noticeDate, deadline, noticeLink } = req.body;

  db.query(
    `UPDATE notices SET noticeTitle=?, noticeDate=?, deadline=?, noticeLink=? WHERE id=?`,
    [noticeTitle, noticeDate, deadline, noticeLink, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Updated successfully!" });
    }
  );
});

app.put("/notices/archive/:id", (req, res) => {
  db.query("UPDATE notices SET status='archived' WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Archived!" });
  });
});

app.put("/notices/unarchive/:id", (req, res) => {
  db.query("UPDATE notices SET status='active' WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Unarchived!" });
  });
});

app.delete("/notices/:id", (req, res) => {
  db.query("DELETE FROM notices WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Deleted!" });
  });
});

// -------------------------------------------
// START SERVER
// -------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
