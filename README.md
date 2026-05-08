# KampStock

> **Wholesale & retail stock control for Kampala shops**

KampStock is a production-grade full-stack inventory, stock, and sales management system built for wholesale/retail shops in Kampala, Uganda. It handles FMCG and household goods with multi-tier pricing, offline-capable POS, supplier management, credit customers, and business reporting.

---

## Features

- **User & Role Management** – Admin, Manager, Cashier, Storekeeper with RBAC
- **Product & Catalog Management** – Categories, barcodes, units, multi-tier pricing, expiry tracking
- **Inventory & Stock Control** – Real-time stock across locations, movements audit trail
- **Purchasing & Supplier Management** – POs, goods receipts, supplier invoices and balances
- **Sales & POS** – Fast keyboard/barcode POS, cash/credit/mobile money, returns
- **Customer & Credit Management** – Credit limits, ageing, outstanding balances
- **Finance & Expenses** – Basic P&L, expense categories
- **Compliance & Logging** – EFRIS-ready structure, full audit log
- **Reporting** – Daily sales, stock valuation, slow movers, monthly profit

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, NestJS, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Frontend | React, TypeScript, TailwindCSS |
| POS | React PWA with IndexedDB offline support |
| Auth | JWT + refresh tokens, RBAC |
| Infra | Nginx, Let's Encrypt, GitHub Actions CI/CD |

---

## Project Structure

```
kampstock/
├── backend/          # NestJS API server
├── frontend/         # React web app + POS PWA
├── docs/             # Architecture and development docs
└── docker-compose.yml
```

---

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database URL and secrets
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

---

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for all required variables.

---

## Running Tests

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e

# Frontend tests
cd frontend
npm run test
```

---

## Development Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Repository scaffolding | ✅ Done |
| 1 | Backend setup + Prisma schema | ✅ Done |
| 2 | Auth, users, roles | ✅ Done |
| 3 | Catalog and inventory backend | ✅ Done |
| 4 | Purchasing and supplier backend | ✅ Done |
| 5 | Sales, POS backend, credit logic | ✅ Done |
| 6 | Expenses, reports, compliance stubs | ✅ Done |
| 7 | Frontend scaffolding + auth UI | ✅ Done |
| 8 | Frontend catalog, inventory, purchasing | ✅ Done |
| 9 | POS frontend + PWA offline | ✅ Done |
| 10 | Reporting UI + UX polish | ✅ Done |
| 11 | Documentation + deployment | ✅ Done |

---

## License

MIT
