# KAMPSTOCK — BRUTAL HONEST SYSTEM AUDIT

**Audit Date:** 2026-06-05  
**Auditor:** Automated deep-codebase analysis  
**Intended Scale:** City-wide multi-tenant SaaS — hundreds to thousands of businesses, Uganda  
**Current Status:** MVP deployed on Vercel + Neon PostgreSQL  

---

## WHAT THIS SYSTEM IS

KampStock is a **multi-tenant, cloud-hosted Point-of-Sale and Inventory Management System** designed to let businesses in a city — shops, pharmacies, supermarkets, wholesalers, restaurants — each run their own isolated store management operations from a single shared platform.

**Core Features Delivered:**
- Product catalog with multi-unit pricing (retail vs wholesale, per-piece vs per-box)
- Real-time inventory tracking across multiple stock locations
- POS sales with payment splitting (cash, mobile money, bank, credit)
- Supplier management, purchase orders, goods receipt, supplier invoice linking
- Customer credit tracking, aging, payment ledger
- Full expense management
- Business intelligence reports (daily sales, profit, stock valuation, KPIs, trends)
- Subscription billing via Pesapal (Uganda's payment processor)
- Multi-tenant registration, isolation, and platform administration
- JWT auth with brute-force protection, CSRF, role-based access control
- Super-admin dashboard: tenant oversight, MRR analytics, account lock management

**Tech Stack:**
- Backend: NestJS 11 + TypeScript + Prisma 7 + PostgreSQL (Neon)
- Frontend: React 19 + Vite + TailwindCSS v4 + TanStack Query
- Deployment: Vercel (both frontend and backend as serverless)
- Auth: JWT httpOnly cookies + CSRF double-submit

---

## VERDICT SUMMARY

| Category | Score | Status |
|---|---|---|
| Architecture | 7/10 | Solid foundations, but city-scale needs more |
| Security | 6/10 | Good basics, critical gaps for 10k+ users |
| Scalability | 3/10 | **Will break under city-wide load** |
| Feature Completeness | 5/10 | Core works, many critical features missing |
| Data Integrity | 7/10 | Mostly solid, a few gaps |
| Observability | 3/10 | Almost flying blind in production |
| Testing | 2/10 | Dangerously undertested |
| Compliance | 2/10 | Uganda regulations not met |
| Deployment Reliability | 4/10 | Serverless has hard limits for this use case |
| Documentation | 3/10 | Developer-level only, no operational runbooks |

**Overall: 4.6/10 — NOT production-ready for city-wide deployment.**  
It is a well-structured MVP. It will work for dozens of small businesses. It will collapse under city-wide load in its current form.

---

## PART 1: WHAT IS ACTUALLY THERE

### ✅ The Good — What Was Built Properly

#### 1. Authentication is Solid for a Small App
- Passwords hashed with bcrypt at cost 12 (properly slow)
- Constant-time comparison even on non-existent users (prevents timing attacks and user enumeration)
- JWT stored in httpOnly cookies (immune to XSS — this is correct, most apps get this wrong)
- Access token 15 minutes, refresh token 7 days — correct window sizes
- Cross-origin cookies use `sameSite=none + secure=true` in production — properly done
- Brute-force protection: 5 failed attempts → 15-minute lockout, tracked per-username AND per-IP

#### 2. Tenant Isolation Is Correct
- Every database query filters by `tenantId`
- Tenant resolved from HTTP header (`X-Tenant-Subdomain`) before any business logic runs
- Backup/restore is tenant-scoped — a restore in Tenant A cannot touch Tenant B's data
- No cross-tenant data leakage was detected in any service

#### 3. Database Schema Is Thoughtful
- 28 models, all with proper indexes on query paths (`tenantId + isActive`, `tenantId + createdAt`)
- Composite unique constraints on business keys (`sku + tenantId`, `saleNumber + tenantId`)
- Cascade deletes on SaleLines, Payments, PurchaseOrderLines (prevents orphaned records)
- `batchNo + expiryDate` on StockItem (supports pharmacy, supermarket, agriculture use cases)
- Price change history tracked automatically on every unit price update

#### 4. RBAC Permissions System Is Well Designed
- Four default roles per tenant: Admin, Manager, Cashier, Storekeeper
- Fine-grained permission flags in role.permissions JSON:
  ```
  manage_products, manage_sales, create_sales, view_reports, manage_stock,
  manage_users, manage_expenses, manage_suppliers, manage_purchase_orders,
  manage_customers, manage_backup, manage_billing
  ```
- Super-admin bypasses all role/permission checks (correct design)
- Guards are registered globally — no route can accidentally skip auth

#### 5. Business Logic Has Some Sophistication
- Concurrent stock deduction handled with `updateMany(qty >= requested)` — if nothing updated, throws conflict error (correct optimistic locking pattern)
- Sales use atomic transactions (stock deduction + payment + audit + notification all in one `$transaction`)
- Purchase orders have a proper status lifecycle: DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED → CANCELLED
- Customer credit tracking with aging report
- Reports cover the real KPIs a business owner needs: daily sales, profit, top products, slow movers, payment breakdown, category performance

#### 6. Security Headers Implemented
- Helmet middleware sets: HSTS, CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, FLoC disabled
- GlobalExceptionFilter never exposes stack traces in production
- All environment secrets validated with Joi on startup

---

## PART 2: WHAT IS KEEPING IT FROM BEING CITY-SCALE

### 🔴 CRITICAL — Will Fail Under Load

---

#### CRITICAL-1: The Backend Cannot Scale Horizontally

**The Problem:**  
Both the brute-force lockout system (`auth.service.ts`) and the tenant subscription lock cache (`tenant-lock.middleware.ts`) store state in Node.js process memory using `Map` objects.

```typescript
// auth.service.ts — in process memory only
private readonly attempts = new Map<string, AttemptRecord>();

// tenant-lock.middleware.ts — in process memory only
const lockCache = new Map<number, { locked: boolean; expiresAt: number }>();
```

Vercel runs multiple serverless instances simultaneously. When Instance A records 4 failed login attempts for a username, Instance B has zero knowledge of those attempts. A bot can bypass the 5-attempt lockout by round-robining across Vercel instances.

Equally, a tenant that just paid and unlocked their account will get `bustLockCache()` called — but that only clears the cache on the one instance that handled the unlock request. Other instances continue blocking the tenant for up to 60 seconds.

**Required Fix:**  
Move all shared state to Redis:
```typescript
// Replace Map with Redis
await redis.incr(`attempts:user:${username}`);
await redis.expire(`attempts:user:${username}`, 900); // 15 min
```

**Impact on city-scale:** At 500 concurrent businesses, Vercel will spin 10–50+ function instances. The security system is functionally bypassed. The lock cache creates a user experience nightmare.

---

#### CRITICAL-2: Vercel Serverless Has a 30-Second Hard Timeout

**The Problem:**  
The backend is deployed as a single Vercel serverless function with `maxDuration: 30`. This means:

- Backup restore for a large tenant (5,000+ products, 50,000+ sales) will time out mid-transaction, leaving the database in a partially restored state
- Complex reports (stock valuation, MRR analytics) that scan large tables will hit the 30s limit and return 500 errors
- A busy day at a large supermarket generates thousands of sales — the nightly report will fail
- Prisma connection management under cold starts adds ~2–3 seconds overhead

**Required Fix:**  
- Move long-running operations to a proper server (Railway, Render, Fly.io) with no timeout
- OR split the backend into function-per-route with appropriate timeouts
- OR implement async job queue (BullMQ) for reports + backup, return job ID, poll for completion

**Impact on city-scale:** A city-scale deployment means thousands of concurrent users. Cold starts, 30s limits, and memory limits (1024 MB shared) will cause cascading failures during peak hours.

---

#### CRITICAL-3: No Redis Cache — Queries Hit DB on Every Request

**The Problem:**  
The `CacheModule` exists and is imported, but no service uses it. Every dashboard load, every report, every notification check hits PostgreSQL directly.

With 500 businesses each with a dashboard that fires 8 parallel queries every 60 seconds:
```
500 businesses × 8 queries × ~1 request/60s = ~67 queries/second sustained baseline
Plus POS sales during business hours: ~200+ queries/second peak
```

Neon PostgreSQL free tier: 10 connections. Paid tier: 100–1,000 connections.

At city scale this exceeds Neon's connection limits within the first hour of a business day.

**Required Fix:**  
- Use the `CacheModule` that already exists
- Cache expensive queries: stock valuation (5 min TTL), reports (2 min), dashboard KPIs (30s)
- Use Prisma's connection pool with proper `connection_limit` and `pool_timeout` in the database URL

---

#### CRITICAL-4: No Background Job Processing

**The Problem:**  
The following operations currently block the HTTP request thread or run fire-and-forget with no retry or failure tracking:

- Audit log writes (`.catch(() => {})` — silently dropped on DB failure)
- Notification generation (`fire-and-forget`)
- Low-stock alert notifications (generated during sale transaction)
- Pesapal IPN polling (synchronous HTTP call inside request handler)
- Email sending — **not implemented at all**

When the DB is under load, audit logs and notifications simply vanish. There is no dead-letter queue, no retry mechanism, no alert.

**Required Fix:**  
Implement BullMQ (Redis-backed) job queue for:
- Audit log writes (critical for compliance)
- Email/SMS notifications
- Report generation
- Pesapal payment status polling

---

#### CRITICAL-5: The Subscription Lock Has a Race Condition

**The Problem:**  
When a tenant's plan expires, `TenantLockMiddleware` blocks all requests with HTTP 402. After payment via Pesapal, `bustLockCache()` is called. But:

1. If Pesapal's IPN callback arrives before the tenant polls for status, the lock is cleared correctly
2. If the tenant polls manually before IPN arrives, they get temporarily unlocked but the DB record isn't updated yet
3. Vercel serverless cold starts can lose the in-memory cache entirely, causing random 402 errors for valid subscriptions

**Impact:**  A paying customer gets locked out of their own account. In Uganda where mobile money payments are common and IPN reliability varies, this will happen regularly.

---

### 🟡 HIGH SEVERITY — Will Cause Problems at Scale

---

#### HIGH-1: Usernames Are Global, Not Per-Tenant

**The Problem:**  
```prisma
model User {
  username String @unique  // GLOBAL unique constraint
```

Username uniqueness is enforced across ALL tenants. If `Nakanda Christine` at Mama Grace Pharmacy registers with username `admin`, then no other tenant on the entire platform can have a user named `admin`. In reality, every small shop will try to use `admin` as their admin username — and they'll all conflict.

**Required Fix:**  
```prisma
@@unique([username, tenantId])
```

This is a **data model bug** that requires a migration. Every existing record needs migration. This should have been caught at design time.

---

#### HIGH-2: No Email System Exists

**The Problem:**  
There is no email service anywhere in the codebase. Not a stub, not a placeholder, not a TODO comment with implementation. This means:

- No password reset by email (only admin can reset)
- No subscription expiry reminders (tenants get locked out with no warning)
- No payment confirmation receipts
- No welcome email on registration
- No onboarding sequence
- No invoice emails to customers

At city scale, support tickets will be overwhelmed by "I forgot my password" and "I didn't know my subscription expired."

**Required Fix:**  
Integrate a transactional email service (SendGrid, Mailgun, or AWS SES) with templates for:
1. Welcome + credentials email on registration
2. Password reset link
3. Subscription expiry reminder (7 days, 3 days, day-of)
4. Payment confirmation
5. Unlock code delivery (backup in case Pesapal redirect fails)

---

#### HIGH-3: Password Reset Requires Admin Intervention

**The Problem:**  
If a user forgets their password:
1. They cannot reset it themselves — there is no self-service password reset
2. Their tenant's Admin must access the admin panel and toggle-active their account, then manually set a new password (which requires a service call)
3. If the Admin themselves forgot their password, they need a super-admin to intervene

At city scale with thousands of users, a significant portion will forget passwords regularly. Each requires human intervention. This does not scale.

**Required Fix:**  
Implement `POST /auth/forgot-password` → email link → `POST /auth/reset-password?token=xxx` flow with time-limited signed tokens (JWT or DB record).

---

#### HIGH-4: No Offline Capability Despite Being Installed as PWA

**The Problem:**  
`vite-plugin-pwa` and `idb` (IndexedDB wrapper) are installed in package.json. The Vite config has a PWA manifest entry. But:
- No service worker caching strategy is configured
- No offline queue for POS sales
- No IndexedDB schema for local product cache
- No sync mechanism for offline transactions

In Uganda, internet connectivity is unreliable. A cashier at a shop that loses connectivity mid-day cannot make any sales. The system is entirely dependent on network availability.

This is the single biggest usability gap for a Ugandan city-scale deployment.

**Required Fix:**  
- Configure Workbox (included in vite-plugin-pwa) with cache strategies:
  - Products: CacheFirst (long TTL)
  - Stock levels: NetworkFirst (medium TTL)
  - Sales: Background sync (queue when offline, flush when online)
- Implement `offlineQueue.ts` that already exists in the codebase but appears empty
- Sync pending sales on reconnect with conflict resolution

---

#### HIGH-5: Uganda Tax Compliance (EFRIS) Not Implemented

**The Problem:**  
The `InvoiceFiscal` model exists in the database:
```prisma
model InvoiceFiscal {
  efrisUid, efrisStatus @default("PENDING"), efrisPayload, responsePayload
}
```

But there is no EFRIS integration anywhere in the service code. All fiscal invoice records stay in `PENDING` status forever.

In Uganda, the Electronic Fiscal Receipting and Invoicing Solution (EFRIS) is **mandatory** for businesses above the VAT threshold. The Uganda Revenue Authority requires all point-of-sale transactions to be reported in real-time. Non-compliance carries penalties.

Any business above the UGX 150 million annual threshold that uses KampStock is technically non-compliant if they rely on it for invoicing.

**Required Fix:**  
Implement EFRIS API integration:
1. Register tenant TIN with URA
2. On each sale, submit fiscal data to EFRIS API
3. Receive fiscal receipt number, embed in invoice PDF
4. Store response payload for audit

---

#### HIGH-6: No Real-Time Notifications

**The Problem:**  
Notifications are stored in the database. The `NotificationBell` component polls every 30–60 seconds. There is no WebSocket, Server-Sent Events, or push notification system.

At city scale:
- Low-stock alerts arrive up to 60 seconds late
- Subscription expiry warnings poll instead of push
- No mobile push notifications (PWA Push API not implemented)
- Admin security alerts (new account lock) require manual refresh

The notification system is a passive polling architecture. For a city with thousands of active users, 60-second polling intervals × 1,000 users = 1,000 extra DB queries per minute on a background process.

**Required Fix:**  
Implement WebSocket (Socket.io or NestJS WebSocketGateway) for real-time events, or Server-Sent Events for simpler unidirectional streaming.

---

#### HIGH-7: Reports Are Unbounded and Can OOM the Server

**The Problem:**  
```typescript
// stock.service.ts — Stock Valuation Report
return this.prisma.stockItem.findMany({
  where: { tenantId },
  include: { product: { include: { units: true } }, location: true }
  // NO TAKE. NO SKIP. Returns ALL stock items.
});
```

A city pharmacy with 15,000 SKUs in 3 locations returns 45,000 records × product relations. This will:
1. OOM the 1024 MB Vercel function
2. Transfer hundreds of MB to the client
3. Freeze the browser tab trying to render 45,000 rows in a table

Same problem exists in `ReportsService.salesTrend()` which fetches all sales in a 30-day window without a limit.

**Required Fix:**  
- Add `take` limits to all report queries
- Implement server-side pagination for all reports
- Add streaming/chunked export for large datasets

---

### 🟠 MEDIUM SEVERITY — Feature Gaps and UX Problems

---

#### MEDIUM-1: No Self-Service Trial-to-Paid Upgrade Flow

The billing page shows subscription plans and integrates Pesapal. But:
- No proration for mid-period upgrades
- No downgrade path (only upgrade)
- No automatic reminder emails (see HIGH-2)
- No grace period after expiry (instant lockout)
- Unlock code is only delivered via Pesapal redirect — if the user closes the browser before redirect, the code is lost
- No SMS delivery of unlock codes
- Recovery requires calling the platform admin manually

---

#### MEDIUM-2: The POS Page Is Unknown

The `POSPage.tsx` file exists but was not accessible for inspection. In a city-scale POS system, the POS is the most critical page — used by cashiers dozens of times per hour. Without inspecting it:
- Unknown: receipt printing support
- Unknown: barcode scanner input handling (keyboard wedge)
- Unknown: thermal printer integration
- Unknown: cash drawer trigger
- Unknown: offline mode
- Unknown: split payment across methods in a single transaction

If the POS is underdeveloped, the entire business case of the system collapses.

---

#### MEDIUM-3: No Barcode/Receipt Printing System

There is no PDF receipt generation for POS sales (only the backup uses jsPDF). There is no:
- 80mm thermal receipt template
- Customer-facing A4 invoice PDF
- Delivery note
- Goods received note (GRN) PDF

For a shop, printing a receipt is the final step of every single transaction. Without this, cashiers have no paper trail and customers have no proof of purchase.

---

#### MEDIUM-4: Multi-Currency Not Supported

All monetary values are stored as `Decimal` without a currency field. The system is hardcoded for UGX. For city-scale deployment in Uganda near borders (DRC, Kenya, Rwanda, South Sudan), border town shops deal in multiple currencies. There is no support for:
- Foreign currency sales
- Exchange rate tracking
- Multi-currency reports

---

#### MEDIUM-5: No Phone Number Validation

```prisma
User.phone        String?     // No format validation
Supplier.phone    String?     // No format validation
Customer.phone    String?     // No format validation
```

Uganda uses +256 prefix. No validation exists at DTO level or DB level. Dirty data will accumulate, making SMS/mobile money integrations impossible later.

---

#### MEDIUM-6: Stock Movements Cannot Be Corrected

If a stock adjustment is entered incorrectly (wrong quantity, wrong product), there is no:
- Edit/void movement capability
- Reversal transaction
- Approval workflow for large adjustments

An admin must manually create a counter-adjustment. For a multi-location warehouse, this creates reconciliation nightmares.

---

#### MEDIUM-7: No User Invitation System

Users are created by Admins who must set and communicate credentials manually. There is no:
- Email invitation with first-login password setup
- Temporary password with forced change on first login
- Self-registration for business staff (controlled by Admin)

The `forcePasswordReset` field exists on the User model but is never checked during login to enforce the reset.

---

#### MEDIUM-8: The `forcePasswordReset` Flag Is Ignored at Login

```typescript
// auth.service.ts — generateTokens()
// Never checks user.forcePasswordReset
```

The super-admin panel has a "Force Password Reset" button that sets `user.forcePasswordReset = true`, but the login flow never checks this flag. The JWT is issued normally. The user is never redirected to a reset page. The feature has no effect.

---

#### MEDIUM-9: No Audit Trail for Data Deletions

Products are soft-deleted (`isActive = false`), but:
- Stock adjustments have no deletion mechanism
- Expenses cannot be voided
- Customer payments cannot be reversed
- The audit log captures updates but doesn't capture what triggered the change (e.g., "deleted by admin from UsersPage" vs "auto-deactivated by system")

For a financial system, every money movement must be auditable and explainable.

---

#### MEDIUM-10: Settings Page Has No Password Change

`SettingsPage.tsx` exists for tenant profile management. But there is no:
- Password change flow for logged-in users
- Profile picture upload
- Two-factor authentication setup
- API key management for third-party integrations

---

### 🔵 LOW SEVERITY — Technical Debt and Quality Issues

---

#### LOW-1: Username Is Global — Must Be Migrated

Already listed under HIGH-1, but worth repeating: the current `@@unique` on username alone will force a breaking migration that affects every existing user in the database when fixed.

---

#### LOW-2: No API Versioning

All routes are `/api/endpoint`. When a breaking change is needed:
- All clients break simultaneously
- No migration path for older frontend versions
- No ability to run v1 and v2 in parallel during rollout

**Required:** `/api/v1/endpoint` namespace from day one.

---

#### LOW-3: No Swagger/OpenAPI Documentation

There are no `@ApiProperty()` decorators, no `@nestjs/swagger` module. Third-party integrations (accounting software, delivery platforms, analytics tools) cannot integrate without reverse-engineering the API from source code.

---

#### LOW-4: Test Coverage Is ~5%

Only 4 test files exist for 31 modules and 100+ service methods:
- `app.controller.spec.ts`
- `auth.service.spec.ts`
- `backup.service.spec.ts`
- `cache.service.spec.ts`

The entire sales flow, stock deduction, concurrent transaction handling, billing lifecycle, tenant isolation, and report generation have **zero tests**. Any refactor or deployment can silently break these.

For a financial system handling real money, this is unacceptable.

---

#### LOW-5: Environment Secrets Have Insecure Defaults

```typescript
// env.validation.ts
CSRF_SECRET: Joi.string().min(32).optional().default('kampstock-csrf-default-secret-change-in-prod-32x'),
```

The CSRF secret has a hardcoded default that is publicly visible in this source code repository. If the production Vercel deployment doesn't explicitly set `CSRF_SECRET`, all instances share this known-weak secret.

Similarly:
- `ALLOWED_ORIGINS` defaults to a Vercel URL that is hardcoded in source
- `FRONTEND_URL` defaults to the production URL in source

**Required Fix:**  
Change all defaults to `undefined`. Force the developer to set them. Never commit defaults for security-critical values.

---

#### LOW-6: The Dual-Schema Setup Is a Maintenance Trap

```
backend/prisma/schema.prisma        — SQLite development schema
backend/prisma-pg/schema.prisma     — PostgreSQL production schema
```

Two schema files must be kept in sync manually. There is no automated test that verifies they are equivalent. When a model is added to one, it's easy to forget the other. The AccountLock model was added to both during this session — but only because it was caught manually.

**Required Fix:**  
Use a single schema file with an environment-based `datasource.provider` field, or use `prisma.config.ts` to conditionally select the provider without duplicating all model definitions.

---

#### LOW-7: Pagination Is Offset-Based — Inefficient at Scale

All endpoints use `skip` + `take` pagination:
```typescript
prisma.sale.findMany({ skip: (page-1)*limit, take: limit })
```

At 1 million sales records, `skip: 999900` forces PostgreSQL to scan and discard 999,900 rows before returning 100. Performance degrades linearly with page depth.

**Required Fix:**  
Implement cursor-based pagination:
```typescript
prisma.sale.findMany({ cursor: { id: lastId }, take: limit, skip: 1 })
```

---

#### LOW-8: No Database Migration History

`prisma db push` was used instead of `prisma migrate dev`. This means:
- No migration history exists
- Rolling back a schema change is manual SQL
- Team members cannot replay changes to set up dev environments
- Vercel production deployments cannot auto-run migrations

**Required Fix:**  
Stop using `prisma db push` in production. Use `prisma migrate deploy` in the build pipeline.

---

#### LOW-9: Load Tests Exist But Are Not in CI

A `load-tests/` directory with k6 scripts exists. But:
- No CI pipeline (no GitHub Actions, no CircleCI)
- Load tests never run automatically
- No performance regression detection
- No definition of "acceptable" response time under load

---

#### LOW-10: Backup Is Manual and Has No Cloud Destination

The backup system exports JSON to the browser. For city-scale:
- 500 tenants × daily backups = 500 manual downloads per day (nobody does this)
- No S3/GCS cloud backup destination
- No scheduled automatic backups
- No retention policy
- No disaster recovery runbook

---

## PART 3: WHAT CITY-SCALE ACTUALLY REQUIRES

A city-wide deployment serving hundreds to thousands of businesses simultaneously is a fundamentally different operational challenge. Here is what is missing vs. what exists:

### Infrastructure Gaps

| Requirement | Current State | Gap |
|---|---|---|
| Horizontal scaling | Single-instance patterns | All in-memory state must move to Redis |
| Zero-downtime deploys | Vercel (auto) | No migration pipeline; DB push is dangerous |
| Background jobs | None | BullMQ queue for reports, emails, notifications |
| Real-time events | 30-60s polling | WebSocket/SSE gateway needed |
| CDN for static assets | Vercel (auto) | ✅ Done |
| Database connection pool | Prisma default (5) | Must configure PgBouncer or connection limit |
| Database read replicas | None | Needed for report queries at scale |
| Object storage (S3) | None | Product images, receipt scans, backup destinations |
| Monitoring / APM | None | Prometheus, Grafana, or Datadog integration |
| Uptime monitoring | None | PagerDuty / Better Uptime |
| Structured logging pipeline | Winston JSON | Need Loki, Papertrail, or CloudWatch |
| Disaster recovery plan | None | RPO/RTO not defined |

### Application Gaps

| Requirement | Current State | Gap |
|---|---|---|
| Self-service password reset | Admin-only | Email-based reset flow needed |
| Offline POS | Not implemented | Service worker + IndexedDB + sync queue |
| Email notifications | Not implemented | Transactional email service |
| SMS/WhatsApp | Not implemented | Twilio / Africa's Talking integration |
| EFRIS tax compliance | Model only, no code | Full URA API integration needed |
| Receipt/invoice PDF | Backup only | POS receipt + customer invoice templates |
| Barcode scanner support | Unknown (POS unread) | Keyboard wedge or USB HID input handling |
| Multi-currency | Not implemented | Exchange rate tracking needed |
| Mobile app | Not implemented | React Native or Flutter shell needed |
| API versioning | Not implemented | `/api/v1/` prefix needed before launch |
| Swagger docs | Not implemented | `@nestjs/swagger` needed for integrations |
| Test coverage | ~5% | Target minimum 80% for financial system |
| Per-tenant username uniqueness | Bug: global unique | Breaking schema migration required |

### Compliance Gaps

| Requirement | Current State | Gap |
|---|---|---|
| EFRIS (Uganda tax) | Model, no code | Full URA integration |
| GDPR (right to erasure) | Soft delete only | User data deletion endpoints |
| GDPR (data export) | Backup exists but incomplete | Personal data export per user |
| PCI DSS | Not applicable (Pesapal handles cards) | ✅ Acceptable |
| Data retention policy | None | 7-year financial record retention |
| Privacy policy enforcement | None | Consent tracking in DB |

---

## PART 4: HONEST TIMELINE ASSESSMENT

For the system to be genuinely city-scale ready, these are the phases that must happen:

### Phase A — Fix the Breaking Bugs (2–3 weeks)
1. Fix global username uniqueness → per-tenant (breaking migration)
2. Move in-memory state (brute-force map, lock cache) to Redis
3. Enforce `forcePasswordReset` flag at login
4. Implement self-service password reset (email)
5. Add `CSRF_SECRET` mandatory env var (remove default)

### Phase B — Reliability Foundation (4–6 weeks)
6. Migrate from `prisma db push` to `prisma migrate` pipeline
7. Move backend to non-serverless host (Railway/Render) for long-running operations
8. Implement BullMQ job queue for reports, emails, audit logs
9. Configure Redis caching for expensive queries
10. Add database connection pooling (PgBouncer)

### Phase C — Missing Core Features (6–8 weeks)
11. Offline POS (service worker, IndexedDB, sync)
12. Email system (SendGrid) with all transactional templates
13. Receipt and invoice PDF generation
14. EFRIS tax compliance integration
15. Barcode scanner + thermal printer support for POS
16. Per-tenant admin settings (taxes, receipt customization)

### Phase D — Scalability (4–6 weeks)
17. WebSocket real-time notifications
18. Cursor-based pagination on all list endpoints
19. Paginate/stream large reports
20. Read replica routing for report queries
21. API versioning (`/api/v1/`)
22. Swagger/OpenAPI documentation

### Phase E — Quality and Operations (4–6 weeks)
23. Test suite: 80% coverage minimum (financial system standard)
24. CI/CD pipeline (GitHub Actions: test → lint → build → deploy)
25. Monitoring dashboard (Prometheus + Grafana)
26. Uptime monitoring with alerting
27. Runbooks for common incidents (DB down, Pesapal outage, bulk unlock)
28. S3/GCS cloud backup with automated daily schedules
29. Mobile push notifications (PWA Push API)
30. Multi-currency support

### Phase F — Compliance and Scale (4 weeks)
31. GDPR data export and deletion endpoints
32. Data retention policy enforcement
33. Privacy policy consent tracking
34. Penetration testing (external, before go-live)
35. Load testing at simulated city-scale (k6 tests that exist, run in CI)

**Total: ~24–29 weeks (6–7 months) of focused engineering before this is genuinely city-scale production-ready.**

---

## PART 5: WHAT WORKS RIGHT NOW

Despite the gaps above, the following genuinely works and is usable today:

1. **A single business can register, set up products, and make sales** — the full happy path works end-to-end
2. **Multi-tenant isolation is correct** — one business cannot see another's data
3. **Auth is secure against common attacks** — brute force, timing attacks, CSRF, XSS all protected
4. **Inventory tracking is real** — stock goes down on sale, goes up on goods receipt, multi-location transfers work
5. **Reports work for small-to-medium datasets** — a shop with <5,000 products and <100,000 sales can use reports without performance issues
6. **The billing system accepts real payments** — Pesapal integration is functional for Ugandan mobile money
7. **The super-admin has meaningful controls** — tenant management, MRR analytics, account lock management
8. **Backup/restore works for disaster recovery** — tenant can export their data and restore it

**This is a functional MVP. It works for 1–50 tenants with moderate data volumes. It is not yet ready for 500+ tenants, city-wide concurrent load, or regulated financial operations.**

---

## PART 6: THE SINGLE BIGGEST RISK

If this system is deployed city-wide tomorrow, the most likely failure scenario is not a security breach or a data loss event. It is **the username uniqueness constraint**.

Every new business that registers and tries to create an admin user named `admin` will get a database unique constraint violation. The first business gets `admin`. The second gets an error. The system appears to be broken.

This will happen on day one of city-wide rollout. It will require an emergency migration while the system is live with real user data. It will take the platform offline.

Fix this first.

```sql
-- Required migration
ALTER TABLE users ADD CONSTRAINT users_username_tenant_unique UNIQUE (username, tenant_id);
ALTER TABLE users DROP CONSTRAINT users_username_key;
```

---

## CONCLUSION

KampStock is a well-architected, correctly designed MVP that shows serious engineering effort. The database schema is thoughtful, the authentication is secure for its scale, and the business logic covers the real needs of Ugandan small businesses.

But "city-wide" is not a feature set — it is an operational scale that requires infrastructure, reliability engineering, compliance work, and offline-first design that simply isn't there yet.

The gap between "works for 50 businesses" and "works for 5,000 businesses in a city" is not 100× more code. It is a completely different class of infrastructure: Redis, background queues, WebSockets, proper database migrations, monitoring, compliance integrations, and offline capability.

None of that is impossible. All of it is standard engineering. None of it is built yet.

**Deploy this for a pilot of 10–20 businesses today. Plan 6 months of focused engineering before city-wide launch.**
