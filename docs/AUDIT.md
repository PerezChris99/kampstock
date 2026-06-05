# KampStock — Production Readiness & Citywide Usage Audit

**Audit Date:** 2026-06-05  
**Auditor:** GitHub Copilot (Claude Sonnet 4.6)  
**System HEAD:** commit `b2a9fe7`  
**Target:** citywide multi-tenant SaaS deployment — Uganda

---

## 1. System Overview

**What it is:** Multi-tenant SaaS POS + inventory management system for Ugandan SMBs (pharmacies, supermarkets, hardware stores, general merchandise). Covers the full retail lifecycle: products → stock → POS sales → purchase orders → goods receipts → reporting → billing. Revenue model is Pesapal-integrated UGX subscriptions (Starter 50k / Professional 150k / Enterprise 400k per month).

**Stack:**
```
Frontend  React 19 + Vite + Zustand + TanStack Query + Tailwind v4
          → kampstock-avmu.vercel.app (Vercel static)

Backend   NestJS 11 + Passport/JWT + Prisma 7 (generated client)
          → kampstock-pzmh.vercel.app (Vercel serverless functions)

Database  PostgreSQL via Neon pooler (prod) | SQLite (dev + CI)

Payments  Pesapal v3 API (Uganda — UGX, mobile money + card)

CI        GitHub Actions: lint → tsc → test → docker build → Playwright E2E
```

**Backend modules:** `auth`, `users`, `products`, `stock`, `sales`, `purchase-orders`, `goods-receipts`, `suppliers`, `customers`, `expenses`, `reports`, `billing`, `backup`, `audit`, `notifications`, `tenants`, `super-admin`, `health` — **18 domain modules, 22+ DB models**.

---

## 2. What Is Correctly Implemented

| # | Area | Detail |
|---|------|--------|
| 1 | **httpOnly JWT cookies** | Access token (15 min) + refresh token (7 d), `httpOnly; sameSite; secure` in production. Cookie extractor falls back to Bearer for API clients. |
| 2 | **CSRF protection** | Double-submit cookie pattern via `CsrfMiddleware`. `X-CSRF-Token` fetched from `/auth/csrf` and attached on every state-changing request. Frontend fetches token at boot. |
| 3 | **Helmet security headers** | CSP, HSTS (prod), referrer-policy, x-content-type-options, clickjacking prevention (`frame-ancestors: none`). |
| 4 | **Frontend CSP (vercel.json)** | `connect-src` explicitly lists backend domain (`kampstock-pzmh.vercel.app`). HSTS, X-Frame-Options, nosniff all configured. |
| 5 | **Rate limiting** | Global 200/min + 2000/hr (CustomThrottlerGuard). Login endpoint: 30 req/5 min + 200/hr. Custom 429 message explains temporary nature and auto-reset. |
| 6 | **Brute-force lockout** | 20 consecutive failures → 5-minute lockout. Persisted to `AccountLock` DB table for admin visibility. Cleared on successful login. |
| 7 | **Input validation** | `ValidationPipe(whitelist, forbidNonWhitelisted, transform)` globally. Unknown fields rejected (not silently stripped). All DTOs fully annotated. |
| 8 | **Password policy** | `@MinLength(8)` + must contain uppercase and digit enforced on all user creation. |
| 9 | **Sanitized error responses** | `GlobalExceptionFilter` strips stack traces and Prisma internals in production. All errors return `{ statusCode, message }` only. |
| 10 | **CORS** | Production: `ALLOWED_ORIGINS` env list. Dev: localhost wildcard. `credentials: true`. `allowedHeaders` locked to known set. |
| 11 | **Env validation at startup** | Joi schema in `ConfigModule` — app refuses to start if `DATABASE_URL`, `JWT_SECRET` (≥32 chars), `JWT_REFRESH_SECRET` (≥32 chars) are missing. |
| 12 | **Tenant isolation** | Every query scoped to `tenantId` from JWT payload. `SubdomainTenantMiddleware` resolves tenant from subdomain header with format validation. |
| 13 | **Tenant lock** | `TenantLockMiddleware` gates all routes on subscription status (trial/plan expiry). 60-second in-memory cache prevents per-request DB hammering. |
| 14 | **Role normalization** | `AuthService` strips `_<tenantId>` suffix from role names at JWT issue time (`Admin_1` → `Admin`). Role guards work correctly for all tenants. |
| 15 | **Atomic stock deduction** | `updateMany WHERE quantityOnHand >= needed` — evaluated atomically by the DB inside `$transaction`. `count === 0` → throws before overselling. |
| 16 | **Sale number uniqueness** | `randomBytes(4)` suffix replaces sequential `count+1`. No race condition on concurrent POS. DB unique index enforces at storage layer. |
| 17 | **Transactions** | `$transaction` used in sales creation, goods receipts, stock adjustments, backup restore, billing IPN activation. |
| 18 | **Report queries (no N+1)** | `salesTrend` uses single batch query + JS grouping. `monthlySummary` runs months in parallel (`Promise.all`). `monthlyProfitSummary` uses DB `_sum` aggregate — no full record loads. |
| 19 | **Notification queries (no N+1)** | `checkLowStock` and `checkExpiry` use batch `findMany` + `Set` dedup. Single query per check, not per product. |
| 20 | **IPN idempotency** | `handleIpn` returns early if `sub.status === 'COMPLETED'`. Duplicate Pesapal callbacks do not double-activate subscriptions. |
| 21 | **Backup security** | `passwordHash` excluded from export. Temp passwords issued on restore. MIME + size validated. Tenant-scoped restore: only wipes requesting tenant's data. Checksum verification on v2.0+ files. |
| 22 | **Compression** | gzip via compression middleware — critical for Uganda 3G/4G connections. |
| 23 | **Pagination** | All major list endpoints paginated with `limit/offset`, capped at 500. |
| 24 | **DB indexes** | Composite indexes on `(tenantId, createdAt)`, `(tenantId, status)`, `(productId, changedAt)` and others. |
| 25 | **Audit log** | `AuditService` called on login, sale, stock adjustment, backup, user create/modify. |
| 26 | **Super-admin** | Separate guard (`isSuperAdmin` JWT claim), separate controller, never passes through tenant role guard. |
| 27 | **Offline POS queue** | IndexedDB-backed, `withCredentials` axios, retry-with-backoff, max 5 retries. |
| 28 | **Sentry** | Initialized before NestJS bootstrap, used in `GlobalExceptionFilter` for unexpected errors. |
| 29 | **Structured logging** | Winston with configurable transports. |
| 30 | **CI pipeline** | GitHub Actions: install → Prisma generate → tsc → jest (4 suites, 41 tests) → docker build → Playwright E2E. |

