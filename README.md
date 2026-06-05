<div align="center">

# 🏪 KampStock

### Wholesale & Retail Stock Management System

**A production-grade inventory, POS, and business management platform built for Kampala shops.**

[![NestJS](https://img.shields.io/badge/Backend-NestJS%2011-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%207-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Styles-TailwindCSS%20v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

---

*Built for FMCG and household goods retailers in Uganda — handling multi-tier pricing, real-time stock, credit customers, and full business reporting.*

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🧑‍💼 Access & Security
- Role-based access control (Admin, Manager, Cashier, Storekeeper)
- JWT authentication with refresh token rotation
- Brute-force protection & rate limiting
- Full audit trail on all mutations

### 🛒 Point of Sale
- Fast keyboard & barcode POS interface
- Retail and wholesale pricing modes
- Cash, Mobile Money, Bank, and Credit payments
- Sales returns & refunds
- Offline mode — queues sales locally, syncs on reconnect

### 📦 Inventory & Products
- Product catalog with categories, barcodes, multi-unit pricing
- Real-time stock levels across locations
- Stock movement history and audit log
- Low-stock alerts and expiry tracking

</td>
<td width="50%">

### 🏭 Purchasing
- Purchase order creation and approval workflow
- Goods received notes and supplier invoicing
- Supplier balance and payment tracking

### 👥 Customers & Credit
- Customer profiles with credit limits
- Outstanding balance ageing reports
- Credit sale workflows

### 💰 Finance & Reporting
- Daily sales summary and trends
- Gross profit / P&L by period
- Top products, category breakdown, payment method split
- Expense tracking and categorisation
- Stock valuation report

### 📊 Dashboard
- Live revenue, order count, low-stock indicators
- 30-day sales trend chart
- 6-month P&L summary
- Payment method distribution

</td>
</tr>
</table>

---

## 🗂️ Project Structure

```
kampstock/
├── backend/                  # NestJS API server
│   ├── src/
│   │   ├── auth/             # JWT auth, RBAC guards
│   │   ├── products/         # Product catalog & units
│   │   ├── inventory/        # Stock locations & movements
│   │   ├── sales/            # POS engine, receipts, returns
│   │   ├── purchasing/       # Purchase orders, GRNs
│   │   ├── customers/        # Customer profiles, credit
│   │   ├── suppliers/        # Supplier management
│   │   ├── expenses/         # Expense categories & records
│   │   ├── reports/          # Analytics & reporting
│   │   └── users/            # User management
│   ├── prisma/               # SQLite schema (dev)
│   └── prisma-pg/            # PostgreSQL schema (production)
│
├── frontend/                 # React 19 web app
│   └── src/
│       ├── pages/            # Dashboard, POS, Products, Sales, …
│       ├── layouts/          # AppLayout with role-aware nav
│       ├── store/            # Zustand auth store
│       └── lib/              # Axios client, offline queue
│
└── docs/                     # Architecture & development docs
```

---

## ⚙️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | NestJS 11, TypeScript | REST API, business logic |
| **Database (dev)** | SQLite + Prisma 7 | Local development |
| **Database (prod)** | PostgreSQL + Prisma 7 | Production deployment |
| **Frontend** | React 19, Vite 8, TypeScript | SPA web interface |
| **Styling** | TailwindCSS v4 | Utility-first UI |
| **Charts** | Recharts | Reporting & dashboards |
| **Auth** | JWT + Refresh Tokens, Throttler | Secure authentication |
| **State** | Zustand, TanStack Query | Client state & caching |
| **Offline** | IndexedDB (via custom queue) | Offline POS sales sync |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **PostgreSQL** ≥ 14 *(production only — SQLite used in dev)*

### 1. Backend

```bash
cd backend
cp .env.example .env          # configure DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev        # run migrations
npx prisma db seed            # seed demo data and user accounts
npm run start:dev             # starts on http://localhost:3000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env          # set VITE_API_URL=http://localhost:3000/api
npm install
npm run dev                   # starts on http://localhost:5173
```

---

## 🔑 Demo Accounts *(seeded)*

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin — full access |
| `manager` | `manager123` | Manager — no user/role management |
| `cashier` | `cashier123` | Cashier — POS & sales only |
| `storekeeper` | `store123` | Storekeeper — inventory & receiving |

---

## 🌐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string. **On Vercel/serverless**, append `?connection_limit=1&pool_timeout=20` to the Neon pooler URL to prevent connection exhaustion across concurrent cold starts. |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_EXPIRY` | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL (e.g. `7d`) |
| `NODE_ENV` | `development` or `production` |
| `ALLOWED_ORIGINS` | Comma-separated frontend origin URLs *(prod)* |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_APP_MODE` | `multi` (role login) or `single` (owner mode) |

---

## 📈 Development Progress

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Repository scaffolding | ✅ Complete |
| 1 | Backend setup + Prisma schema | ✅ Complete |
| 2 | Auth, users, roles, RBAC | ✅ Complete |
| 3 | Product catalog & inventory backend | ✅ Complete |
| 4 | Purchasing & supplier backend | ✅ Complete |
| 5 | Sales, POS engine, credit logic | ✅ Complete |
| 6 | Expenses, reports, compliance stubs | ✅ Complete |
| 7 | Frontend scaffolding + auth UI | ✅ Complete |
| 8 | Frontend catalog, inventory, purchasing | ✅ Complete |
| 9 | POS frontend + PWA offline mode | ✅ Complete |
| 10 | Sales history, reporting UI, UX polish | ✅ Complete |
| 11 | Documentation + deployment prep | ✅ Complete |

---

## 🔒 License

Copyright (c) 2024–2026 KampStock. **All rights reserved.**

This software is proprietary and confidential. Unauthorised copying, modification, distribution, or use is strictly prohibited. See [LICENSE](./LICENSE) for full terms.
