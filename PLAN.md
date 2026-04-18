# LexAgent — Master Project Plan

> **Last updated:** 2026-04-18 (Session 8)
> **Current phase:** Phase 4 — UI Overhaul Complete, Panel Wiring Next
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
│   │       └── middleware/
│   │           ├── auth.ts        # Supabase JWT validation
│   │           └── ratelimit.ts   # Per-user token bucket
│   └── web/                       # Next.js 15 App Router — Vercel
│       ├── app/
│       │   ├── layout.tsx         # Root layout — fonts, AppProviders
│       │   ├── page.tsx           # → redirect /dashboard
│       │   ├── (auth)/login/      # Login / sign-up page
│       │   └── (app)/
│       │       ├── layout.tsx     # Auth-guarded shell + MattersProvider
│       │       ├── dashboard/     # Matter cards, stats overview
│       │       ├── matters/[id]/  # Matter shell + 11 URL-routed tabs
│       │       └── admin/         # 7-tab settings page
│       ├── components/
│       │   ├── layout/            # Sidebar (collapsible), TopBar (mobile)
│       │   ├── panels/            # PanelShell + per-tab panel components
│       │   └── shared/            # LexTooltip, NewMatterModal
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
│       │   └── matters-provider.tsx
│       └── styles/globals.css     # Lex Viridian tokens + Tailwind v4
├── supabase/
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_rls.sql
└── PLAN.md
```

### LLM Waterfall
```
Groq → Cerebras → SambaNova → OpenRouter → NVIDIA → xAI → Mistral → Gemini → Gemini-2 → Anthropic
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

### Supabase Schema
| Table | Purpose |
|---|---|
| `profiles` | One row per user — auto-created on sign-up via trigger |
| `matters` | Legal matters/cases — synced from app on every save |
| `documents` | Vault docs and drafts linked to matters |
| `logs` | Activity log per user/matter |
| `usage_events` | Token usage tracking for billing and quota enforcement |

RLS enabled on all tables — users can only read/write their own rows.

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
- [x] Mobile-responsive TopBar with slide-in drawer (no @radix-ui/react-sheet needed — built on dialog)
- [x] Auth-guarded app shell — client-side redirect to `/login`, MattersProvider scoped to app routes
- [x] URL-based matter tab routing — `/matters/[id]/research`, browser back/forward works
- [x] Dashboard: stats row, matter cards with badges, search + status filters, empty state
- [x] Matter shell: header with case info, 11 scrollable tabs with tooltips
- [x] Research panel: full AI chat interface with streaming indicators, keyboard shortcut (Enter)
- [x] 7-tab Admin: Firm Profile (letterhead, practice areas, bar credentials), UI Preferences (toggle switches), API Keys, Model Config, Hallucination Shield, System Prompt, Telemetry
- [x] Global tooltip system via `TooltipSettingsProvider` — disable in Admin → UI Preferences
- [x] NewMatterModal — title, client, case type, jurisdiction, facts
- [x] Zero TypeScript errors, clean `next build`
- [x] Committed and pushed (5444c0a)

### 🔄 Phase 5 — Panel Wiring & Business Logic (Active)

#### ❌ Wire remaining tab stubs to API
Currently these tabs show "coming soon" — need to port logic from old `LexAgent.jsx`:
- **Deep Research** — port multi-source search (Congress, eCFR, EDGAR, USPTO, OpenStates)
- **Vault** — port PDF upload + analysis (pdfjs-dist already in deps)
- **Strategy** — port structured strategy generation
- **Judge Intel** — port CourtListener judge profile lookup
- **Deadlines** — port SOL calculator + deadline list
- **Timeline** — port timeline builder
- **Citations (Shield)** — port `extractCitations` + CourtListener verifier
- **Draft** — port document drafting with print/export
- **Evidence/Notes** — port notes + evidence log
- **Conflict** — port conflict-of-interest checker

