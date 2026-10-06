# KampStock

KampStock is a multi-tenant inventory, point-of-sale, purchasing, customer-credit and business-reporting platform designed for wholesale and retail businesses in Uganda.

It is built around the realities of shop operations: fast POS transactions, barcode-driven product handling, stock control, supplier purchasing, customer credit, multiple payment methods, intermittent connectivity and UGX-denominated business records.

> **Production principle:** beautiful on the surface, solid underneath, built for production.

## Product scope

KampStock provides a single operational system for:

- **POS and sales** — retail/wholesale pricing, payments, receipts, returns and credit sales.
- **Inventory** — products, units, locations, stock movements, adjustments, transfers, low-stock and expiry views.
- **Purchasing** — suppliers, purchase orders, goods receipts and supplier invoices.
- **Customers and credit** — customer accounts, outstanding balances, ageing and payment allocation.
- **Finance and reporting** — sales summaries, profitability, expenses, stock valuation and management reporting.
- **Users and permissions** — tenant-scoped users, roles and permission policies.
- **SaaS operations** — tenants, plans, trials, subscription state, payment processing and account locking.
- **Offline POS** — IndexedDB-backed pending-sale queue with retry and failed-sale recovery.
- **Audit and observability** — mutation audit trails and Sentry integration.

## Architecture

```
┌──────────────────────────────┐
│        React + Vite SPA      │
│  POS • Inventory • Reports   │
│  TanStack Query • Zustand    │
│  PWA / IndexedDB offline     │
└──────────────┬───────────────┘
               │ HTTPS / JSON
               ▼
┌──────────────────────────────┐
│        NestJS REST API       │
│ Auth • RBAC • Tenant guards  │
│ Validation • CSRF • Helmet   │
│ Rate limits • Audit • Sentry │
└──────────────┬───────────────┘
               │ Prisma
               ▼
┌──────────────────────────────┐
│       PostgreSQL (prod)      │
│ Tenants • Users • Stock      │
│ Sales • Purchasing • Finance │
└──────────────┬───────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
      Redis        Pesapal
    cache/state    payments
```

Development can use SQLite through the development Prisma schema. Production is designed around PostgreSQL.

## Repository layout

```
kampstock/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── products/
│   │   ├── stock/
│   │   ├── sales/
│   │   ├── purchase-orders/
│   │   ├── goods-receipts/
│   │   ├── suppliers/
│   │   ├── customers/
│   │   ├── expenses/
│   │   ├── reports/
│   │   ├── billing/
│   │   ├── tenants/
│   │   ├── audit/
│   │   ├── health/
│   │   ├── cache/
│   │   └── common/
│   ├── prisma/
│   └── prisma-pg/
├── frontend/
│   └── src/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       ├── store/
│       └── lib/
├── docs/
└── .github/workflows/
```

## Security model

KampStock treats tenant isolation as a security boundary.

### Authentication

- Short-lived JWT access tokens.
- httpOnly cookies for browser sessions.
- Refresh-token rotation.
- Token-version revocation.
- Logout invalidates the user's current token family.
- Password hashing with bcrypt.
- Generic authentication failure messages to reduce account enumeration.
- Brute-force tracking and throttling.
- Forced password-reset support.

### API protection

- Global DTO validation with whitelisting.
- Unknown request fields are rejected.
- CSRF protection for state-changing browser requests.
- CORS allow-listing in production.
- Helmet security headers.
- HSTS in production.
- Request-body size limits.
- Response compression.
- Global exception sanitisation.
- Rate limiting.
- Tenant context enforcement.

### Tenant isolation

Tenant IDs are attached to authenticated sessions and validated at the application boundary. Sensitive resource lookups and mutations must remain tenant-scoped; IDs from one tenant must never be sufficient to access another tenant's records.

Database uniqueness constraints also include tenant identifiers where appropriate, for example:

`username + tenantId`, `sku + tenantId`, `barcode + tenantId`, and `saleNumber + tenantId`.

## Data integrity

Sales and stock operations use database transactions and atomic stock updates.

Important invariants include:

- A sale cannot consume more stock than is available when negative stock is disabled.
- Concurrent stock deductions use database-side conditional updates.
- Sale numbers and purchase-order numbers are collision-safe.
- Customer balances are updated as part of financial workflows.
- Purchase orders validate referenced suppliers/products against the current tenant.
- Goods receipts validate their purchase order, products and stock location.
- Supplier and customer resources are tenant-scoped.
- Audit records preserve important business mutations.

## Performance strategy

KampStock uses several layers of performance protection:

- PostgreSQL indexes on high-selectivity tenant, status, timestamp and foreign-key paths.
- Bounded list endpoints with server-side pagination.
- TanStack Query client caching.
- Optional Redis server-side caching.
- HTTP compression.
- Lazy loading for heavier reporting/calendar views.
- PWA asset caching.
- IndexedDB offline storage for POS continuity.
- PostgreSQL connection-pool settings appropriate to serverless deployments.

Caching must never become the source of truth for financial or stock data. Business writes remain database-authoritative and cache invalidation is treated as part of the write path.

## Offline POS flow

```
Cashier creates sale
       │
       ├── Online ──► API ──► DB ──► receipt
       │
       └── Offline ─► IndexedDB queue
                         │
                    connection returns
                         │
                         ▼
                  retry queued sale
                    │          │
                  success    permanent error
                    │          │
                 remove     failed-sales
                              │
                         manager review
```

Offline mode is a resilience mechanism, not permission to silently discard failed transactions. A failed synchronization remains visible for recovery.

## Billing

Subscription billing is implemented around Pesapal.

The billing lifecycle is:

