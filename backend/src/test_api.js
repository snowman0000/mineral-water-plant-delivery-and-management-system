const { pool } = require('./config/db');

async function test() {
  try {
    const [employees] = await pool.query(
      `SELECT id, name, email, phone, role FROM users WHERE is_active = 1 AND role IN ('delivery_boy', 'accountant') ORDER BY name ASC`
    );
    console.log('Employees query results:', employees);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
test();
