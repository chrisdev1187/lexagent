# LexAgent — Master Project Plan

> **Last updated:** 2026-04-18 (Session 10)
> **Current phase:** Phase 6 — Monetisation & Admin (Active)
> **Status:** Fully deployed — Vercel (Next.js 15) + Render backend + Supabase DB + 10 API integrations live

---

## Production URLs

| Service | URL |
|---|---|
| Frontend | https://lexagent-ochre.vercel.app |
| API | https://lexagent-0o5u.onrender.com |
| GitHub | https://github.com/chrisdev1187/lexagent |
| Supabase | https://nildwhegvjbrnrpaqkto.supabase.co |

---

## Current System Architecture

```
lexagent/
├── apps/
│   ├── api/                       # Hono backend (Node) — Render
│   │   └── src/
│   │       ├── index.ts           # Entrypoint, all routes mounted
│   │       ├── routes/            # One file per external API
│   │       │   ├── billing.ts     # Lemon Squeezy checkout, webhooks, portal
│   │       │   └── region.ts      # IP → region/currency detection
│   │       └── middleware/
│   │           ├── auth.ts        # Supabase JWT validation
│   │           ├── ratelimit.ts   # Per-user token bucket
│   │           └── quota.ts       # Budget check + usage logging
│   └── web/                       # Next.js 15 App Router — Vercel
│       ├── app/
│       │   ├── layout.tsx         # Root layout — fonts, AppProviders
│       │   ├── page.tsx           # → redirect /dashboard
│       │   ├── (auth)/login/      # Login / sign-up page
│       │   ├── (marketing)/
│       │   │   └── pricing/       # Public pricing page with regional currency
│       │   └── (app)/
│       │       ├── layout.tsx     # Auth-guarded shell + MattersProvider
│       │       ├── dashboard/     # Matter cards, stats overview
│       │       ├── matters/[id]/  # Matter shell + 11 URL-routed tabs
│       │       ├── settings/
│       │       │   ├── profile/   # Usage stats, plan status, BYOK key
│       │       │   ├── billing/   # Upgrade, portal, invoices
│       │       │   └── api-key/   # BYOK Anthropic key management
│       │       └── admin/         # 7-tab settings + full user management
│       ├── components/
│       │   ├── layout/            # Sidebar (collapsible), TopBar (mobile)
│       │   ├── panels/            # PanelShell + per-tab panel components
│       │   └── shared/            # LexTooltip, NewMatterModal, UsagePill
│       ├── lib/
│       │   ├── api.ts             # API proxy URLs + auth header injection
│       │   ├── auth.tsx           # AuthProvider + useAuth hook
│       │   ├── supabase.ts        # Supabase browser client
│       │   ├── db.ts              # Supabase CRUD — matters persistence
│       │   ├── storage.ts         # localStorage wrapper (demo/fallback)
│       │   └── settings.ts        # AppSettings type, defaults, TABS config
│       ├── providers/
│       │   ├── index.tsx          # AppProviders composition
│       │   ├── settings-provider.tsx
│       │   ├── tooltip-provider.tsx
│       │   ├── matters-provider.tsx
│       │   └── region-provider.tsx  # IP → {region, currency, symbol, locale}
│       └── styles/globals.css     # Lex Viridian tokens + Tailwind v4
├── supabase/
│   └── migrations/
│       ├── 001_init.sql
│       ├── 002_rls.sql
│       └── 003_monetisation.sql   # plans, subscriptions, usage_events, user_roles
├── scripts/
│   └── seed-admin.ts              # Seed plans + create 2 admin accounts
└── PLAN.md
```

### LLM Stack (Session 9 Decision)
All tiers use **Claude Sonnet 4.6** (latest, most capable). Higher tiers get larger monthly USD budget, not a different model.

```
Primary: claude-sonnet-4-6   (all tiers)
Fallback: claude-haiku-4-5   (budget exhausted — rate-limited tier only)
```