---

## 3. Outstanding Gaps (Blocking Citywide Production)

### 3.1 — SubdomainTenantMiddleware: No Caching
**Severity: HIGH — Performance**

`SubdomainTenantMiddleware` runs on every API request and calls:
```typescript
await this.prisma.tenant.findUnique({ where: { subdomain } });
```
No cache. The analogous `TenantLockMiddleware` already uses a 60-second in-memory `lockCache` Map. At citywide scale (50+ tenants, 500+ concurrent users), this generates 500+ unnecessary DB queries per second purely for tenant name resolution.

**Fix:** Add a `Map<string, { tenant: ..., cachedAt: number }>` with 60s TTL — identical to the existing lockCache pattern.

---

### 3.2 — GoodsReceiptsService.findAll(): No Pagination
**Severity: HIGH — Correctness**

```typescript
async findAll(tenantId?: number) {
  return this.prisma.goodsReceipt.findMany({ where: { tenantId }, include: { lines: true } });
}
```
No `take/skip`. A pharmacy with 3 years of goods receipts can have thousands of records, each with multiple line items. This query will time out or exhaust memory on any real production dataset.

---

### 3.3 — AuditService.findAll(): Hard-Capped at 200, No Cursor
**Severity: MEDIUM — Functional Gap**

```typescript
take: 200,
```
Audit log is hard-capped at 200 rows with no cursor or page-number support. Admins cannot page beyond the most recent 200 events. For compliance-sensitive businesses (pharmacies, financial stores), this is a functional blocker.

---

### 3.4 — Backup Restore: Sequential For-Loop Inserts
**Severity: HIGH — Performance**

`restoreBackup()` uses:
```typescript
for (const entity of data.tables.products) { await tx.product.create({ data: entity }); }
```
for every table. A tenant with 2,000 products + 5,000 stock movements does **7,000+ sequential DB round-trips inside a single transaction**. On Neon with a 30-second statement timeout, this will fail for any tenant with significant data.

**Fix:** Replace `for-await-create` loops with `tx.X.createMany({ data: [...], skipDuplicates: true })` for bulk tables.

