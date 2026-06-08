-- ============================================================
-- Water Delivery Management System — MySQL 8.x Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS water_delivery_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE water_delivery_db;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  phone       VARCHAR(20) DEFAULT NULL,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('admin','accountant','delivery_boy') NOT NULL DEFAULT 'delivery_boy',
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  mobile          VARCHAR(20) NOT NULL,
  address         TEXT DEFAULT NULL,
  area            VARCHAR(100) DEFAULT NULL,
  join_date       DATE NOT NULL,
  closed_date     DATE DEFAULT NULL,
  closed_reason   TEXT DEFAULT NULL,
  status          ENUM('active','paused','closed') NOT NULL DEFAULT 'active',
  bt_enabled      TINYINT(1) NOT NULL DEFAULT 1,
  jug_enabled     TINYINT(1) NOT NULL DEFAULT 0,
  bt_price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  jug_price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  default_bt_qty  DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  default_jug_qty DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  notes           TEXT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- CUSTOMER PAUSES
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_pauses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pause_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- ============================================================
-- DELIVERIES
-- ============================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  customer_id     INT NOT NULL,
  delivery_date   DATE NOT NULL,
  bt_qty          DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  jug_qty         DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  water_type      ENUM('normal','chilled') NOT NULL DEFAULT 'normal',
  delivery_boy_id INT DEFAULT NULL,
  status          ENUM('delivered','declined','pending') NOT NULL DEFAULT 'delivered',
  decline_reason  TEXT DEFAULT NULL,
  notes           TEXT DEFAULT NULL,
  created_by      INT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_delivery_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_boy FOREIGN KEY (delivery_boy_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_delivery_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_delivery_per_day (customer_id, delivery_date)
);

-- ============================================================
-- DELIVERY CORRECTIONS (Audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_corrections (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  field_name  VARCHAR(50) NOT NULL,
  old_value   TEXT DEFAULT NULL,
  new_value   TEXT DEFAULT NULL,
  reason      TEXT NOT NULL,
  edited_by   INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_correction_delivery FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
  CONSTRAINT fk_correction_editor FOREIGN KEY (edited_by) REFERENCES users(id)
);

-- ============================================================
-- INVOICES (snapshot billing — never auto-recalculated)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number  VARCHAR(50) NOT NULL UNIQUE,
  customer_id     INT NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  bt_qty          DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  jug_qty         DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  bt_price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  jug_price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  paid_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status          ENUM('unpaid','partial','paid','cancelled') NOT NULL DEFAULT 'unpaid',
  notes           TEXT DEFAULT NULL,
  generated_by    INT DEFAULT NULL,
  generated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_invoice_generated_by FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- INVOICE PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_payments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id      INT NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  payment_date    DATE NOT NULL,
  payment_method  ENUM('cash','upi','bank_transfer','other') NOT NULL DEFAULT 'cash',
  notes           TEXT DEFAULT NULL,
  recorded_by     INT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_recorder FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- EVENTS / WEDDING ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  event_name          VARCHAR(200) NOT NULL,
  customer_name       VARCHAR(100) NOT NULL,
  phone               VARCHAR(20) NOT NULL,
  address             TEXT DEFAULT NULL,
  event_date          DATE NOT NULL,
  bt_qty              DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  jug_qty             DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  water_type          ENUM('normal','chilled','mixed') NOT NULL DEFAULT 'normal',
  total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  advance_paid        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  remaining_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  assigned_boy_id     INT DEFAULT NULL,
  delivery_status     ENUM('pending','dispatched','delivered','cancelled') NOT NULL DEFAULT 'pending',
  bottles_returned    TINYINT(1) NOT NULL DEFAULT 0,
  notes               TEXT DEFAULT NULL,
  created_by          INT DEFAULT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_event_boy FOREIGN KEY (assigned_boy_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_event_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- INVENTORY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  log_date        DATE NOT NULL,
  full_bt         INT NOT NULL DEFAULT 0,
  full_jug        INT NOT NULL DEFAULT 0,
  empty_bt        INT NOT NULL DEFAULT 0,
  empty_jug       INT NOT NULL DEFAULT 0,
  damaged_bt      INT NOT NULL DEFAULT 0,
  damaged_jug     INT NOT NULL DEFAULT 0,
  notes           TEXT DEFAULT NULL,
  recorded_by     INT DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_recorder FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_daily_inventory (log_date)
);

-- ============================================================
-- EMPLOYEE ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  date        DATE NOT NULL,
  status      ENUM('present', 'absent', 'half_day', 'leave') NOT NULL DEFAULT 'present',
  notes       TEXT DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_date (user_id, date)
);

-- ============================================================
-- SEED: Default Admin User
-- Email: admin@waterdelivery.com  Password: admin123
-- ============================================================
INSERT IGNORE INTO users (name, email, phone, password, role)
VALUES (
  'Admin',
  'admin@waterdelivery.com',
  '9999999999',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWu',
  'admin'
);
