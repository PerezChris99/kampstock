# KampStock — System Audit Log

Each entry is a point-in-time audit. Newer audits appear at the top.

---

## Audit — 2026-06-02

### What It Is

A **multi-tenant SaaS POS/inventory management system** built for Ugandan SMBs (pharmacies, supermarkets, hardware stores, etc.). It handles the full retail lifecycle: products → stock → POS sales → purchase orders → receipts → reports → billing. Revenue model is Pesapal-integrated SaaS subscriptions (UGX, starter/professional/enterprise).

---

### Architecture

```
Frontend (Vite/React 19 + Zustand + TanStack Query + Tailwind v4)
    ↓ REST + httpOnly cookies
Backend (NestJS 11 + Passport/JWT + Prisma 7)
    ↓ ORM
Database: SQLite (dev)  /  PostgreSQL (prod via DATABASE_URL)
Payment: Pesapal v3 API (Uganda)
```

**Module inventory (backend):** `auth`, `users`, `products`, `stock`, `sales`, `purchase-orders`, `goods-receipts`, `suppliers`, `customers`, `expenses`, `reports`, `billing`, `backup`, `audit`, `notifications`, `tenants`, `super-admin`, `health` — 18 domain modules.

**DB models:** 22 entities across 3 schemas (SQLite dev, PG prod, PG migrations).

---

### Bugs Fixed This Session

All three reported errors were **Prettier formatting violations**, not runtime bugs:

| File | Error | Fix |
|------|-------|-----|
| `purchase-orders.controller.ts` | Inline imports, inline params, no trailing commas | Multi-line everything + trailing commas |
| `expenses.controller.ts` | Inline create/getTotals params | Multi-line + trailing commas |
| `expenses.service.ts` | Inline array, inline signature, `async` with no `await` on `getCategories`, inline `reduce` | Multi-line all of it; removed `async` |

The `async` on `getCategories` was the only functional concern — it added a microtask tick for no reason. Now it is a plain synchronous method.

---

### ✅ What Is Done Right

- **httpOnly cookies** — JWT auth migrated off localStorage (Phase 4). Access + refresh tokens are `httpOnly; sameSite; secure` in production. Cookie extractor falls back to Bearer for API clients.
- **Helmet** — CSP, HSTS (prod), referrer-policy, x-content-type-options, no-sniff, clickjacking prevention all configured.
- **Rate limiting** — `ThrottlerGuard` globally; login tightened to 6/5 min (prod) at controller + per-username lockout in `AuthService`. Brute-force tracking is in-memory (acceptable for single-instance).
- **Input validation** — `ValidationPipe(whitelist: true, forbidNonWhitelisted: true)` globally. All DTOs annotated.
- **Password policy** — `@MinLength(8) + @Matches(/[A-Z].*[0-9]/)` for `CreateUserDto`.
- **Sanitised error responses** — `GlobalExceptionFilter` strips stack traces in production.
- **CORS** — `credentials: true`, `allowedHeaders` locked, dev-only localhost bypass.
- **Pagination** — all list endpoints paginated with `limit/offset`, capped at 500.
- **DB indexes** — composite indexes on high-query paths (`tenantId + createdAt`, `tenantId + status`, `productId + changedAt`, etc.).
- **Audit log** — `AuditService` used at create/update/login/backup/stock adjustment.
- **Tenant isolation** — every query scoped to `tenantId` from JWT. `SubdomainTenantMiddleware` validates subdomain format.
- **Tenant lock** — `TenantLockMiddleware` gates all routes on subscription status; 60-second cache to avoid hammering DB.
- **Transactions** — `$transaction` used correctly in sales creation, goods receipts, stock adjustments, billing IPN.
- **Backup security** — `passwordHash` excluded from export; temp passwords issued on restore; MIME + size validated.
- **Compression** — `gzip` via compression middleware (important for Uganda mobile connections).
- **Pesapal** — token caching (30 s buffer), IPN ID memoisation, both sandbox and live URLs, proper error surfacing.
- **Super-admin** — separate guard (`isSuperAdmin` from JWT), separate controller, never goes through role-based guard.
- **Offline POS queue** — IndexedDB-backed, uses `withCredentials` axios (Phase 4), retry-with-backoff, max 5 retries.

---

### 🚨 Critical Gaps (Not Production-Ready)

**1. No CSRF protection** *(high severity)*
`X-CSRF-Token` is in `allowedHeaders` but there is no CSRF token generation, no double-submit cookie, nothing. With `httpOnly + sameSite: lax`, CSRF is partially mitigated on modern browsers, but state-changing GET endpoints (billing IPN uses GET) and same-site subdomain scenarios are still risks. Needs either the `csurf` double-submit pattern or `sameSite: strict` in production.

**2. PesapalService token/IPN state is singleton in-memory** *(high severity for multi-instance)*
`this.tokenCache` and `this.ipnId` live in the service instance. On any multi-instance deployment (Render auto-scale, ECS, K8s) every instance races to register the IPN and has its own token. This will cause IPN misses and duplicate subscriptions.

**3. Auth brute-force tracker is in-memory** *(medium severity)*
`AuthService.attempts` is a `Map` on the process. A restart clears all lockouts. On a load-balanced deployment, an attacker can hit different instances. Needs Redis or DB-backed counter.

**4. Backup restore is destructive with no confirmation** *(medium severity)*
`restoreBackup()` wipes the entire database (`deleteMany` on every table) then re-inserts. There is no confirmation step, no dry-run, no row-count preview. One wrong upload destroys all tenant data with no recovery path.

