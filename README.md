# KampStock

> **Multi-tenant inventory, POS, purchasing, credit and business operations SaaS for Ugandan wholesale and retail businesses.**

[![CI](https://github.com/PerezChris99/kampstock/actions/workflows/ci.yml/badge.svg)](https://github.com/PerezChris99/kampstock/actions/workflows/ci.yml)

KampStock is a full-stack business management platform built for the realities of retail and wholesale operations in Uganda: fast point-of-sale workflows, UGX financial records, inventory accountability, customer credit, supplier purchasing, business reporting and unreliable connectivity.

It is engineered as a SaaS product rather than a demo. Stock and financial records remain database-authoritative, tenant boundaries are treated as security boundaries, failed operations are surfaced for recovery, and release quality is enforced through automated CI.

> **Engineering philosophy:** Beautiful on the surface. Solid underneath. Built for production.

## Product scope

| Area | Capability |
|---|---|
| **Point of sale** | Retail and wholesale pricing, payments, receipts, returns and credit sales |
| **Inventory** | Products, units, locations, stock movements, adjustments, transfers, low-stock and expiry tracking |
| **Purchasing** | Suppliers, purchase orders, goods receipts and supplier invoices |
| **Customers & credit** | Customer accounts, credit limits, balances, payment allocation and ageing |
| **Finance & reporting** | Sales summaries, profitability, expenses, stock valuation and management reports |
| **Users & permissions** | Tenant-scoped users, roles and permission policies |
| **SaaS operations** | Tenants, plans, trials, subscriptions, billing and account controls |
| **Offline POS** | IndexedDB-backed pending sales with retry and explicit failed-sale recovery |
| **Audit & observability** | Business audit trails and Sentry integration |

## Architecture

```
┌─────────────────────────────────────────────┐
│              React + Vite SPA               │
│ POS • Inventory • Purchasing • Reports      │
│ React Query • Zustand • PWA • IndexedDB     │
└──────────────────────┬──────────────────────┘
                       │ HTTPS / JSON
                       ▼
┌─────────────────────────────────────────────┐
│                 NestJS API                  │
│ Auth • RBAC • Tenant isolation • Validation │
│ CSRF • CORS • Helmet • Rate limits • Audit  │
│ Caching • Compression • Sentry              │
└──────────────────────┬──────────────────────┘
                       │ Prisma
                       ▼
┌─────────────────────────────────────────────┐
│             PostgreSQL — Production         │
│ Tenants • Users • Stock • Sales • Finance   │
└──────────────────────┬──────────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
           Redis             Pesapal
      shared cache/state      payments
```

**Frontend:** React + Vite  
**API:** NestJS + Express  
**ORM:** Prisma  
**Production database:** PostgreSQL  
**Shared cache/state:** Redis when configured  
**Payments:** Pesapal  
**Observability:** Sentry  
**Browser testing:** Playwright  
**Containerisation:** Docker  
**CI/CD:** GitHub Actions

## Security

KampStock treats tenant isolation as a security boundary.

- Short-lived JWT access tokens with httpOnly browser cookies.
- Refresh-token rotation and token-version revocation.
- Access-token validation checks current token version.
- Logout invalidates the current token family.
- Bcrypt password hashing and generic authentication failures.
- Shared Redis-backed brute-force counters when Redis is configured.
- Tenant-safe persistence of brute-force lock records.
- Global DTO validation with unknown-field rejection.
- CSRF protection for state-changing browser requests.
- Production CORS allow-listing.
- Helmet security headers and HSTS.
- Request body limits and response compression.
- Sanitised global exception responses.
- Tenant-context enforcement and audit logging.

Tenant-scoped uniqueness is enforced in the database where appropriate, including username, SKU, barcode, sale number and offline client references.

## Data integrity and reliability

Financial and stock operations remain database-authoritative.

- Stock and sales workflows use transactions.
- Concurrent stock deductions use database-side conditional updates.
- Sale and purchase-order identifiers are collision-safe.
- Customer balances participate in financial workflows.
- Purchasing validates referenced suppliers/products against the tenant.
- Offline sales retain a client reference for duplicate protection.
- Failed offline synchronisation remains visible for recovery.
- Cache failure degrades to direct database access rather than becoming the source of truth.

## Performance

The application uses:

- Tenant-aware PostgreSQL indexes.
- Status, timestamp and foreign-key indexes.
- Server-side pagination and bounded list endpoints.
- TanStack Query client caching.
- Redis server-side caching where configured.
- HTTP compression.
- Lazy-loaded frontend functionality.
- PWA asset caching.
- IndexedDB offline storage.
- Production-parity PostgreSQL CI testing.

Caching is never authoritative for financial or stock records.

## Offline POS

```
Cashier creates sale
       │
       ├── Online ──► API ──► PostgreSQL ──► receipt
       │
       └── Offline ─► IndexedDB
                         │
                  connection returns
                         │
                         ▼
                    retry sale
                    /                        success       permanent failure
                  │                │
              remove          failed-sales
                                   │
                            manager recovery
```

Offline mode is a resilience mechanism. Failed transactions are retained for review rather than silently discarded.

## Billing and Uganda readiness

KampStock includes Pesapal subscription billing with bounded outbound timeouts, sanitised provider errors, configurable environments, IPN support and transaction-status verification.

Production payment processing still requires real provider credentials, merchant configuration, registered callbacks/IPN endpoints and end-to-end verification.

The application also contains EFRIS-related fiscal structures. Those structures are **not** evidence of URA registration or production certification. EFRIS production use requires the appropriate business registration, credentials, configuration and external verification.

The same principle applies to Mobile Money, SMS, email and other third-party services.

Applicable Ugandan tax, privacy, data-protection, record-retention and other legal requirements must be validated for the actual business before commercial launch.

## Repository layout

```
kampstock/
├── backend/
│   ├── src/
│   │   ├── auth/ users/ products/ stock/ sales/
│   │   ├── purchase-orders/ goods-receipts/
│   │   ├── suppliers/ customers/ expenses/
│   │   ├── reports/ billing/ tenants/
│   │   ├── audit/ health/ cache/ common/
│   ├── prisma/
│   └── prisma-pg/
├── frontend/
│   └── src/
│       ├── components/ layouts/ pages/
│       ├── store/ lib/
├── docs/
└── .github/workflows/
```

## Environment

Production secrets must never be committed.

| Variable | Purpose |
|---|---|
| NODE_ENV | Runtime environment |
| DATABASE_URL | PostgreSQL connection |
| JWT_SECRET | Access-token signing secret |
| JWT_REFRESH_SECRET | Refresh-token signing secret |
| JWT_EXPIRES_IN | Access-token lifetime |
| JWT_REFRESH_EXPIRES_IN | Refresh-token lifetime |
| ALLOWED_ORIGINS | Production frontend allow-list |
| FRONTEND_URL | Frontend origin |
| CSRF_SECRET | CSRF signing secret |
| REDIS_URL | Shared cache/auth state |
| SENTRY_DSN | Error monitoring |
| PESAPAL_ENV | Payment environment |
| PESAPAL_CONSUMER_KEY | Pesapal credential |
| PESAPAL_CONSUMER_SECRET | Pesapal credential |
| PESAPAL_IPN_ID | Registered Pesapal IPN |
| PESAPAL_IPN_URL | IPN endpoint |
| PESAPAL_CALLBACK_URL | Payment callback |

## Development

Requirements:

- Node.js 24+
- npm
- SQLite for lightweight local development
- PostgreSQL for production-parity testing

```bash
cd backend
cp .env.example .env
npm ci
npx prisma generate --schema=./prisma/schema.prisma
npm run start:dev
```

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

The frontend API target is configured with VITE_API_URL.

## CI/CD release gates

The development branch is **perez**. The default and release branch is **main**.

```
perez
  │
  ▼
focused commit
  │
  ▼
GitHub Actions
  │
  ├── Backend quality
  │     ├── lint
  │     ├── TypeScript
  │     └── unit tests
  │
  ├── PostgreSQL production-parity gate
  │     ├── PostgreSQL 16
  │     ├── Prisma generation
  │     ├── schema application
  │     ├── TypeScript
  │     └── backend tests
  │
  ├── Frontend quality
  │     ├── lint
  │     ├── TypeScript
  │     └── production build
  │
  ├── Playwright browser gate
  │     ├── seeded backend
  │     ├── production frontend build
  │     └── Chromium smoke tests
  │
  └── main push
        └── production Docker image builds
```

Browser tests are fail-closed. There is no continue-on-error bypass.

Release discipline:

```
Implement on perez
      ↓
Commit focused change
      ↓
Push perez
      ↓
CI green
      ↓
Pull request → main
      ↓
CI green
      ↓
Merge main
      ↓
Deploy
```

## Database deployment status

Production uses PostgreSQL and has a dedicated PostgreSQL Prisma schema.

The repository does **not yet contain a checked-in Prisma migration history representing the existing production schema**.

That is a genuine release prerequisite, not a documentation detail.

Before production schema changes are managed with prisma migrate deploy, the project needs:

1. An authoritative production schema baseline.
2. A reviewed initial Prisma migration history.
3. Disposable PostgreSQL migration testing.
4. Migration testing against a production-like backup/restore copy.
5. Replacement of deployment-time schema pushing with versioned migration deployment.
6. Documented rollback and recovery procedures.

A development db push is not being represented as a production migration strategy.

## Production-readiness matrix

### Implemented code-level gates

- [x] Multi-tenant application architecture
- [x] Tenant-scoped authentication and authorization
- [x] JWT access and refresh tokens
- [x] Access-token token-version revocation
- [x] Shared Redis authentication counters when configured
- [x] Tenant-safe brute-force lock persistence
- [x] CSRF and CORS protection
- [x] Helmet/HSTS security headers
- [x] Request validation and body-size limits
- [x] Sanitised exception handling
- [x] Transactional stock/sales workflows
- [x] Pagination and major database indexes
- [x] Redis caching infrastructure
- [x] Offline POS recovery
- [x] Pesapal timeout/error hardening
- [x] Backend lint/type/test gates
- [x] Frontend lint/type/build gates
- [x] PostgreSQL production-parity schema gate
- [x] PostgreSQL backend test execution
- [x] Fail-closed Playwright browser gate
- [x] Docker production-image build gate

### Remaining external/operational gates

- [ ] Authoritative production Prisma migration baseline
- [ ] Production migration deployment and rollback exercise
- [ ] Production backup and restore exercise
- [ ] Production payment credentials/callbacks verified
- [ ] EFRIS registration/configuration/certification completed where applicable
- [ ] Representative production load test
- [ ] Live monitoring, alerting and operational runbooks validated
- [ ] Final business/legal compliance review
- [ ] Production DNS, secrets and infrastructure configuration verified

These unchecked items require the actual production environment, external providers, business records or operational procedures. They are not being falsely marked complete from source-code inspection.

## Intellectual property

**Copyright © 2024–2026 KampStock. All rights reserved.**

KampStock is proprietary software. The source code, architecture, database design, application design, documentation, branding and associated intellectual property are protected.

**Use, copying, modification, redistribution, resale, deployment or commercial exploitation requires explicit written permission from the rights holder unless a separate written licence states otherwise.**

See LICENSE for the applicable terms.

## Current position

KampStock has a substantial production-oriented SaaS foundation with multi-tenancy, POS, inventory, purchasing, credit, reporting, offline operation, payment integration, security controls and automated release gates.

It is **not being represented as commercially launched yet**. The remaining migration, backup/restore, external provider, compliance and live-operations gates must be exercised before a real business deployment is declared production-ready.
