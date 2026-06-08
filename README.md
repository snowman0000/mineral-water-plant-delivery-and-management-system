# AquaFlow — Water Delivery Management System

A full-stack, mobile-first water delivery management system built for small businesses.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS |
| State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Backend | Node.js + Express.js |
| Database | MySQL 8.x |
| Auth | JWT |

## Quick Start

### 1. Database Setup
```bash
mysql -u root -p < backend/src/config/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # Edit DB credentials
npm install
npm run dev                 # Starts on :5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                 # Starts on :5173 (proxies /api → :5000)
```

### 4. Login
```
URL:      http://localhost:5173
Email:    admin@waterdelivery.com
Password: admin123
```

## Modules

| Module | Path | Description |
|--------|------|-------------|
| Dashboard | `/dashboard` | KPI cards, quick daily entry shortcut |
| **Daily Entry** | `/daily-entry` | Mobile-first quick entry (most critical) |
| Customers | `/customers` | CRUD, pause, status management |
| Billing | `/billing` | Invoice generation from delivery records |
| Events | `/events` | Wedding / event bulk orders |
| Inventory | `/inventory` | Bottle stock tracking |
| Reports | `/reports` | Monthly, daily, area, customer reports |
| Employees | `/employees` | Team management + RBAC |

## Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access |
| **Accountant** | Customers, billing, reports (read-only employees) |
| **Delivery Boy** | Daily entry only |

## API Routes

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/customers          ?status=&search=&area=
POST   /api/customers
PUT    /api/customers/:id
PUT    /api/customers/:id/status
POST   /api/customers/:id/pauses

GET    /api/deliveries         ?date=&customer_id=
POST   /api/deliveries         (upsert single)
POST   /api/deliveries/bulk    (bulk entry for the day)
PATCH  /api/deliveries/:id     (correction with audit log)

POST   /api/billing/generate         (single customer)
POST   /api/billing/generate-all     (all active customers)
GET    /api/billing/invoices
POST   /api/billing/invoices/:id/payment

GET    /api/events
POST   /api/events
PUT    /api/events/:id

GET    /api/inventory
POST   /api/inventory          (upsert today's stock)

GET    /api/reports/dashboard
GET    /api/reports/daily-revenue
GET    /api/reports/monthly-revenue
GET    /api/reports/area
GET    /api/reports/customer

GET    /api/employees
POST   /api/employees
PUT    /api/employees/:id
```

## Billing Safety

- Invoices are **generated from delivery records only**
- Declined deliveries are **automatically excluded**
- Paused periods are **automatically excluded**
- Generated invoices are **immutable snapshots**
- Formula: `SUM(BT × BT_Price) + SUM(JUG × JUG_Price)`

## Delivery Corrections

Every edit to a delivery record is logged with:
- Old value
- New value
- Reason
- Editor
- Timestamp

No silent edits — full audit trail.

## Architecture Notes

This system is designed as a **reusable business platform**. The following modules can be reused across projects (dairy, gas cylinder, milk distribution):

- `modules/auth` — JWT authentication + RBAC
- `modules/customers` — Generic customer management
- `modules/employees` — Staff management
- `modules/deliveries` — Daily transaction entry
- `modules/billing` — Invoice generation engine
- `modules/inventory` — Stock tracking
- `modules/reports` — Reporting engine

## PM2 Deployment

```bash
# Backend
pm2 start backend/src/app.js --name aquaflow-api

# Frontend build
cd frontend && npm run build
# Serve dist/ via Nginx on port 80
```