**5. Backup restore does not scope to `tenantId`** *(medium severity)*
Deletes ALL roles, ALL users, ALL products across ALL tenants, not just the requesting tenant's data. In multi-tenant mode this is catastrophic.

**6. `salesTrend` N+1 query loop** *(performance critical)*
`reports.service.ts → salesTrend()` runs a `findMany` inside a `for` loop — up to 30 sequential DB queries for a 30-day trend. Identical for `monthlySummary` (up to 6 sequential `monthlyProfitSummary` calls, each with 2 queries).

**7. `monthlyProfitSummary` loads all sale lines into memory** *(performance critical)*
Fetches all sales `include: { lines: true }` for the month, then does JS `reduce` for revenue/COGS. On a busy tenant with 10,000 sales/month this is an OOM risk. Should use `_sum` aggregate.

**8. No input sanitisation on free-text fields** *(medium / OWASP A03)*
`product.name`, `customer.name`, `supplier.name`, `notes`, `description` are stored verbatim. There is no HTML/script stripping. If any of these ever render in an email, PDF, or web view without escaping, it is stored XSS.

**9. `checkLowStock` and `checkExpiry` have N+1 patterns** *(performance)*
`NotificationsService.checkLowStock()` fetches ALL stock items for the tenant, then for each one below reorder level runs another `findFirst` to check for an existing notification. On 1,000 SKUs that is up to 1,000 extra queries per sale.

**10. No environment variable validation at startup** *(operational)*
`JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `PESAPAL_CONSUMER_KEY` etc. are accessed with `config.get()` with silent fallbacks. On misconfigured deployments the app starts and silently uses `'fallback-secret'` for JWTs or crashes mid-request. Needs a startup guard (e.g. `Joi` schema validation in `ConfigModule`).

**11. `tenantId` defaults to `1` everywhere in schema** *(data integrity risk)*
Every model has `tenantId Int @default(1)`. If a request arrives without a resolved tenant (e.g. misconfigured subdomain header), all data is silently written to tenant 1. There is no NOT NULL enforcement at the application boundary — `tenantId` should be required at creation.

**12. Role name mismatch — authorization is broken for tenant users** *(CRITICAL — auth bypass)*
`TenantsService` creates roles named `Admin_${tenant.id}`, `Manager_${tenant.id}`, etc. But `RolesGuard` checks `user.role === 'Admin'` (exact string). The JWT payload carries `role: user.role.name` which is `Admin_1`. This means **every role-protected endpoint silently denies or allows incorrectly for all tenant users**. This is a critical authorisation gap that must be fixed before production.

**13. `GoodsReceiptsService.findAll()` has no pagination** *(performance)*
Returns all goods receipts for a tenant with no `take/skip`.

**14. `AuditService.findAll()` is hard-capped at 200 rows, no cursor pagination** *(functional)*
Audit log API returns max 200 rows with no cursor/page support, though the method signature accepts entity filters.

---

### Bottlenecks

| Bottleneck | Location | Impact |
|-----------|----------|--------|
| N+1 salesTrend loop | `reports.service.ts → salesTrend()` | 30 queries per render, sequential |
| N+1 monthlySummary loop | `reports.service.ts → monthlySummary()` | 12 queries per render, sequential |
| All-rows monthlyProfit | `monthlyProfitSummary()` — `include: { lines: true }` | Loads entire month's sale lines into JS heap |
| N+1 low-stock notification | `notifications.service.ts → checkLowStock()` | Up to 1,000 queries per sale |
| No pagination on goods-receipts | `goods-receipts.service.ts → findAll()` | Full table scan on busy tenant |
| Sequential backup restore | `backup.service.ts` — `for` loop with `await tx.X.create()` | 1 insert per row: 10,000 products = 10,000 round-trips |
| SubdomainTenantMiddleware DB hit every request | `subdomain-tenant.middleware.ts` | No caching — every request queries `tenants` table |
| PO number generation race | `purchase-orders.service.ts → generatePoNumber()` — `count + 1` | Concurrent creates can produce duplicate PO numbers |
| Sale number generation race | `sales.service.ts → generateSaleNumber()` | Same race condition |
| Stock deduction outside atomic lock | `sales.service.ts` — `findFirst` then `update` on stock | Read-modify-write not atomic; concurrent sales can oversell even with `allowNegativeStock=false` |

---

### Verdict

**Not yet production-ready — approximately 70–75% there.** The security foundation is solid (httpOnly cookies, helmet, rate limiting, input validation, sanitised errors, CORS, tenant isolation). What blocks production:

1. **Role name mismatch** (`Admin_1` vs `'Admin'`) — authorization is broken for all tenant users ← fix first
2. **CSRF** — needs double-submit or `sameSite: strict`
3. **Backup multi-tenant wipe** — disaster waiting to happen
4. **Env var validation at startup** — silent fallback to `'fallback-secret'` in production
5. **Report query loops** — will time out on any real dataset
6. **Stock deduction race** — overselling possible under concurrent POS load

Fix those six things and it is shippable for a single-instance deployment.

---

### Completed Security Phases (as of this audit)

| Phase | Commit | Description |
|-------|--------|-------------|
| Phase 1 | `d32b2ba` | Remove passwordHash from backup, MIME validation, login audit, password complexity |
| Phase 2 | `46bc134` | Pagination on 7 backend services + 8 frontend pages |
| Phase 3 | `cf4d527` | Composite DB index on PriceHistory (`productId + changedAt`) |
| Phase 4 | `01ba85b` | Migrate JWT tokens from localStorage to httpOnly cookies |
| Lint fix | `3a4ec38` | Prettier formatting errors in purchase-orders/expenses controllers + service |
