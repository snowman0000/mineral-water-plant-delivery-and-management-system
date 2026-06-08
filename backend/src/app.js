require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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

// ─── 404 ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// ─── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
testConnection().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
});

module.exports = app;
