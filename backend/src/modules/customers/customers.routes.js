const express = require('express');
const { pool } = require('../../config/db');
const { authMiddleware, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// GET /api/customers  ?area=&status=&search=&date=
router.get('/', async (req, res) => {
  try {
    const { area, status, search, date } = req.query;
    let sql = `SELECT c.id, c.name, c.mobile, c.address, c.area, c.join_date, c.status,
                      c.bt_enabled, c.jug_enabled, c.bt_price, c.jug_price, c.default_bt_qty, c.default_jug_qty, c.notes`;
    const params = [];

    if (date) {
      sql += `, (SELECT COUNT(*) FROM customer_pauses cp WHERE cp.customer_id = c.id AND ? BETWEEN cp.start_date AND cp.end_date) > 0 AS is_paused`;
      params.push(date);
    } else {
      sql += `, 0 AS is_paused`;
    }

    sql += ` FROM customers c WHERE 1=1`;

    if (area) { sql += ' AND c.area = ?'; params.push(area); }
    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    if (search) { sql += ' AND (c.name LIKE ? OR c.mobile LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    sql += ' ORDER BY c.area, c.name ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/customers/areas  (distinct areas for grouping)
router.get('/areas', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT area FROM customers WHERE area IS NOT NULL AND area != '' ORDER BY area ASC`
    );
    res.json(rows.map(r => r.area));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Customer not found' });

    const [pauses] = await pool.query(
      'SELECT * FROM customer_pauses WHERE customer_id = ? ORDER BY start_date DESC',
      [req.params.id]
    );
    res.json({ ...rows[0], pauses });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/customers
router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { name, mobile, address, area, join_date, bt_enabled, jug_enabled, bt_price, jug_price, default_bt_qty, default_jug_qty, notes } = req.body;
    if (!name || !mobile) return res.status(400).json({ message: 'name and mobile are required' });

    const [result] = await pool.query(
      `INSERT INTO customers (name, mobile, address, area, join_date, bt_enabled, jug_enabled, bt_price, jug_price, default_bt_qty, default_jug_qty, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name, mobile, address || null, area || null, join_date || new Date().toISOString().split('T')[0], bt_enabled ?? 1, jug_enabled ?? 0, bt_price ?? 0, jug_price ?? 0, default_bt_qty ?? 0, default_jug_qty ?? 0, notes || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Customer created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/customers/:id
router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { name, mobile, address, area, bt_enabled, jug_enabled, bt_price, jug_price, default_bt_qty, default_jug_qty, notes } = req.body;
    await pool.query(
      `UPDATE customers SET name=?, mobile=?, address=?, area=?, bt_enabled=?, jug_enabled=?, bt_price=?, jug_price=?, default_bt_qty=?, default_jug_qty=?, notes=?
       WHERE id=?`,
      [name, mobile, address || null, area || null, bt_enabled ?? 1, jug_enabled ?? 0, bt_price ?? 0, jug_price ?? 0, default_bt_qty ?? 0, default_jug_qty ?? 0, notes || null, req.params.id]
    );
    res.json({ message: 'Customer updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/customers/:id/status
router.put('/:id/status', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { status, closed_reason, closed_date } = req.body;
    if (!['active', 'paused', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    await pool.query(
      'UPDATE customers SET status=?, closed_reason=?, closed_date=? WHERE id=?',
      [status, closed_reason || null, closed_date || null, req.params.id]
    );
    res.json({ message: 'Customer status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/customers/:id/pauses
router.post('/:id/pauses', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { start_date, end_date, reason } = req.body;
    if (!start_date || !end_date) return res.status(400).json({ message: 'start_date and end_date are required' });

    const [result] = await pool.query(
      'INSERT INTO customer_pauses (customer_id, start_date, end_date, reason) VALUES (?,?,?,?)',
      [req.params.id, start_date, end_date, reason || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Pause created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/customers/:id/pauses/:pauseId
router.delete('/:id/pauses/:pauseId', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    await pool.query('DELETE FROM customer_pauses WHERE id=? AND customer_id=?', [req.params.pauseId, req.params.id]);
    res.json({ message: 'Pause removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
