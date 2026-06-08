const express = require('express');
const { pool } = require('../../config/db');
const { authMiddleware, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const { status, delivery_status } = req.query;
    let sql = `
      SELECT e.*, u.name as assigned_boy_name
      FROM events e LEFT JOIN users u ON e.assigned_boy_id = u.id WHERE 1=1
    `;
    const params = [];
    if (delivery_status) { sql += ' AND e.delivery_status = ?'; params.push(delivery_status); }
    sql += ' ORDER BY e.event_date DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.*, u.name as assigned_boy_name FROM events e
       LEFT JOIN users u ON e.assigned_boy_id = u.id WHERE e.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/events
router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { event_name, customer_name, phone, address, event_date, bt_qty, jug_qty, water_type, total_amount, advance_paid, assigned_boy_id, notes } = req.body;
    if (!event_name || !customer_name || !phone || !event_date) {
      return res.status(400).json({ message: 'event_name, customer_name, phone, event_date required' });
    }
    const [result] = await pool.query(
      `INSERT INTO events (event_name, customer_name, phone, address, event_date, bt_qty, jug_qty, water_type, total_amount, advance_paid, assigned_boy_id, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [event_name, customer_name, phone, address || null, event_date, bt_qty ?? 0, jug_qty ?? 0, water_type || 'normal', total_amount ?? 0, advance_paid ?? 0, assigned_boy_id || null, notes || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Event created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/events/:id
router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const fields = req.body;
    const updates = [];
    const params = [];
    
    const allowed = [
      'event_name', 'customer_name', 'phone', 'address', 'event_date',
      'bt_qty', 'jug_qty', 'water_type', 'total_amount', 'advance_paid',
      'assigned_boy_id', 'delivery_status', 'bottles_returned', 'notes'
    ];
    
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        let val = fields[key];
        if (key === 'event_date' && val) {
          val = val.split('T')[0];
        }
        updates.push(`${key} = ?`);
        params.push(val);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    const [existing] = await pool.query('SELECT total_amount, advance_paid FROM events WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const newTotal = fields.total_amount !== undefined ? Number(fields.total_amount) : Number(existing[0].total_amount);
    const newAdvance = fields.advance_paid !== undefined ? Number(fields.advance_paid) : Number(existing[0].advance_paid);
    const remaining = newTotal - newAdvance;
    
    updates.push('remaining_amount = ?');
    params.push(remaining);
    
    params.push(req.params.id);
    
    await pool.query(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    res.json({ message: 'Event updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id=?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
