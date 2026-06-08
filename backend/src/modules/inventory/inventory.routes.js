const express = require('express');
const { pool } = require('../../config/db');
const { authMiddleware } = require('../../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// GET /api/inventory
router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    let sql = `SELECT i.*, u.name as recorded_by_name FROM inventory_logs i
               LEFT JOIN users u ON i.recorded_by = u.id WHERE 1=1`;
    const params = [];
    if (month) { sql += ' AND DATE_FORMAT(i.log_date, "%Y-%m") = ?'; params.push(month); }
    sql += ' ORDER BY i.log_date DESC LIMIT 60';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/inventory/latest
router.get('/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM inventory_logs ORDER BY log_date DESC LIMIT 1'
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/inventory  (upsert today's stock)
router.post('/', async (req, res) => {
  try {
    const { log_date, full_bt, full_jug, empty_bt, empty_jug, damaged_bt, damaged_jug, notes } = req.body;
    const date = log_date || new Date().toISOString().split('T')[0];

    const [existing] = await pool.query('SELECT id FROM inventory_logs WHERE log_date=?', [date]);
    if (existing.length > 0) {
      await pool.query(
        `UPDATE inventory_logs SET full_bt=?,full_jug=?,empty_bt=?,empty_jug=?,damaged_bt=?,damaged_jug=?,notes=?,recorded_by=? WHERE log_date=?`,
        [full_bt ?? 0, full_jug ?? 0, empty_bt ?? 0, empty_jug ?? 0, damaged_bt ?? 0, damaged_jug ?? 0, notes || null, req.user.id, date]
      );
      return res.json({ message: 'Inventory updated' });
    }
    const [result] = await pool.query(
      `INSERT INTO inventory_logs (log_date, full_bt, full_jug, empty_bt, empty_jug, damaged_bt, damaged_jug, notes, recorded_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [date, full_bt ?? 0, full_jug ?? 0, empty_bt ?? 0, empty_jug ?? 0, damaged_bt ?? 0, damaged_jug ?? 0, notes || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Inventory logged' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
