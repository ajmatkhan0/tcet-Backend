const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "mydb",
  password: "root",
  database: "college_db",
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
  } else {
    console.log("✅ Connected to MySQL Database!");

  

    // ✅ Create Notices Table with status (for archiving)
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


// ✅ Get all active notices (auto-archive expired)
app.get("/notices", (req, res) => {
  const now = new Date();

  // Auto-archive expired ones
  db.query("UPDATE notices SET status='archived' WHERE deadline < ? AND status='active'", [now], (err) => {
    if (err) console.error("⚠️ Error auto-archiving notices:", err);
  });

  // Fetch active
  db.query("SELECT * FROM notices WHERE status='active' ORDER BY uploadTime DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ✅ Get all archived notices
app.get("/notices/archived", (req, res) => {
  db.query("SELECT * FROM notices WHERE status='archived' ORDER BY uploadTime DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ✅ Add new notice
app.post("/notices", (req, res) => {
  const { noticeTitle, noticeDate, deadline, noticeLink } = req.body;
  if (!noticeTitle || !noticeDate || !deadline || !noticeLink)
    return res.status(400).json({ message: "All fields are required" });

  const sql = `
    INSERT INTO notices (noticeTitle, noticeDate, deadline, noticeLink)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, [noticeTitle, noticeDate, deadline, noticeLink], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, noticeTitle, noticeDate, deadline, noticeLink });
  });
});

// ✅ Update existing notice
app.put("/notices/:id", (req, res) => {
  const { id } = req.params;
  const { noticeTitle, noticeDate, deadline, noticeLink } = req.body;

  const sql = `
    UPDATE notices 
    SET noticeTitle=?, noticeDate=?, deadline=?, noticeLink=? 
    WHERE id=?
  `;
  db.query(sql, [noticeTitle, noticeDate, deadline, noticeLink, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✏️ Notice updated successfully!" });
  });
});

// ✅ Archive a notice manually
app.put("/notices/archive/:id", (req, res) => {
  const { id } = req.params;
  db.query("UPDATE notices SET status='archived' WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "🗂️ Notice archived successfully!" });
  });
});


// ♻️ Unarchive a notice manually
app.put("/notices/unarchive/:id", (req, res) => {
  const { id } = req.params;
  db.query("UPDATE notices SET status='active' WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "♻️ Notice unarchived successfully!" });
  });
});


// ✅ DeleteFromFrontend a notice
app.delete("/notices/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM notices WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "🗑️ Notice deleted successfully!" });
  });
});







// ✅ USER LOGIN API
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: "All fields are required" });

  const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.query(sql, [username, password], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length > 0) {
      res.json({ success: true, message: "Login successful!" });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });
});





// ================================================================
// 🚀 Run Server
// ================================================================
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