---

### 3.5 — Frontend Bundle: No Code Splitting
**Severity: MEDIUM — Performance**

Vite reports: *"Some chunks are larger than 500 kB after minification."* `react-big-calendar` and `date-fns` are bundled into the initial chunk even though calendar pages are rarely visited. On Uganda 3G (~1 Mbps), a 2 MB+ JS bundle takes 15–20 seconds to parse.

**Fix:** `React.lazy` + `Suspense` for `ManagerCalendarPage` and `AdminCalendarPage`. Also lazy-load report-heavy pages that pull in `recharts`.

---

### 3.6 — Input Sanitization: Free-Text Fields
**Severity: MEDIUM — Security (OWASP A03)**

`product.name`, `customer.name`, `supplier.name`, `notes`, `description` are stored verbatim with no HTML/script stripping. `ValidationPipe` validates shape and length but does not sanitize content. If any value is rendered in a PDF export, email, or admin panel without explicit escaping, it is a stored XSS vector.

**Fix:** Apply `@Transform(({ value }) => sanitize(value))` in DTOs to strip `<script>`, `<iframe>`, `javascript:` URIs, and raw HTML tags from all free-text string fields.

---

### 3.7 — Request Body Size: No Limit
**Severity: MEDIUM — DoS / OWASP A05**

No body size limit is configured. A crafted large JSON payload to any endpoint (especially backup restore) can consume server memory and CPU. On Vercel serverless, this can cause function timeouts that affect other tenants.

**Fix:** `app.use(express.json({ limit: '5mb' }))` in `main.ts` before route registration.

---

### 3.8 — Schema: `tenantId @default(1)` Silent Data Pollution
**Severity: MEDIUM — Data Integrity**

Every Prisma model has `tenantId Int @default(1)`. If `SubdomainTenantMiddleware` fails to resolve a tenant (missing header, disabled tenant, misconfigured subdomain), any create operation silently writes to tenant 1 (the first tenant). This can corrupt the primary tenant's data with no error signal.

**Fix:** Add a guard/middleware layer that explicitly rejects `POST`/`PUT`/`PATCH` requests where `tenantId` could not be resolved (returns `400 Bad Request`) rather than defaulting to 1.

---

### 3.9 — Vercel Serverless: No Prisma Connection Limit
**Severity: MEDIUM — Operational**

Prisma default pool size is 10 connections per process. Vercel serverless can run many concurrent instances simultaneously. On Neon free/starter tier (100 connection limit), 10+ concurrent Vercel instances exhaust the pool during traffic spikes, resulting in `P2037: Too many database connections` errors.

**Fix:** Append `?connection_limit=1&pool_timeout=20` to `DATABASE_URL` for the Vercel deployment environment variable.

---

## 4. CI Status

| Suite | Tests | Status |
|-------|-------|--------|
| `cache.service.spec.ts` | 7 | ✅ |
| `app.controller.spec.ts` | 2 | ✅ |
| `auth.service.spec.ts` | 22 | ✅ (fixed this session) |
| `backup.service.spec.ts` | 10 | ✅ |
| **Total** | **41** | **✅ All passing** |

**CI failure root cause (fixed):** `mockPrisma.user` lacked `findFirst`; `mockPrisma.accountLock` was entirely absent. `persistLock()` calls `prisma.user.findFirst` then `prisma.accountLock.create`. Both failed with `TypeError`. Additionally the lockout assertion regex `/Too many failed attempts/` (capital T) did not match the actual message which begins "Login temporarily limited due to too many failed attempts..." (lowercase t).

**Fixes applied:** Added `findFirst: jest.fn().mockResolvedValue(null)` and `accountLock: { create, updateMany }` to the mock. Updated assertion to `/temporarily limited|too many failed attempts/i`.

---

## 5. Implementation Phases — Road to Citywide Production

Each phase is committed to `perez` first, then merged to `main` after all tests pass.

---

### Phase 1 — CI Fix + Subdomain Tenant Caching
**Files:** `auth.service.spec.ts` (done), `subdomain-tenant.middleware.ts`  
**Commit:** `fix(ci+perf): fix auth test mock; cache subdomain tenant resolution`

CI fix already applied this session. Subdomain caching: add 60-second `Map`-based TTL cache to `SubdomainTenantMiddleware` — same pattern as `TenantLockMiddleware.lockCache`.

---

