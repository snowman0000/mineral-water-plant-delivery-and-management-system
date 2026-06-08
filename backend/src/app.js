require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { testConnection } = require('./config/db');

const authRoutes = require('./modules/auth/auth.routes');
const customerRoutes = require('./modules/customers/customers.routes');
const employeeRoutes = require('./modules/employees/employees.routes');
const deliveryRoutes = require('./modules/deliveries/deliveries.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const eventRoutes = require('./modules/events/events.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const reportRoutes = require('./modules/reports/reports.routes');

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/customers',  customerRoutes);
app.use('/api/employees',  employeeRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/billing',    billingRoutes);
app.use('/api/events',     eventRoutes);
app.use('/api/inventory',  inventoryRoutes);
app.use('/api/reports',    reportRoutes);

// ─── Health ───────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ─── Serve Frontend static files ──────────────────────────────────
const publicPath = path.join(__dirname, '../public');
const indexPath = path.join(publicPath, 'index.html');

if (fs.existsSync(publicPath)) {
  // Serve static files with correct cache headers
  app.use(express.static(publicPath, {
    maxAge: '1h',
    etag: false,
  }));
  
  // SPA fallback: serve index.html for all non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    res.status(404).json({ message: 'Frontend build not found. Please rebuild.' });
  });
} else {
  console.warn('⚠️  Frontend build directory not found at:', publicPath);
  app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
      return res.status(503).json({ 
        message: 'Frontend not available. Please rebuild and redeploy.',
        publicPath 
      });
    }
    next();
  });
}

// ─── 404 for API requests ─────────────────────────────────────────
app.use('/api', (req, res) => res.status(404).json({ message: 'API Route not found' }));

// ─── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Frontend build path: ${publicPath}`);
    console.log(`   Build exists: ${fs.existsSync(publicPath) ? '✅' : '❌'}`);
    if (fs.existsSync(publicPath)) {
      console.log(`   Files: ${fs.readdirSync(publicPath).join(', ')}`);
    }
  });
});

module.exports = app;