### Lex Viridian Design System
```
--bg:           #0A0F0D    (near-black, green undertone)
--surface:      #111A16
--panel:        #152018
--emerald:      #10B981    (primary accent)
--gold:         #F59E0B    (secondary — verified, premium)
--text:         #ECFDF5
--text-muted:   #3D5248
```
Fonts: Playfair Display (serif) · Inter (sans) · JetBrains Mono (mono)

---

## Pricing & Monetisation (Session 9)

### Payment Provider: Lemon Squeezy
- Acts as **Merchant of Record** — handles all VAT/tax compliance globally
- No SA business registration required
- Fees: **5% + $0.50/transaction**
- Webhook events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_payment_success`

### Subscription Tiers

| | Starter | Professional | Firm | Premium |
|---|---|---|---|---|
| **ZAR/seat/mo** | R800 | R1,600 | R3,500 | Custom |
| **GBP/seat/mo** | £35 | £75 | £160 | £2,000 |
| **USD/seat/mo** | $45 | $95 | $200 | $2,000 |
| **Anthropic budget/mo** | $8 | $20 | $35 | $150 |
| **Seats** | 1 | 1–3 | 1–10 | Unlimited |
| **Matter limit (total)** | 10 | 25 | 60 | Unlimited |
| **Model** | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 | Sonnet 4.6 |
| **Features** | Core tools | + Strategy, Judge Intel | + Conflict check, Timeline | + Custom dev, dedicated support |
| **Support** | Email | Priority email | Slack | Personal (CEO-level) |

**Premium notes:**
- Max 1 new premium client/month (due to custom dev workload)
- Leads go to `premium_leads` table → manual qualification call

### Unit Economics (Professional, R1,600/seat)
```
Revenue:          R1,600  (~$88)
Anthropic API:   -R364   (-$20)
Infrastructure:  -R100   (~5% share at 100 users — Supabase/Render/Vercel/email)
Salary alloc:    -R180   (R180k/yr ÷ 1,000 users)
Marketing:       -R80    (5% CAC amortised)
Legal/accounting:-R40
Lemon Squeezy:   -R51    (5% + $0.50)
                 ────────