```
Select plan
   │
Create merchant reference
   │
Pesapal order
   │
Customer payment
   │
Pesapal IPN
   │
Verify transaction status
   │
Complete subscription
   │
Update tenant entitlement
   │
Unlock tenant
```

Production payment processing requires real Pesapal credentials, a registered IPN endpoint and correctly configured production callback URLs. Those external prerequisites cannot be completed by repository code alone.

## Uganda-specific considerations

KampStock is designed for Ugandan businesses and uses **UGX** as the subscription billing currency.

The application contains fiscal-invoicing structures for EFRIS, but EFRIS production readiness depends on the business's URA registration, credentials, endpoint configuration and successful end-to-end certification. Repository code must not be represented as proof of regulatory registration.

Likewise, Mobile Money and other payment channels require the appropriate provider credentials/contracts where direct integrations are used.

Operational compliance requirements, including applicable data-protection, tax and record-retention obligations, must be validated with the business's professional advisers and relevant Ugandan authorities before commercial launch.

## Environment

Backend configuration is supplied through environment variables. At minimum, production requires:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime environment |
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `JWT_EXPIRES_IN` | Access-token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime |
| `ALLOWED_ORIGINS` | Production frontend allow-list |
| `FRONTEND_URL` | Frontend origin where used |
| `CSRF_SECRET` | CSRF protection secret |
| `REDIS_URL` | Optional shared cache/state backend |
| `PESAPAL_ENV` | Pesapal environment |
| `PESAPAL_CONSUMER_KEY` | Pesapal credential |
| `PESAPAL_CONSUMER_SECRET` | Pesapal credential |
| `PESAPAL_IPN_ID` | Registered Pesapal IPN identifier |
| `PESAPAL_IPN_URL` | Pesapal IPN endpoint |
| `PESAPAL_CALLBACK_URL` | Payment callback |

Never commit real secrets, production database URLs, payment credentials or private keys.

## Local development

### Requirements

- Node.js 20+
- npm
- SQLite for lightweight local development
- PostgreSQL for production-parity integration testing

### Backend

```bash
cd backend
cp .env.example .env
npm ci
npx prisma generate --schema=./prisma/schema.prisma
npm run start:dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

The frontend expects the API base URL through `VITE_API_URL`.

## Testing and CI

The GitHub Actions pipeline is intended to be a **fail-closed release gate**.

```
push / pull request
        │
        ├── Backend
        │    ├── npm ci
        │    ├── Prisma generate
        │    ├── lint
        │    ├── TypeScript
        │    └── unit tests
        │
        ├── Frontend
        │    ├── npm ci
        │    ├── lint
        │    ├── TypeScript
        │    └── production build
        │
        ├── Playwright browser smoke tests
        │
        └── main push
             └── production Docker image builds
```

A failed E2E test is a failed CI run. There is intentionally no `continue-on-error` bypass for browser tests.

Before production release, CI should be supplemented with PostgreSQL integration tests, migration verification, deployment smoke tests and load testing against infrastructure representative of production.

## Deployment

The repository contains deployment support for container/serverless environments. The production architecture must be chosen deliberately rather than running multiple partially configured deployment paths.

For serverless PostgreSQL, use the provider's pooled connection endpoint and conservative connection limits. For a long-running Node service, configure the PostgreSQL pool for the service's actual concurrency.

Production database schema changes should be version-controlled and deployed as migrations. The repository currently contains no checked-in Prisma migration history, so **a production migration baseline remains a release prerequisite** before replacing deployment-time schema pushing with `prisma migrate deploy`.

This is intentionally called out rather than hidden: an empty migration history is not equivalent to a production migration strategy.

## Release workflow

The development branch is `perez`. `main` is the default/release branch.

```
work on perez
    │
    ▼
commit focused change
    │
    ▼
push perez
    │
    ▼
CI
    │
    ▼
pull request → main
    │
    ▼
CI green
    │
    ▼
merge main
    │
    ▼
production deployment
```

Do not bypass CI to force a release.

## Production readiness standard

KampStock should only be called production-ready when all of the following are true:

- [x] Authentication and authorization controls are implemented.
- [x] Tenant-scoped resource access is enforced in critical stock, sales and purchasing flows.
- [x] Request validation and security headers are enabled.
- [x] Financial and stock writes use transactional database operations.
- [x] Pagination and database indexing are present on major list paths.
- [x] Offline POS has explicit failed-sale handling.
- [x] CI has fail-closed frontend/backend quality gates.
- [ ] PostgreSQL integration suite is a mandatory CI gate.
- [ ] Prisma migration history is established and deployed through migrations.
- [ ] Production payment-provider credentials and callbacks are configured and verified.
- [ ] EFRIS production integration is externally registered, configured and certified where required.
- [ ] Production backups and restores have been exercised against the actual deployment.
- [ ] Production load testing has been completed against representative infrastructure.
- [ ] Monitoring, alerting and operational runbooks have been validated in the live environment.

The unchecked items are not claims that the code is broken; they are release/operations prerequisites that cannot honestly be marked complete from source code alone.

## Intellectual property

**Copyright © 2024–2026 KampStock. All rights reserved.**

KampStock is proprietary software. The source code, design, architecture, documentation, branding and associated intellectual property are protected.

**Use, copying, modification, redistribution, resale or deployment requires explicit permission from the rights holder unless a separate written licence states otherwise.**

See [LICENSE](./LICENSE) for the applicable terms.

## Project status

KampStock is an actively developed SaaS product for the Ugandan wholesale and retail market. The repository is engineered toward production use, but operational prerequisites such as external payment credentials, regulatory registrations, production migration baselines, backup exercises and live infrastructure validation must be completed before a commercial production launch.