### Phase 2 — Goods Receipts + Audit Log Pagination
**Files:** `goods-receipts.service.ts`, `goods-receipts.controller.ts`, `audit.service.ts`, `audit.controller.ts`  
**Commit:** `feat(api): paginate goods-receipts and audit log endpoints`

Add `limit/offset` query params to `findAll()` in goods receipts. Replace hard `take: 200` in audit with `page + limit` params and return total count metadata.

---

### Phase 3 — Backup Restore: createMany
**Files:** `backup.service.ts`  
**Commit:** `perf(backup): replace sequential for-loop inserts with createMany`

Replace every `for await tx.X.create()` bulk loop with `tx.X.createMany({ data: [...], skipDuplicates: true })`. Roles and users must stay sequential (bcrypt hashing per user). All other tables (categories, products, units, stock locations, stock items, suppliers, customers, PO headers/lines, sales/lines, payments, expenses, audit logs) are safe for `createMany`.

---

### Phase 4 — Frontend Bundle Splitting
**Files:** `frontend/src/App.tsx`, `frontend/src/layouts/AppLayout.tsx`  
**Commit:** `perf(frontend): lazy-load calendar and report pages to cut initial bundle`

Wrap `ManagerCalendarPage`, `AdminCalendarPage`, and heavy report pages in `React.lazy` + `Suspense`. This moves `react-big-calendar` + `date-fns` + `recharts` out of the initial chunk.

---

### Phase 5 — Input Sanitization
**Files:** DTOs + new `sanitize.util.ts`  
**Commit:** `security: strip HTML from free-text DTO fields to prevent stored XSS`

Add a `@Transform` decorator utility that calls a lightweight strip function (no npm dependency needed — regex-based removal of `<script>`, `<iframe>`, `javascript:`, and raw tags) on all freetext string fields across product, customer, supplier, expense, and sale DTOs.

---

### Phase 6 — Request Body Limit + tenantId Null Guard
**Files:** `main.ts`, `subdomain-tenant.middleware.ts` (or new guard)  
**Commit:** `security: add 5MB body limit and block tenantId-less mutations`

1. `app.use(express.json({ limit: '5mb' }))` in `main.ts`.
2. Reject `POST`/`PUT`/`PATCH` requests that reach a business endpoint with `req.subdomainTenantId === undefined` and no JWT-resolved `tenantId`, returning `400 Bad Request: Tenant context could not be resolved`.

---

### Phase 7 — Vercel Connection Pool Config
**Files:** `docs/`, `README.md`, Vercel environment variable (dashboard)  
**Commit:** `ops: document and enforce Prisma connection_limit for Vercel serverless`

Add `?connection_limit=1&pool_timeout=20` to `DATABASE_URL` in the Vercel backend project environment variables. Document the requirement in `README.md` and `.env.production.example`.

---

## 6. Citywide Production Readiness Score

| Category | Current (pre-phases) | After All 7 Phases |
|----------|---------------------|--------------------|
| Security (auth, CSRF, headers, XSS) | 8 / 10 | 10 / 10 |
| Performance (queries, caching, bundle) | 5 / 10 | 9 / 10 |
| Data integrity (transactions, isolation, pagination) | 6 / 10 | 9 / 10 |
| Operational (CI, env validation, logging, monitoring) | 7 / 10 | 9 / 10 |
| **Overall** | **65%** | **~92%** |

**Verdict:** The security foundation is strong. After all 7 phases the system is production-ready for a city-scale single-instance Vercel + Neon deployment. Remaining 8% is Redis-backed rate limiting and Pesapal token state (acceptable trade-offs for a single-instance serverless deployment).

---

## 7. Historical Phase Log

| Phase | Commit | Description |
|-------|--------|-------------|
| Security 1 | `d32b2ba` | Remove passwordHash from backup, MIME validation, login audit, password complexity |
| Security 2 | `46bc134` | Pagination on 7 backend services + 8 frontend pages |
| Security 3 | `cf4d527` | Composite DB index on PriceHistory (productId + changedAt) |
| Security 4 | `01ba85b` | Migrate JWT from localStorage to httpOnly cookies |
| Lint | `3a4ec38` | Prettier formatting in purchase-orders/expenses |
| Rate limit | `b2a9fe7` | Relax admin rate limits, CustomThrottlerGuard, calendar fix, role normalization |
| **Phase 1** | _this session_ | CI test fix (auth spec mock), subdomain tenant caching |
