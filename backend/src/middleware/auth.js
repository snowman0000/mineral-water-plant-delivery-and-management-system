const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query('SELECT id, role, is_active FROM users WHERE id = ?', [decoded.id]);
    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({ message: 'User no longer exists or is inactive' });
    }
    req.user = { ...decoded, role: rows[0].role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
