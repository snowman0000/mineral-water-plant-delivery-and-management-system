const express = require('express');
const { pool } = require('../../config/db');
const { authMiddleware, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// GET /api/deliveries?date=YYYY-MM-DD&customer_id=&delivery_boy_id=
router.get('/', async (req, res) => {
  try {
    const { date, customer_id, delivery_boy_id } = req.query;
    let sql = `
      SELECT d.*, c.name as customer_name, c.area, c.bt_price, c.jug_price,
             u.name as delivery_boy_name
      FROM deliveries d
      JOIN customers c ON d.customer_id = c.id
      LEFT JOIN users u ON d.delivery_boy_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (date) { sql += ' AND d.delivery_date = ?'; params.push(date); }
    if (customer_id) { sql += ' AND d.customer_id = ?'; params.push(customer_id); }
    if (delivery_boy_id) { sql += ' AND d.delivery_boy_id = ?'; params.push(delivery_boy_id); }
    sql += ' ORDER BY c.area, c.name ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/deliveries/today-summary  (for dashboard)
router.get('/today-summary', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [summary] = await pool.query(`
      SELECT
        COUNT(*) as total_deliveries,
        SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status='declined' THEN 1 ELSE 0 END) as declined,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='delivered' THEN bt_qty ELSE 0 END) as total_bt,
        SUM(CASE WHEN status='delivered' THEN jug_qty ELSE 0 END) as total_jug
      FROM deliveries WHERE delivery_date = ?
    `, [today]);
    res.json(summary[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/deliveries/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, c.name as customer_name, u.name as delivery_boy_name
      FROM deliveries d
      JOIN customers c ON d.customer_id = c.id
      LEFT JOIN users u ON d.delivery_boy_id = u.id
      WHERE d.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Delivery not found' });

    const [corrections] = await pool.query(
      `SELECT dc.*, u.name as editor_name FROM delivery_corrections dc
       JOIN users u ON dc.edited_by = u.id WHERE dc.delivery_id = ? ORDER BY dc.created_at DESC`,
      [req.params.id]
    );
    res.json({ ...rows[0], corrections });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/deliveries  (create or upsert for a day)
router.post('/', async (req, res) => {
  try {
    const { customer_id, delivery_date, bt_qty, jug_qty, water_type, delivery_boy_id, status, decline_reason, notes, save_as_default } = req.body;
    if (!customer_id || !delivery_date) {
      return res.status(400).json({ message: 'customer_id and delivery_date are required' });
    }

    if (save_as_default) {
      await pool.query(
        'UPDATE customers SET default_bt_qty = ?, default_jug_qty = ? WHERE id = ?',
        [bt_qty ?? 0, jug_qty ?? 0, customer_id]
      );
    }

    // Upsert: if entry exists for this customer+date, update it
    const [existing] = await pool.query(
      'SELECT id FROM deliveries WHERE customer_id=? AND delivery_date=?',
      [customer_id, delivery_date]
    );

    if (existing.length > 0) {
      const deliveryId = existing[0].id;
      // log corrections
      const [old] = await pool.query('SELECT * FROM deliveries WHERE id=?', [deliveryId]);
      const oldRow = old[0];
      const fields = { bt_qty, jug_qty, water_type, status, delivery_boy_id };
      const correctionInserts = [];
      for (const [field, newVal] of Object.entries(fields)) {
        if (newVal !== undefined && String(oldRow[field]) !== String(newVal)) {
          correctionInserts.push([deliveryId, field, oldRow[field], newVal, 'Updated via entry', req.user.id]);
        }
      }
      if (correctionInserts.length > 0) {
        await pool.query(
          'INSERT INTO delivery_corrections (delivery_id, field_name, old_value, new_value, reason, edited_by) VALUES ?',
          [correctionInserts]
        );
      }
      await pool.query(
        `UPDATE deliveries SET bt_qty=?, jug_qty=?, water_type=?, delivery_boy_id=?, status=?, decline_reason=?, notes=? WHERE id=?`,
        [bt_qty ?? 0, jug_qty ?? 0, water_type || 'normal', delivery_boy_id || null, status || 'delivered', decline_reason || null, notes || null, deliveryId]
      );
      return res.json({ id: deliveryId, message: 'Delivery updated' });
    }

    const [result] = await pool.query(
      `INSERT INTO deliveries (customer_id, delivery_date, bt_qty, jug_qty, water_type, delivery_boy_id, status, decline_reason, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [customer_id, delivery_date, bt_qty ?? 0, jug_qty ?? 0, water_type || 'normal', delivery_boy_id || null, status || 'delivered', decline_reason || null, notes || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Delivery created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/deliveries/:id  (edit with correction log)
router.patch('/:id', async (req, res) => {
  try {
    const { bt_qty, jug_qty, water_type, status, delivery_boy_id, decline_reason, notes, reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'reason is required for corrections' });

    const [old] = await pool.query('SELECT * FROM deliveries WHERE id=?', [req.params.id]);
    if (old.length === 0) return res.status(404).json({ message: 'Delivery not found' });
    const oldRow = old[0];

    const fields = { bt_qty, jug_qty, water_type, status, delivery_boy_id };
    const correctionInserts = [];
    for (const [field, newVal] of Object.entries(fields)) {
      if (newVal !== undefined && String(oldRow[field]) !== String(newVal)) {
        correctionInserts.push([req.params.id, field, oldRow[field], newVal, reason, req.user.id]);
      }
    }
    if (correctionInserts.length > 0) {
      await pool.query(
        'INSERT INTO delivery_corrections (delivery_id, field_name, old_value, new_value, reason, edited_by) VALUES ?',
        [correctionInserts]
      );
    }

    await pool.query(
      `UPDATE deliveries SET bt_qty=COALESCE(?,bt_qty), jug_qty=COALESCE(?,jug_qty),
       water_type=COALESCE(?,water_type), status=COALESCE(?,status),
       delivery_boy_id=COALESCE(?,delivery_boy_id), decline_reason=COALESCE(?,decline_reason), notes=COALESCE(?,notes)
       WHERE id=?`,
      [bt_qty, jug_qty, water_type, status, delivery_boy_id, decline_reason, notes, req.params.id]
    );
    res.json({ message: 'Delivery corrected and logged' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/deliveries/bulk  (bulk upsert for fast daily entry)
router.post('/bulk', async (req, res) => {
  try {
    const { entries, delivery_date } = req.body;
    if (!Array.isArray(entries) || !delivery_date) {
      return res.status(400).json({ message: 'entries array and delivery_date required' });
    }
    const results = [];
    for (const entry of entries) {
      const { customer_id, bt_qty, jug_qty, water_type, delivery_boy_id, status, decline_reason, notes } = entry;
      const [existing] = await pool.query(
        'SELECT id FROM deliveries WHERE customer_id=? AND delivery_date=?',
        [customer_id, delivery_date]
      );
      if (existing.length > 0) {
        await pool.query(
          `UPDATE deliveries SET bt_qty=?, jug_qty=?, water_type=?, delivery_boy_id=?, status=?, decline_reason=?, notes=? WHERE id=?`,
          [bt_qty ?? 0, jug_qty ?? 0, water_type || 'normal', delivery_boy_id || null, status || 'delivered', decline_reason || null, notes || null, existing[0].id]
        );
        results.push({ customer_id, action: 'updated' });
      } else {
        await pool.query(
          `INSERT INTO deliveries (customer_id, delivery_date, bt_qty, jug_qty, water_type, delivery_boy_id, status, decline_reason, notes, created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [customer_id, delivery_date, bt_qty ?? 0, jug_qty ?? 0, water_type || 'normal', delivery_boy_id || null, status || 'delivered', decline_reason || null, notes || null, req.user.id]
        );
        results.push({ customer_id, action: 'created' });
      }
    }
    res.json({ message: 'Bulk entry saved', results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
