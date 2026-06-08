require('dotenv').config();
const { pool } = require('./src/config/db');

async function test() {
  try {
    const date = '2026-06-08';
    
    // Fetch all active employees (delivery boys and accountants)
    const [employees] = await pool.query(
      `SELECT id, name, email, phone, role FROM users WHERE is_active = 1 AND role IN ('delivery_boy', 'accountant') ORDER BY name ASC`
    );
    console.log('Active Employees Query Result:', employees);

    // Fetch attendance for this date
    const [attendance] = await pool.query(
      `SELECT user_id, status, notes FROM attendance WHERE date = ?`,
      [date]
    );
    console.log('Attendance Query Result:', attendance);

    const attMap = {};
    attendance.forEach(a => {
      attMap[a.user_id] = { status: a.status, notes: a.notes };
    });

    const result = employees.map(e => ({
      ...e,
      attendance: attMap[e.id] || null
    }));

    console.log('Combined Endpoint Result:', result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
