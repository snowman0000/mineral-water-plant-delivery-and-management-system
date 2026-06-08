const express = require('express');
const { pool } = require('../../config/db');
const { authMiddleware } = require('../../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// GET /api/reports/daily-revenue?date=YYYY-MM-DD
router.get('/daily-revenue', async (req, res) => {
  try {
    const { date } = req.query;
    const target = date || new Date().toISOString().split('T')[0];
    const [rows] = await pool.query(`
      SELECT
        d.delivery_date,
        COUNT(DISTINCT d.customer_id) as customer_count,
        SUM(CASE WHEN d.status='delivered' THEN d.bt_qty ELSE 0 END) as total_bt,
        SUM(CASE WHEN d.status='delivered' THEN d.jug_qty ELSE 0 END) as total_jug,
        SUM(CASE WHEN d.status='delivered' THEN (d.bt_qty * c.bt_price + d.jug_qty * c.jug_price) ELSE 0 END) as revenue,
        SUM(CASE WHEN d.status='declined' THEN 1 ELSE 0 END) as declined_count
      FROM deliveries d JOIN customers c ON d.customer_id = c.id
      WHERE d.delivery_date = ?
      GROUP BY d.delivery_date
    `, [target]);
    res.json(rows[0] || { delivery_date: target, revenue: 0, total_bt: 0, total_jug: 0 });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/monthly-revenue?month=YYYY-MM
router.get('/monthly-revenue', async (req, res) => {
  try {
    const { month } = req.query;
    const target = month || new Date().toISOString().slice(0, 7);
    const [rows] = await pool.query(`
      SELECT
        d.delivery_date,
        SUM(CASE WHEN d.status='delivered' THEN d.bt_qty ELSE 0 END) as bt_qty,
        SUM(CASE WHEN d.status='delivered' THEN d.jug_qty ELSE 0 END) as jug_qty,
        SUM(CASE WHEN d.status='delivered' THEN (d.bt_qty * c.bt_price + d.jug_qty * c.jug_price) ELSE 0 END) as revenue
      FROM deliveries d JOIN customers c ON d.customer_id = c.id
      WHERE DATE_FORMAT(d.delivery_date, '%Y-%m') = ?
      GROUP BY d.delivery_date
      ORDER BY d.delivery_date ASC
    `, [target]);

    const total_revenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
    const total_bt = rows.reduce((s, r) => s + Number(r.bt_qty), 0);
    const total_jug = rows.reduce((s, r) => s + Number(r.jug_qty), 0);

    res.json({ month: target, daily: rows, total_revenue, total_bt, total_jug });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/area?month=YYYY-MM
router.get('/area', async (req, res) => {
  try {
    const { month } = req.query;
    const target = month || new Date().toISOString().slice(0, 7);
    const [rows] = await pool.query(`
      SELECT
        c.area,
        COUNT(DISTINCT d.customer_id) as customer_count,
        SUM(CASE WHEN d.status='delivered' THEN d.bt_qty ELSE 0 END) as total_bt,
        SUM(CASE WHEN d.status='delivered' THEN d.jug_qty ELSE 0 END) as total_jug,
        SUM(CASE WHEN d.status='delivered' THEN (d.bt_qty * c.bt_price + d.jug_qty * c.jug_price) ELSE 0 END) as revenue
      FROM deliveries d JOIN customers c ON d.customer_id = c.id
      WHERE DATE_FORMAT(d.delivery_date, '%Y-%m') = ?
      GROUP BY c.area
      ORDER BY revenue DESC
    `, [target]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/customer?customer_id=&month=
router.get('/customer', async (req, res) => {
  try {
    const { customer_id, month } = req.query;
    if (!customer_id) return res.status(400).json({ message: 'customer_id required' });
    const target = month || new Date().toISOString().slice(0, 7);

    const [summary] = await pool.query(`
      SELECT
        SUM(CASE WHEN status='delivered' THEN bt_qty ELSE 0 END) as bt_qty,
        SUM(CASE WHEN status='delivered' THEN jug_qty ELSE 0 END) as jug_qty,
        COUNT(*) as total_days,
        SUM(CASE WHEN status='declined' THEN 1 ELSE 0 END) as declined_days
      FROM deliveries WHERE customer_id=? AND DATE_FORMAT(delivery_date,'%Y-%m')=?
    `, [customer_id, target]);

    const [cust] = await pool.query('SELECT name, bt_price, jug_price FROM customers WHERE id=?', [customer_id]);
    const bt_price = Number(cust[0]?.bt_price || 0);
    const jug_price = Number(cust[0]?.jug_price || 0);
    const bt_qty = Number(summary[0].bt_qty || 0);
    const jug_qty = Number(summary[0].jug_qty || 0);

    res.json({
      customer: cust[0],
      month: target,
      bt_qty, jug_qty, bt_price, jug_price,
      total_amount: (bt_qty * bt_price) + (jug_qty * jug_price),
      total_days: summary[0].total_days,
      declined_days: summary[0].declined_days,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/dashboard  (quick summary for dashboard cards)
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.slice(0, 7);

    const [[activeCustomers]] = await pool.query(
      "SELECT COUNT(*) as count FROM customers WHERE status='active'"
    );
    const [[todayDelivery]] = await pool.query(`
      SELECT COUNT(*) as count, SUM(bt_qty) as bt, SUM(jug_qty) as jug
      FROM deliveries WHERE delivery_date=? AND status='delivered'
    `, [today]);
    const [[monthRevenue]] = await pool.query(`
      SELECT SUM(d.bt_qty * c.bt_price + d.jug_qty * c.jug_price) as revenue
      FROM deliveries d JOIN customers c ON d.customer_id=c.id
      WHERE DATE_FORMAT(d.delivery_date,'%Y-%m')=? AND d.status='delivered'
    `, [thisMonth]);
    const [[unpaidInvoices]] = await pool.query(
      "SELECT COUNT(*) as count, SUM(balance) as total FROM invoices WHERE status IN ('unpaid','partial')"
    );
    const [[pendingEvents]] = await pool.query(
      "SELECT COUNT(*) as count FROM events WHERE delivery_status='pending'"
    );

    res.json({
      active_customers: activeCustomers.count,
      today_bt: todayDelivery.bt || 0,
      today_jug: todayDelivery.jug || 0,
      today_deliveries: todayDelivery.count,
      month_revenue: monthRevenue.revenue || 0,
      unpaid_invoices: unpaidInvoices.count,
      unpaid_balance: unpaidInvoices.total || 0,
      pending_events: pendingEvents.count,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