#### ❌ Resolve Vercel env vars for NEXT_PUBLIC_* prefix
- Old vars were `VITE_*`, now need `NEXT_PUBLIC_*`
- Update Vercel project env vars: rename `VITE_API_URL` → `NEXT_PUBLIC_API_URL`, `VITE_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Trigger clean redeploy after env var rename

#### ❌ Delete old Vite files
Once Vercel deploy confirmed working:
- Delete `apps/web/vite.config.ts`
- Delete `apps/web/index.html`
- Delete `apps/web/src/` (old monolithic component)
- Delete `apps/web/tsconfig.app.json`, `apps/web/tsconfig.node.json`

### 📋 Phase 6 — Enterprise Features (Planned)

#### User roles, permissions, packages
- `user_roles` table — user_id, role (free | pro | admin), package (starter | professional | enterprise)
- `subscriptions` table — user_id, stripe_customer_id, plan, status, current_period_end
- Expose role via `useAuth()` hook
- Gate features in UI based on role

#### Stripe billing integration
- Stripe webhooks → update `subscriptions` table on payment events
- Per-seat licensing + usage limits enforced server-side in `middleware/ratelimit.ts`

#### Admin dashboard
- Supabase Studio for early-stage admin (free, already available)
- Custom dashboard at `admin.agent0.co.za` once usage patterns are clear

---

## Known Issues & Technical Debt

| Issue | Severity | Status |
|---|---|---|
| Vercel env vars need renaming VITE_* → NEXT_PUBLIC_* | HIGH | 🔄 Do next deploy |
| 9 tab stubs showing "coming soon" | HIGH | Phase 5 |
| Old `src/` + Vite files still in repo | MEDIUM | Delete after Vercel confirmed |
| Render free tier cold starts (~30s after 15min idle) | LOW | Phase 6 — keep-alive ping or upgrade |
| No error boundaries | LOW | Phase 6 |
| No automated tests | LOW | Phase 6 |

---

## Session Notes

### 2026-04-18 — Session 8
Major UI overhaul: Vite → Next.js 15, Lex Viridian design system.
- `next.config.ts` + `postcss.config.mjs` — Next.js 15 + Tailwind v4 configured
- `tsconfig.json` rewritten for App Router with `@/*` path alias, old `src/` excluded
- `styles/globals.css` — full Lex Viridian design token set + keyframes + utility classes
- `lib/settings.ts` — AppSettings interface (incl. FirmProfile + UIPreferences), TABS config (11 tabs with tooltips), CASE_TYPES, JURISDICTIONS, PRACTICE_AREAS
- `lib/auth.tsx`, `lib/api.ts`, `lib/supabase.ts`, `lib/db.ts`, `lib/storage.ts` — ported with `NEXT_PUBLIC_*` env vars
- `providers/` — SettingsProvider, TooltipSettingsProvider, MattersProvider, AppProviders
- `app/layout.tsx` — root layout with Google Fonts, AppProviders
- `app/(auth)/login/page.tsx` — premium login with emerald radial glow, Google OAuth
- `app/(app)/layout.tsx` — auth-guarded shell with useRouter redirect
- `components/layout/Sidebar.tsx` — collapsible, firm logo, matter list, user row
- `components/layout/TopBar.tsx` — mobile header with slide-in drawer
- `components/shared/LexTooltip.tsx` — @radix-ui tooltip, respects TooltipSettingsProvider
- `components/shared/NewMatterModal.tsx` — create matter modal
- `components/panels/PanelShell.tsx` — reusable panel wrapper
- `app/(app)/dashboard/page.tsx` — stats, matter cards, search/filter
- `app/(app)/matters/[id]/layout.tsx` — matter shell with 11 tabs (useParams, not props)
- `app/(app)/matters/[id]/research/page.tsx` — full AI chat panel
- `app/(app)/matters/[id]/{deep-research,vault,strategy,judge,deadlines,timeline,citations,draft,notes,conflict}/page.tsx` — stubs
- `app/(app)/admin/page.tsx` — 7-tab settings page
- TypeScript: 0 errors. Next.js build: 0 errors.
- Committed: 5444c0a — 40 files, 3082 insertions

### 2026-04-18 — Session 7
- Supabase project created: org = agent0, ref = nildwhegvjbrnrpaqkto
- `db.ts` — full Supabase CRUD for matters
- `LexAgent.jsx` wired to Supabase with localStorage migration on first login
- Auth gate debug: Vercel env var injection unreliable in pnpm monorepo — fixed by hardcoding public keys in `supabase.ts`
- Vercel-Supabase integration connected (supabase-carmine-curtain, VITE_ prefix)

### 2026-04-17 — Session 6
- RAG pre-fetch implemented — databases queried before AI call
- Admin telemetry system — live API ping tests with latency
- Anthropic key admin section — user-provided key, browser-only
- Document panel upgraded — inline editing, summarize mode, result history, print/export
- Production confirmed live: Vercel + Render both responding

### 2026-04-16 — Session 5
- 9-provider LLM waterfall implemented (Groq first, Anthropic last)
- Both builds verified clean, deployed to Vercel + Render

### 2026-04-14 — Sessions 1–4
- Full competitor analysis (Harvey AI, CoCounsel, Lexis+AI)
- Phase 2 UI overhaul complete
- Phase 3 infrastructure scaffolded (monorepo, Vite, Hono, Supabase schema)

---

*This document is updated at the end of every working session. Future developers: read this before touching any code.*