Net margin:      ~R785/seat/mo  (~49%)
```

### Regional Pricing Detection
- Vercel header `x-vercel-ip-country` → `{ region, currency, symbol, locale }`
- `ZA` → ZAR, `R`, `en-ZA`
- `GB` → GBP, `£`, `en-GB`
- `US` / default → USD, `$`, `en-US`
- UI uses `Intl.NumberFormat` with detected locale + currency

### Anthropic API Resale Model
LexAgent buys Anthropic API wholesale, gives users a monthly USD budget:
- Usage tracked from Anthropic response `usage` object (`input_tokens`, `output_tokens`)
- Cost calculated: input × $3/1M + output × $15/1M (Sonnet 4.6 rates)
- Per-tool events logged: `tool_name`, `model`, `input_tokens`, `output_tokens`, `estimated_usd_cost`

### Budget Throttle Logic
| Budget Used | Behaviour |
|---|---|
| < 80% | Full access |
| 80–100% | Warning banner shown |
| 100% | Rate-limited: 1 request per 5 minutes |
| > 110% | Soft block — upgrade prompt shown |

### BYOK Mode (Bring Your Own Key)
- Users can store their own encrypted Anthropic API key in their profile
- LexAgent proxies with their key — no metering charged against their plan budget
- Key encrypted at rest in Supabase (AES-256, server-side)

---

## Supabase Schema (Session 9 — 003_monetisation.sql)

### New tables added to existing schema:

| Table | Purpose |
|---|---|
| `plans` | Static plan definitions (4 rows: starter/professional/firm/premium) |
| `subscriptions` | Per-user: lemon_squeezy_id, plan_id, status, period_end, seats, usd_budget |
| `usage_events` | Per-AI-call log: user_id, tool_name, model, input_tokens, output_tokens, usd_cost |
| `usage_monthly` | Monthly rollup: user_id, year, month, total_usd_cost (updated by trigger) |
| `user_roles` | user_id, role (user \| admin), plan_id |
| `premium_leads` | Lead capture for Premium demo requests |

### Admin Accounts
```
drwillybum@gmail.com         role=admin, plan=premium
christiaanbothma47@gmail.com role=admin, plan=premium
```
Seeded via `supabase/migrations/seed_admins.sql` (pure SQL, paste into Supabase editor).

### Matter Limits
- Starter: 10 matters max
- Professional: 25 matters max
- Firm: 60 matters total across all seats
- Premium: unlimited
- Enforcement: API layer in `quota.ts` (DB trigger approach abandoned — Supabase SQL editor cannot handle PL/pgSQL DECLARE blocks)

---

## Phase Roadmap

### ✅ Phase 1 — Analysis & Planning (Complete: 2026-04-14)
- [x] Full codebase audit, competitor analysis, architecture documentation

### ✅ Phase 2 — Demo UI Overhaul (Complete: 2026-04-14)
- [x] Enterprise-grade UI: sidebar, dashboard, onboarding wizard, research panel, drafting, judge intel
- [x] ARES v5 branding, dark theme, color system, typography

### ✅ Phase 3 — Production Infrastructure (Complete: 2026-04-17)
- [x] pnpm monorepo (Vite + React 18 + Hono backend)
- [x] 9-provider free LLM waterfall
- [x] 10 legal API integrations proxied through backend
- [x] Supabase schema — 5 tables + RLS policies
- [x] AuthProvider + login screen (email/password + Google OAuth)

### ✅ Phase 3.5 — System Hardening (Complete: 2026-04-18)
- [x] RAG pre-fetch live — databases queried BEFORE AI call, results injected as context
- [x] Admin telemetry — live API ping tests with latency
- [x] Anthropic key admin section — user-provided key, browser-only
- [x] Document panel — inline editing, summarize mode, result history, print/export
- [x] Supabase persistence — matters sync to cloud on every save
- [x] localStorage migration — on first login, local matters batch-upserted to Supabase

### ✅ Phase 4 — Premium UI Overhaul (Complete: 2026-04-18)
- [x] Migrate Vite + React 18 → **Next.js 15 App Router + React 19**
- [x] **Lex Viridian** design system — Tailwind v4, @radix-ui primitives, CSS variables
- [x] Fonts: Playfair Display + Inter + JetBrains Mono via `next/font/google`
- [x] Collapsible sidebar (240px / 52px icon mode) with firm logo, matter list, status dots
- [x] Mobile-responsive TopBar with slide-in drawer
- [x] Auth-guarded app shell — client-side redirect to `/login`, MattersProvider scoped to app routes
- [x] URL-based matter tab routing — `/matters/[id]/research`, browser back/forward works
- [x] Dashboard: stats row, matter cards with badges, search + status filters, empty state
- [x] Matter shell: header with case info, 11 scrollable tabs with tooltips
- [x] Research panel: full AI chat interface with streaming indicators, keyboard shortcut (Enter)
- [x] 7-tab Admin: Firm Profile, UI Preferences, API Keys, Model Config, Hallucination Shield, System Prompt, Telemetry
- [x] Global tooltip system via `TooltipSettingsProvider`
- [x] NewMatterModal — title, client, case type, jurisdiction, facts
- [x] Zero TypeScript errors, clean `next build`
- [x] Committed and pushed (5444c0a)

### ✅ Phase 4.5 — Deployment Fixes (Complete: 2026-04-18)
- [x] Regenerated `pnpm-lock.yaml` after Vite→Next.js migration (was causing `ERR_PNPM_OUTDATED_LOCKFILE`)
- [x] Fixed `apps/web/vercel.json` — removed Vite SPA rewrites, set `{"framework": "nextjs"}`
- [x] Fixed `apps/web/.gitignore` — added `.next/`, `node_modules/`, `*.tsbuildinfo`
- [x] Connected Vercel web project to GitHub for auto-deploy
- [x] Committed: 41ed814 (lockfile), 9858c7f (vercel.json)

### 🔄 Phase 5 — Panel Wiring & Business Logic (Deferred to Phase 7)
Tab stubs wired to "coming soon" — will be activated after monetisation is live:
- Deep Research, Vault, Strategy, Judge Intel, Deadlines, Timeline, Citations, Draft, Notes, Conflict

### 🔄 Phase 6 — Monetisation & Admin (Active — Session 10)

#### 6.1 — Database Migration
- [x] `supabase/migrations/003_monetisation.sql` — run successfully in Supabase
  - `plans` table (4 rows seeded)
  - `subscriptions` table + RLS
  - `usage_events` table (replaces thin 001 version) + RLS
  - `usage_monthly` table + rollup trigger
  - `user_roles` table + auto-create trigger on sign-up + RLS
  - `premium_leads` table + RLS

#### 6.2 — Seed Script
- [x] `supabase/migrations/seed_admins.sql` — both admin accounts created in Supabase auth
  - `drwillybum@gmail.com` → admin / premium
  - `christiaanbothma47@gmail.com` → admin / premium

#### 6.3 — API Quota Middleware
- [ ] `apps/api/src/middleware/quota.ts`
  - Check `usage_monthly` against plan budget before forwarding
  - Log `usage_events` row after each AI call
  - Return 429 with throttle info when budget exceeded

#### 6.4 — Billing API Routes
- [ ] `apps/api/src/routes/billing.ts`
  - `POST /api/billing/checkout` — create Lemon Squeezy checkout session
  - `POST /api/billing/webhook` — handle LS events → update `subscriptions`
  - `GET /api/billing/portal` — customer portal URL
  - `POST /api/billing/premium-lead` — save lead to `premium_leads`

#### 6.5 — Region Detection
- [ ] `apps/api/src/routes/region.ts` — `GET /api/region` → `{region, currency, symbol, locale}`
- [ ] `apps/web/providers/region-provider.tsx` — fetch on mount, expose via `useRegion()`

#### 6.6 — Public Pricing Page
- [ ] `apps/web/app/(marketing)/pricing/page.tsx`
  - 4-tier comparison table
  - Dynamic currency via `useRegion()`
  - Lemon Squeezy checkout CTA per plan
  - Premium "Book a Demo" form → `POST /api/billing/premium-lead`

#### 6.7 — User Profile & Settings
- [ ] `apps/web/app/(app)/settings/profile/page.tsx`
  - Plan badge, usage bar (current month USD spent / budget)
  - Per-tool usage breakdown chart
  - Account status (active/overdue/cancelled)
- [ ] `apps/web/app/(app)/settings/billing/page.tsx`
  - Current plan, next billing date
  - Upgrade/downgrade CTA → checkout
  - "Manage Billing" → Lemon Squeezy portal
- [ ] `apps/web/app/(app)/settings/api-key/page.tsx`
  - BYOK Anthropic key entry, encrypt + store in Supabase
  - Toggle BYOK on/off

#### 6.8 — Admin User Dashboard
- [ ] Extend `apps/web/app/(app)/admin/page.tsx` with "Users" tab
  - Table: all users, plan, usage%, matters count, status, last active
  - Drill-down: full profile, usage history, subscription events
  - Actions: change plan, suspend, reset password
  - Powered by `Kiranism/next-shadcn-dashboard-starter` patterns

#### 6.9 — Usage Pill in TopBar
- [ ] `apps/web/components/shared/UsagePill.tsx`
  - Shows `$X.XX / $Y.00` for current month
  - Colour: green < 80%, amber 80–100%, red > 100%
  - Renders in TopBar beside user avatar

#### 6.10 — Env Vars
- [ ] Add to Vercel + Render:
  - `LEMON_SQUEEZY_API_KEY`
  - `LEMON_SQUEEZY_STORE_ID`
  - `LEMON_SQUEEZY_WEBHOOK_SECRET`
  - `LEMON_SQUEEZY_VARIANT_IDS` (JSON: starter/pro/firm variant IDs)
  - `ANTHROPIC_API_KEY` (server-side — for proxied calls)

### 📋 Phase 7 — Panel Wiring (Planned)
Wire all 10 stub tabs to live AI + API calls.

### 📋 Phase 8 — Scale & Hardening (Planned)
- Render keep-alive ping (eliminate 30s cold starts)
- Error boundaries
- Automated test suite
- Monitoring / alerting

---

## Known Issues & Technical Debt

| Issue | Severity | Status |
|---|---|---|
| Vercel env vars need renaming VITE_* → NEXT_PUBLIC_* | HIGH | Do on next deploy |
| 10 tab stubs showing "coming soon" | HIGH | Phase 7 |
| Render free tier cold starts (~30s after 15min idle) | LOW | Phase 8 |
| No error boundaries | LOW | Phase 8 |
| No automated tests | LOW | Phase 8 |

---

## Session Notes

### 2026-04-18 — Session 10
Phase 6 DB setup complete. Supabase SQL editor cannot handle PL/pgSQL `DECLARE` blocks — it splits `$$`-delimited bodies and resolves variable names as table references. All PL/pgSQL functions in 003 were rewritten to avoid `DECLARE` variables; matter-limit enforcement moved to API layer. Admin seed script rewritten as pure SQL (no PL/pgSQL). Both admin accounts live in Supabase auth.

**Next:** 6.3 quota.ts middleware → 6.4 billing routes → 6.5 region detection. Lemon Squeezy variant IDs on hold (pending LS account verification).

---

### 2026-04-18 — Session 9
Monetisation system designed and documented. Deployment fixes shipped.

**Deployment fixes:**
- `pnpm-lock.yaml` regenerated (41ed814) — was blocking every Vercel CI build since Session 8
- `apps/web/vercel.json` fixed (9858c7f) — removed Vite SPA rewrites that broke Next.js routing
- `apps/web/.gitignore` updated — `.next/` was being staged for commit
- Vercel web project manually connected to GitHub in dashboard

**Monetisation decisions:**
- Payment provider: **Lemon Squeezy** (Stripe requires SA registered business)
- 4 tiers: Starter / Professional / Firm / Premium
- Regional pricing: ZAR (primary), GBP, USD — auto-detected from `x-vercel-ip-country`
- All tiers use **Claude Sonnet 4.6** — higher tiers get larger USD monthly budget
- Anthropic API resold at margin: Starter $8/mo, Pro $20, Firm $35, Premium $150
- Per-tool usage logged: `tool_name`, `model`, `input_tokens`, `output_tokens`, `usd_cost`
- Budget throttle: <80% full, 80–100% warn, 100% rate-limit, >110% soft-block
- BYOK mode: users bring own Anthropic key → no metering charged
- Matter limits hard-enforced: 10 / 25 / 60 / unlimited
- Admin accounts: drwillybum@gmail.com + christiaanbothma47@gmail.com
- Admin dashboard: extends existing 7-tab admin with full user management table
- Max 1 Premium client/month (custom dev workload constraint)

**Competitive pricing research conducted:**
- Harvey AI (enterprise-only, $200k+ ARR), CoCounsel ($300-500/user/mo), Lexis+AI ($150/user/mo), Westlaw AI ($200/user/mo), Clio Duo ($49 add-on), CaseText ($99/mo)
- LexAgent positioned as premium but accessible — SA market anchor, global expansion ready

### 2026-04-18 — Session 8
Major UI overhaul: Vite → Next.js 15, Lex Viridian design system.
- `next.config.ts` + `postcss.config.mjs` — Next.js 15 + Tailwind v4 configured
- Full App Router structure — 40 files, 3082 insertions, committed 5444c0a

### 2026-04-18 — Session 7
- Supabase project created: org = agent0, ref = nildwhegvjbrnrpaqkto
- `db.ts` — full Supabase CRUD for matters
- Auth gate debug: fixed with hardcoded public keys in `supabase.ts`

### 2026-04-17 — Session 6
- RAG pre-fetch implemented — databases queried before AI call
- Admin telemetry, Anthropic key admin, document panel upgrades

### 2026-04-16 — Session 5
- 9-provider LLM waterfall implemented (Groq first, Anthropic last)

### 2026-04-14 — Sessions 1–4
- Full competitor analysis (Harvey AI, CoCounsel, Lexis+AI)
- Phase 2 UI overhaul + Phase 3 infrastructure

---

*This document is updated at the end of every working session. Future developers: read this before touching any code.*
