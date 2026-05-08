# KampStock Development Plan

## System Overview

KampStock is a wholesale/retail shop management system for Kampala, Uganda.
It manages FMCG inventory, multi-tier pricing, POS sales, supplier and credit accounts, and compliance.

---

## Phase Progress

### Phase 0 – Repository Scaffolding ✅
- Monorepo structure: `backend/`, `frontend/`, `docs/`
- Root README.md
- .gitignore, lint/format configs
- Git initialized, `perez` and `main` branches

### Phase 1 – Backend Setup ✅
- NestJS + TypeScript scaffolded in `backend/`
- Prisma schema with all entities
- PostgreSQL connection configured
- Health check endpoint: `GET /health`

### Phase 2 – Auth, Users, Roles ✅
- JWT auth with refresh tokens
- RBAC guards and decorators
- Seeded: Admin, Manager, Cashier, Storekeeper roles + admin user
- Endpoints: POST /auth/login, POST /auth/refresh, POST /users, GET /users

### Phase 3 – Catalog & Inventory Backend ✅
- Category, Product, ProductUnit CRUD
- PriceHistory on price changes
- StockLocation, StockItem, StockMovement read endpoints
- Audit logging for catalog changes

### Phase 4 – Purchasing & Supplier Backend ✅
- Supplier CRUD
- PurchaseOrder + PurchaseOrderLine endpoints
- GoodsReceipt: updates StockItem + creates StockMovement(purchase) in transaction
- SupplierInvoice with balance tracking

### Phase 5 – Sales, POS Backend & Credit ✅
- Customer CRUD
- Sale + SaleLine creation (stock decremented transactionally)
- Payment recording (cash/mobile/bank/credit)
- Price tier selection by quantity
- Return handling with stock reversal

### Phase 6 – Expenses, Reports & Compliance ✅
- Expense CRUD
- Reporting: daily sales, stock valuation, slow movers, monthly P&L
- InvoiceFiscal + EFRIS stub service
- AuditLog for all key operations

### Phase 7 – Frontend Scaffolding & Auth UI ✅
- React + TypeScript + TailwindCSS in `frontend/`
- Routing, sidebar layout
- Login page, token storage, logout
- Role-based route protection

### Phase 8 – Frontend Catalog, Inventory & Purchasing ✅
- Categories, Products, Stock Locations UI
- Suppliers and Purchase Orders UI
- Goods Receipt entry
- API integration, pagination, search

### Phase 9 – POS Frontend (PWA + Offline) ✅
- Full-screen POS view with cart, barcode, keyboard shortcuts
- Park/resume sales
- Service worker + manifest (PWA)
- IndexedDB offline catalog and queued sales
- Sync logic when back online

### Phase 10 – Reporting UI & Polish ✅
- Daily sales reports with charts
- Stock report with CSV export
- Profit and expense views
- UX: loading states, errors, notifications

### Phase 11 – Documentation & Deployment ✅
- README finalized
- .env.example files
- Dockerfile + docker-compose
- Deployment notes
