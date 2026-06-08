const express = require('express');
const { pool } = require('../../config/db');
const { authMiddleware, requireRole } = require('../../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Helper: generate invoice number
function generateInvoiceNumber() {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
}

// GET /api/billing/invoices  ?customer_id=&status=&month=YYYY-MM
router.get('/invoices', async (req, res) => {
  try {
    const { customer_id, status, month } = req.query;
    let sql = `
      SELECT i.*, c.name as customer_name, c.area, u.name as generated_by_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON i.generated_by = u.id
      WHERE 1=1
    `;
    const params = [];
    if (customer_id) { sql += ' AND i.customer_id = ?'; params.push(customer_id); }
    if (status) { sql += ' AND i.status = ?'; params.push(status); }
    if (month) { sql += ' AND DATE_FORMAT(i.period_start, "%Y-%m") = ?'; params.push(month); }
    sql += ' ORDER BY i.generated_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/billing/invoices/:id
router.get('/invoices/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, c.name as customer_name, c.mobile, c.area, c.address
      FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });

    const [payments] = await pool.query(
      `SELECT p.*, u.name as recorded_by_name FROM invoice_payments p
       LEFT JOIN users u ON p.recorded_by = u.id WHERE p.invoice_id = ? ORDER BY p.payment_date DESC`,
      [req.params.id]
    );

    const [deliveries] = await pool.query(
      `SELECT delivery_date, bt_qty, jug_qty, status, notes
       FROM deliveries
       WHERE customer_id = ? AND delivery_date BETWEEN ? AND ?
       ORDER BY delivery_date ASC`,
      [rows[0].customer_id, rows[0].period_start, rows[0].period_end]
    );

    res.json({ ...rows[0], payments, deliveries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/billing/generate  — generate invoice for one customer
router.post('/generate', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { customer_id, period_start, period_end, notes } = req.body;
    if (!customer_id || !period_start || !period_end) {
      return res.status(400).json({ message: 'customer_id, period_start, period_end required' });
    }

    // Get customer pricing
    const [custRows] = await pool.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
    if (custRows.length === 0) return res.status(404).json({ message: 'Customer not found' });
    const cust = custRows[0];

    // Get all delivered (non-declined) deliveries in period, excluding paused days
    const [deliveries] = await pool.query(`
      SELECT d.bt_qty, d.jug_qty FROM deliveries d
      WHERE d.customer_id = ?
        AND d.delivery_date BETWEEN ? AND ?
        AND d.status = 'delivered'
        AND NOT EXISTS (
          SELECT 1 FROM customer_pauses cp
          WHERE cp.customer_id = d.customer_id
            AND d.delivery_date BETWEEN cp.start_date AND cp.end_date
        )
    `, [customer_id, period_start, period_end]);

    const bt_qty = deliveries.reduce((sum, d) => sum + Number(d.bt_qty), 0);
    const jug_qty = deliveries.reduce((sum, d) => sum + Number(d.jug_qty), 0);
    const total_amount = (bt_qty * Number(cust.bt_price)) + (jug_qty * Number(cust.jug_price));

    const invoice_number = generateInvoiceNumber();
    const balance = total_amount; // initially no payments
    const [result] = await pool.query(
      `INSERT INTO invoices (invoice_number, customer_id, period_start, period_end, bt_qty, jug_qty, bt_price, jug_price, total_amount, paid_amount, balance, notes, generated_by)
       VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?)`,
      [invoice_number, customer_id, period_start, period_end, bt_qty, jug_qty, cust.bt_price, cust.jug_price, total_amount, balance, notes || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId, invoice_number, bt_qty, jug_qty, total_amount, message: 'Invoice generated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/billing/generate-all  — generate invoices for all active customers
router.post('/generate-all', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { period_start, period_end } = req.body;
    if (!period_start || !period_end) return res.status(400).json({ message: 'period_start and period_end required' });

    const [customers] = await pool.query(
      "SELECT * FROM customers WHERE status = 'active'"
    );

    const generated = [];
    for (const cust of customers) {
      const [deliveries] = await pool.query(`
        SELECT bt_qty, jug_qty FROM deliveries
        WHERE customer_id = ? AND delivery_date BETWEEN ? AND ?
          AND status = 'delivered'
          AND NOT EXISTS (
            SELECT 1 FROM customer_pauses cp
            WHERE cp.customer_id = ? AND delivery_date BETWEEN cp.start_date AND cp.end_date
          )
      `, [cust.id, period_start, period_end, cust.id]);

      if (deliveries.length === 0) continue;

      const bt_qty = deliveries.reduce((s, d) => s + Number(d.bt_qty), 0);
      const jug_qty = deliveries.reduce((s, d) => s + Number(d.jug_qty), 0);
      const total_amount = (bt_qty * Number(cust.bt_price)) + (jug_qty * Number(cust.jug_price));
      const invoice_number = generateInvoiceNumber() + `-${cust.id}`;

      await pool.query(
        `INSERT IGNORE INTO invoices (invoice_number, customer_id, period_start, period_end, bt_qty, jug_qty, bt_price, jug_price, total_amount, paid_amount, balance, generated_by)
         VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`,
        [invoice_number, cust.id, period_start, period_end, bt_qty, jug_qty, cust.bt_price, cust.jug_price, total_amount, total_amount, req.user.id]
      );
      generated.push({ customer_id: cust.id, customer_name: cust.name, total_amount });
    }
    res.json({ message: `Generated ${generated.length} invoices`, generated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/billing/invoices/:id/payment
router.post('/invoices/:id/payment', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { amount, payment_date, payment_method, notes } = req.body;
    if (!amount) return res.status(400).json({ message: 'amount is required' });

    const [inv] = await pool.query('SELECT * FROM invoices WHERE id=?', [req.params.id]);
    if (inv.length === 0) return res.status(404).json({ message: 'Invoice not found' });

    await pool.query(
      'INSERT INTO invoice_payments (invoice_id, amount, payment_date, payment_method, notes, recorded_by) VALUES (?,?,?,?,?,?)',
      [req.params.id, amount, payment_date || new Date().toISOString().split('T')[0], payment_method || 'cash', notes || null, req.user.id]
    );

    // Recalculate paid_amount and update status
    const [payments] = await pool.query(
      'SELECT SUM(amount) as total_paid FROM invoice_payments WHERE invoice_id=?',
      [req.params.id]
    );
    const total_paid = Number(payments[0].total_paid) || 0;
    const total_amount = Number(inv[0].total_amount);
    const newBalance = Math.max(0, total_amount - total_paid);
    const newStatus = total_paid >= total_amount ? 'paid' : total_paid > 0 ? 'partial' : 'unpaid';

    await pool.query(
      'UPDATE invoices SET paid_amount=?, balance=?, status=? WHERE id=?',
      [total_paid, newBalance, newStatus, req.params.id]
    );
    res.json({ message: 'Payment recorded', total_paid, status: newStatus });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/billing/invoices/:id/cancel
router.put('/invoices/:id/cancel', requireRole('admin'), async (req, res) => {
  try {
    await pool.query("UPDATE invoices SET status='cancelled' WHERE id=?", [req.params.id]);
    res.json({ message: 'Invoice cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
