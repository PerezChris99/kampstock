# KampStock — SaaS Subscription Plan

## Overview

KampStock is a cloud-hosted wholesale & retail management system offered to businesses (shops, supermarkets, distributors) as a monthly subscription. Each business gets an isolated tenant environment. Multi-tenancy is already architected in the schema (`Tenant` model + `tenantId` foreign key ready to be added to core models).

---

## Pricing Tiers

| Feature | Starter | Business | Enterprise |
|---|---|---|---|
| **Price (USD/month)** | $15 | $35 | $80 |
| **Price (UGX est.)** | ~55,000 | ~128,000 | ~290,000 |
| **Users** | Up to 3 | Up to 10 | Unlimited |
| **Stock Locations** | 1 | 3 | Unlimited |
| **Products** | 500 | 5,000 | Unlimited |
| **Sales History** | 6 months | 2 years | Unlimited |
| **Reports** | Basic | Full | Full + Custom |
| **Barcode Scanning** | ✅ | ✅ | ✅ |
| **PWA / Offline POS** | ✅ | ✅ | ✅ |
| **Purchase Orders** | ✅ | ✅ | ✅ |
| **Multi-location** | ❌ | ✅ | ✅ |
| **Goods Receipts** | ❌ | ✅ | ✅ |
| **Supplier Invoices** | ❌ | ✅ | ✅ |
| **Expense Tracking** | ✅ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ✅ |
| **Custom Branding** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ✅ | ✅ (SLA) |
| **Data Export (CSV/PDF)** | ✅ | ✅ | ✅ |
| **Trial Period** | 30 days free | 30 days free | 30 days free |

---

## Trial

- All new tenants get **30 days free** on the Business tier
- No credit card required for trial
- Automatic downgrade to Starter if no payment after trial
- Trial data is preserved

---

## Billing

### Payment Methods (Uganda focus)
- MTN Mobile Money (primary)
- Airtel Money
- Visa/Mastercard (via Flutterwave or DPO Group)
- Bank transfer (Enterprise only)

### Billing Cycle
- Monthly or Annual (annual = 2 months free)
- Invoices issued on subscription renewal date
- Grace period: 5 days after due date before service restriction
- After 30 days unpaid: read-only mode (no new sales/purchases)

### Stripe Integration (International)
```typescript
// Planned: backend/src/billing/billing.service.ts
// - stripe.subscriptions.create({ customer, price: PLAN_PRICE_ID, trial_period_days: 30 })
// - Webhook handler for: invoice.paid, customer.subscription.deleted, payment_intent.payment_failed
```

### Flutterwave Integration (Uganda/Africa)
```typescript
// Planned: backend/src/billing/flutterwave.service.ts
// - Mobile Money recurring billing via Flutterwave Subscription API
// - Webhook: charge.completed, subscription.cancelled
```

---

## Multi-Tenancy Implementation

### Current State
- `Tenant` model exists in `schema.prisma`
- JWT payload includes `userId` and `roleId`

### Required Changes for Full Multi-Tenancy

1. **Schema**: Add `tenantId Int` to all core models (User, Product, Sale, Customer, Supplier, PurchaseOrder, StockItem, Expense, etc.)
2. **Auth**: Include `tenantId` in JWT payload
3. **Global Filter Middleware**: Inject `tenantId` filter on every Prisma query via `PrismaService` context
4. **Tenant Isolation**: Each API request scoped to `WHERE tenantId = :tenantId`
5. **Tenant Registration**: `/api/tenants/register` public endpoint for signup
6. **Admin Portal**: Separate super-admin portal for managing tenants, billing, usage

### Database Strategy
- **Option A (Current Dev)**: Single database, all tenants share tables with `tenantId` column — simpler, cheaper
- **Option B (Production Enterprise)**: Separate SQLite/PostgreSQL database per tenant — maximum isolation
- **Recommended**: Option A for Starter/Business, Option B for Enterprise

---

## Onboarding Flow

```
1. Business owner visits kampstock.app
2. Clicks "Start Free Trial"
3. Enters: Business Name, Owner Name, Email, Phone, Password
4. Receives verification email/SMS
5. Tenant created → redirected to setup wizard:
   a. Set business type (retail/wholesale/both)
   b. Add first stock location
   c. Add first 5 products (or import CSV)
   d. Invite team members (optional)
6. Dashboard unlocked — 30-day trial begins
```

---

## Feature Flags (Per Tier)

```typescript
// backend/src/config/feature-flags.ts (planned)
export const TIER_FEATURES = {
  starter:    { multiLocation: false, purchaseOrders: true, maxUsers: 3,  maxProducts: 500  },
  business:   { multiLocation: true,  purchaseOrders: true, maxUsers: 10, maxProducts: 5000 },
  enterprise: { multiLocation: true,  purchaseOrders: true, maxUsers: -1, maxProducts: -1   },
};
```

---

## Hiring Out to Businesses

### Target Market
- Small-medium shops and supermarkets in Uganda/East Africa
- Wholesale distributors (beverages, food, FMCG)
- Schools (canteen/bookshop management)
- Hardware stores

### Sales Channels
1. **Direct sales**: In-person demos to shop owners
2. **WhatsApp marketing**: Short video demos + pricing
3. **Reseller program**: Local IT support persons earn 20% commission per client they onboard
4. **Google Ads**: Target "stock management software Uganda"
5. **Referral**: Current tenants get 1 free month per referral

### Competitive Advantage
- Works **offline** (no internet required at POS)
- **Mobile-first** PWA — works on any Android phone/tablet
- **UGX pricing** — no forex confusion
- **Local support** — WhatsApp + phone
- **Data stays local** (SQLite mode for fully offline deployment)

---

## Fully Offline Deployment (No Internet Required)

For businesses in areas with unreliable internet, KampStock can be deployed as a **local server**:

1. Install Node.js + KampStock backend on a local Windows/Linux PC
2. All staff connect via WiFi to the local server (LAN)
3. Frontend served from same machine
4. No cloud subscription needed — one-time license fee: **$150 / UGX 550,000**
5. Annual maintenance: **$40 / UGX 145,000**

This model competes with legacy offline POS systems while being more modern and maintainable.

---

## Revenue Projections

| Scenario | Clients | Avg Plan | Monthly Revenue |
|---|---|---|---|
| MVP (6 months) | 20 | Starter $15 | $300/mo |
| Growth (1 year) | 100 | Business $35 | $3,500/mo |
| Scale (2 years) | 500 | Mix ~$30 avg | $15,000/mo |

---

## Roadmap for SaaS Launch

- [ ] Implement `tenantId` on all models
- [ ] Build tenant registration + onboarding wizard
- [ ] Integrate Flutterwave Mobile Money recurring billing
- [ ] Build super-admin portal (tenant management, usage, billing)
- [ ] Add CSV product import
- [ ] Add receipt printing (thermal printer via WebUSB/Bluetooth)
- [ ] Mobile app wrapper (Capacitor.js → Android APK)
- [ ] WhatsApp OTP for passwordless login
- [ ] Multi-currency support (UGX, KES, TZS, USD)
