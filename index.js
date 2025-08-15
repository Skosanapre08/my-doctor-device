const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_FILE = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_FILE);

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, dob TEXT, created_at TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS vitals (
    id TEXT PRIMARY KEY, patient_id TEXT, type TEXT, value TEXT, unit TEXT, recorded_at TEXT
  )`);
  // seed demo patient
  db.get("SELECT COUNT(*) as c FROM patients", (err, row) => {
    if (!err && row.c === 0) {
      const id = 'pat-001';
      db.run("INSERT INTO patients (id,name,email,phone,dob,created_at) VALUES (?,?,?,?,?,datetime('now'))",
             [id, 'Demo Patient', 'demo@patient.local', '+27123456789', '1990-01-01']);
    }
  });
});

// Simple auth stub: login with any email returns a fake token and user id
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  // For demo, return the demo patient id if email matches, otherwise create
  db.get("SELECT id FROM patients WHERE email = ?", [email], (err, row) => {
    if (row) {
      return res.json({ token: 'demo-token', userId: row.id });
    } else {
      const id = 'pat-' + uuidv4();
      db.run("INSERT INTO patients (id,name,email,phone,dob,created_at) VALUES (?,?,?,?,?,datetime('now'))",
             [id, email.split('@')[0], email, '', '2000-01-01']);
      return res.json({ token: 'demo-token', userId: id });
    }
  });
});

// Get patient
app.get('/api/patients/:id', (req, res) => {
  db.get("SELECT * FROM patients WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  });
});

// Post vitals (from device or simulator)
app.post('/api/vitals', (req, res) => {
  const { device_id, patient_id, vitals, recorded_at } = req.body;
  if (!patient_id || !vitals) return res.status(400).json({ error: 'patient_id and vitals required' });
  const stmt = db.prepare("INSERT INTO vitals (id,patient_id,type,value,unit,recorded_at) VALUES (?,?,?,?,?,?)");
  const inserted = [];
  vitals.forEach(v => {
    const id = uuidv4();
    stmt.run(id, patient_id, v.type, String(v.value), v.unit || '', recorded_at || new Date().toISOString());
    inserted.push(id);
  });
  stmt.finalize(err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, inserted });
  });
});

// Get vitals for a patient
app.get('/api/patients/:id/vitals', (req, res) => {
  const pid = req.params.id;
  db.all("SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 200", [pid], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('Backend running on', PORT);
});
