const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../../config/db');
const { authMiddleware, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role, is_active, created_at
       FROM users ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/employees/delivery-boys  (for dropdowns)
router.get('/delivery-boys', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, phone FROM users WHERE role = 'delivery_boy' AND is_active = 1 ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/employees  (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, role are required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?,?,?,?,?)',
      [name, email, phone || null, hashed, role]
    );
    res.status(201).json({ id: result.insertId, message: 'Employee created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/employees/:id  (admin only)
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, email, phone, role, is_active } = req.body;
    await pool.query(
      'UPDATE users SET name=?, email=?, phone=?, role=?, is_active=? WHERE id=?',
      [name, email, phone || null, role, is_active ?? 1, req.params.id]
    );
    res.json({ message: 'Employee updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/employees/:id/reset-password  (admin only)
router.put('/:id/reset-password', requireRole('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/employees/:id  (admin only — soft delete)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Employee deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/employees/attendance/my ?month=YYYY-MM
router.get('/attendance/my', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'month YYYY-MM is required' });
    const [rows] = await pool.query(
      `SELECT id, date, status, notes FROM attendance
       WHERE user_id = ? AND DATE_FORMAT(date, "%Y-%m") = ?
       ORDER BY date ASC`,
      [req.user.id, month]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/employees/attendance ?date=YYYY-MM-DD
router.get('/attendance', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date YYYY-MM-DD is required' });

    // Fetch all active employees (delivery boys and accountants)
    const [employees] = await pool.query(
      `SELECT id, name, email, phone, role FROM users WHERE is_active = 1 AND role IN ('delivery_boy', 'accountant') ORDER BY name ASC`
    );

    // Fetch attendance for this date
    const [attendance] = await pool.query(
      `SELECT user_id, status, notes FROM attendance WHERE date = ?`,
      [date]
    );

    const attMap = {};
    attendance.forEach(a => {
      attMap[a.user_id] = { status: a.status, notes: a.notes };
    });

    const result = employees.map(e => ({
      ...e,
      attendance: attMap[e.id] || null
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/employees/attendance
router.post('/attendance', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { date, entries } = req.body;
    if (!date || !Array.isArray(entries)) {
      return res.status(400).json({ message: 'date and entries array required' });
    }

    for (const entry of entries) {
      const { user_id, status, notes } = entry;
      await pool.query(
        `INSERT INTO attendance (user_id, date, status, notes)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes)`,
        [user_id, date, status, notes || null]
      );
    }

    res.json({ message: 'Attendance saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
