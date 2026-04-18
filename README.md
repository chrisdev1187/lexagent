# LexAgent — AI Legal Practice Platform

> **ARES** (Advanced Research & Evidence System) — Harvey AI competitor built on a 9-provider free LLM waterfall, 10 live legal databases, real-time Hallucination Shield, and full Supabase auth with cloud persistence.

**Live:** https://lexagent-ochre.vercel.app  
**API:** https://lexagent-0o5u.onrender.com  
**GitHub:** https://github.com/chrisdev1187/lexagent

---

## What It Does

- AI-powered legal research across 10 authoritative databases (CourtListener, SEC EDGAR, USPTO, eCFR, Congress.gov, GovInfo, Regulations.gov, OpenStates)
- RAG pre-fetch — databases are queried BEFORE the AI call; real results injected as context (anti-hallucination)
- Hallucination Shield — every citation verified against CourtListener in real-time, tagged [DB]/[WEB]/[MEM]
- Judge intelligence profiling (16,000+ federal and state judges)
- Legal document drafting with inline editing and print/export
- Document vault — multi-PDF upload, AI analysis, summarize, compare, extract
- SOL calculator, case timeline, conflict checker, billing tracker
- Firm Profile + letterhead settings for generated documents
- Zero API cost in normal operation — 9-provider free LLM waterfall

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | **Next.js 15** App Router + React 19, deployed on Vercel |
| Design System | **Lex Viridian** — Tailwind v4 + @radix-ui primitives, emerald `#10B981` on near-black `#0A0F0D` |
| Fonts | Playfair Display (serif) · Inter (sans) · JetBrains Mono (mono) |
| Icons | lucide-react |
| Backend | Hono (Node), deployed on Render |
| Monorepo | pnpm workspaces |
| Auth | Supabase — email/password + Google OAuth, JWT session tokens |
| Database | Supabase Postgres — matters, documents, logs, usage_events |
| LLM | 9-provider waterfall: Groq → Cerebras → SambaNova → OpenRouter → NVIDIA → xAI → Mistral → Gemini × 2 |
| Paid fallback | Anthropic Claude (user-provided key in Admin → API Keys) |

---

## Quickstart (Local Dev)

```bash
# 1. Install
pnpm install

# 2. Configure backend
cp apps/api/.env.example apps/api/.env
# Add at minimum: GROQ_API_KEY (free at console.groq.com)

# 3. Configure frontend
cp apps/web/.env.example apps/web/.env.local
# Set: NEXT_PUBLIC_API_URL=http://localhost:8080
# Optional: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY for auth

# 4. Run
pnpm --filter api dev    # API on :8080
pnpm --filter web dev    # Web on :3000
```

The app runs without Supabase — auth gate redirects to `/login`, all storage falls back to localStorage (demo mode).

---

## Environment Variables

### `apps/api/.env` (never committed)

```bash
# ── LLM Providers ────────────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...               # console.groq.com (free)
# CEREBRAS_API_KEY=csk-...         # cloud.cerebras.ai (free)
# SAMBANOVA_API_KEY=...            # cloud.sambanova.ai (free)
# OPENROUTER_API_KEY=sk-or-...     # openrouter.ai (free tier)
# NVIDIA_API_KEY=nvapi-...         # integrate.api.nvidia.com (free)
# XAI_API_KEY=xai-...              # console.x.ai (free tier)
# MISTRAL_API_KEY=...              # console.mistral.ai (free tier)
# GEMINI_API_KEY=AIza...           # aistudio.google.com (free)
# GEMINI_API_KEY_2=AIza...         # second account for rotation
# ANTHROPIC_API_KEY=sk-ant-...     # paid fallback only

# ── Legal Database APIs ────────────────────────────────────────────────────────
# COURTLISTENER_TOKEN=...          # courtlistener.com/register (free)
# DATA_GOV_KEY=...                 # api.data.gov/signup (free) — covers GovInfo + Congress + Regulations
# OPENSTATES_KEY=...               # openstates.org/accounts/signup (free)

# ── Supabase (required for auth + cloud persistence) ──────────────────────────
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_KEY=your-service-role-key   # NOT the anon key

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,https://lexagent-ochre.vercel.app
```

### `apps/web/.env.local` (never committed)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080

# Supabase — enables auth gate and cloud matter persistence
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Database Schema (Supabase)

Tables in `supabase/migrations/`:

| Table | Purpose |
|---|---|
| `profiles` | One row per user — auto-created on sign-up via trigger |
| `matters` | Legal matters/cases — synced from app on every save |
| `documents` | Vault docs and drafts linked to matters |
| `logs` | Activity log per user/matter |
| `usage_events` | Token usage tracking for billing and quota enforcement |

RLS enabled on all tables — users can only read/write their own rows.

---

## Auth Flow

1. User visits app → redirected to `/login`
2. User signs up with email → Supabase sends confirmation email
3. User clicks confirmation link → account activated, redirected to `/dashboard`
4. Supabase issues JWT → stored in browser, injected into API calls via `Authorization: Bearer`
5. Render backend validates JWT on every request via `middleware/auth.ts`
6. Matters load from Supabase; any localStorage-only matters migrated to cloud on first login

Without Supabase env vars: app redirects to `/login`, runs in demo mode with localStorage only.

---

## API Integrations

All external API calls proxied through the Hono backend. Secrets never reach the browser.

| Route | External API | Key | Data |
|---|---|---|---|
| `/api/anthropic` | 9-provider LLM waterfall | Server env | AI completions |
| `/api/courtlistener` | courtlistener.com | `COURTLISTENER_TOKEN` (opt) | 9M opinions, 16K judges |
| `/api/govinfo` | api.govinfo.gov | `DATA_GOV_KEY` | US Code, CFR, Federal Register |
| `/api/congress` | api.congress.gov | `DATA_GOV_KEY` | Bills, amendments, voting records |
| `/api/regulations` | api.regulations.gov | `DATA_GOV_KEY` | Federal rulemaking, agency dockets |
| `/api/ecfr` | ecfr.gov | None | Live Code of Federal Regulations |
| `/api/edgar` | sec.gov / efts.sec.gov | None | Corporate filings: 10-K, 10-Q, 8-K |
| `/api/uspto` | api.patentsview.org | None | Patent full-text, IP research |
| `/api/openstates` | v3.openstates.org | `OPENSTATES_KEY` | 50-state legislation |

---

## LLM Waterfall

```
Groq → Cerebras → SambaNova → OpenRouter → NVIDIA → xAI → Mistral → Gemini → Gemini-2 → Anthropic
```

Skips any provider without a key. On rate-limit (429) falls to next. Returns first success. Preferred-provider routing: user's chosen model sorted first, auto-falls back.

---

## Project Structure

```
lexagent/
├── apps/
│   ├── api/                       # Hono backend (Node) — Render
│   │   └── src/
│   │       ├── index.ts           # Entrypoint, all routes mounted
│   │       ├── routes/            # One file per external API
│   │       │   ├── anthropic.ts   # 9-provider LLM waterfall
│   │       │   ├── courtlistener.ts
│   │       │   ├── govinfo.ts
│   │       │   ├── congress.ts
│   │       │   ├── ecfr.ts
│   │       │   ├── regulations.ts
│   │       │   ├── edgar.ts
│   │       │   ├── uspto.ts
│   │       │   └── openstates.ts
│   │       └── middleware/
│   │           ├── auth.ts        # Supabase JWT validation
│   │           └── ratelimit.ts   # Per-user token bucket
│   └── web/                       # Next.js 15 App Router — Vercel
│       ├── app/
│       │   ├── layout.tsx         # Root — fonts, providers
│       │   ├── page.tsx           # → redirect /dashboard
│       │   ├── (auth)/login/      # Login / sign-up page
│       │   └── (app)/
│       │       ├── layout.tsx     # Auth-guarded shell (sidebar + topbar)
│       │       ├── dashboard/     # Matter cards, stats, search
│       │       ├── matters/[id]/  # Per-matter shell + 11 tab pages
│       │       └── admin/         # Settings (7-tab admin page)
│       ├── components/
│       │   ├── layout/            # Sidebar, TopBar
│       │   ├── panels/            # PanelShell + per-tab panels
│       │   └── shared/            # LexTooltip, NewMatterModal
│       ├── lib/
│       │   ├── api.ts             # Proxy base URLs + auth header injection
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
│       └── styles/globals.css     # Lex Viridian design tokens + Tailwind v4
├── supabase/
│   └── migrations/
│       ├── 001_init.sql           # Tables + triggers
│       └── 002_rls.sql            # Row Level Security policies
├── render.yaml                    # Render one-click deploy config
├── PLAN.md                        # Internal dev roadmap
└── README.md
```

---

## Deployment

### Backend → Render

1. Connect GitHub repo at render.com
2. Service: **Web Service**, Root: `apps/api`, Build: `pnpm install && pnpm build`, Start: `node dist/index.js`
3. Required env vars: `GROQ_API_KEY`, `ALLOWED_ORIGINS`
4. For auth: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
5. Or use `render.yaml` for one-click deploy

### Frontend → Vercel

1. Import repo at vercel.com — auto-deploys on every push to master
2. Root Directory: `apps/web`
3. Framework: **Next.js** (auto-detected)
4. Required: `NEXT_PUBLIC_API_URL=https://lexagent-0o5u.onrender.com`
5. For auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Database → Supabase

1. Create project at supabase.com
2. Run `supabase/migrations/001_init.sql` in SQL Editor
3. Run `supabase/migrations/002_rls.sql` in SQL Editor
4. Authentication → URL Configuration → set Site URL + Redirect URLs to your Vercel domain

---

## Feature Overview

| Tab | Feature |
|---|---|
| Research | AI chat + RAG pre-fetch from 8 databases + citation verify |
| Deep Research | Multi-source research: Congress, eCFR, EDGAR, USPTO, OpenStates |
| Vault | Multi-PDF upload, AI analysis, summarize/compare/extract modes |
| Strategy | AI-generated case strategy with argument strength analysis |
| Judge Intel | Live judge profiles — biography, career, ABA ratings, ruling tendencies |
| Deadlines | Statute of limitations calculator + deadline tracking |
| Timeline | Case event timeline builder |
| Shield | Hallucination audit — every citation classified Verified / Unconfirmed / Not Found |
| Draft | Legal document drafting with inline editing, print/export |
| Evidence | Notes and evidence tracking |
| Conflict | Conflict-of-interest checker |
| Admin | Firm profile, API keys, model config, UI preferences, telemetry |

---

## Competitive Position

| Feature | LexAgent | Harvey AI | CoCounsel | Lexis+AI |
|---|---|---|---|---|
| Hallucination Shield + citation verify | ✅ | ❌ | ❌ | Partial |
| RAG pre-fetch (real database retrieval) | ✅ | ✅ | ❌ | Partial |
| Judge profiling (16K+ judges) | ✅ | ❌ | ❌ | ❌ |
| CourtListener direct integration | ✅ | ❌ | ❌ | ❌ |
| Firm profile + letterhead settings | ✅ | ❌ | ❌ | ❌ |
| SOL calculator | ✅ | ❌ | ❌ | ❌ |
| Conflict checker | ✅ | ❌ | ✅ | ❌ |
| Free tier operation | ✅ | ❌ | ❌ | ❌ |
| Document upload + analysis | ✅ | ✅ | ✅ | ✅ |
| Cloud persistence (Supabase) | ✅ | ✅ | ✅ | ✅ |

Harvey AI pricing: ~$1,200+/seat/month. LexAgent operates at near-zero marginal cost.

---

## Current Status (2026-04-18)

**Phase 4 — UI Overhaul Complete:**
- Migrated from Vite + React 18 → Next.js 15 App Router + React 19
- Lex Viridian design system: Tailwind v4 + @radix-ui, emerald/near-black premium aesthetic
- Premium collapsible sidebar, mobile-responsive TopBar with drawer
- URL-based matter routing (`/matters/[id]/research` etc.)
- Full 7-tab Admin page: Firm Profile, UI Preferences, API Keys, Model, Shield, Prompt, Telemetry
- Global tooltip system (enable/disable in Admin → UI Preferences)
- Zero TypeScript errors, clean `next build`

**Next up:**
- Wire remaining panel stubs to existing API logic (Deep Research, Vault, Strategy, etc.)
- Resolve Vercel env var injection for `NEXT_PUBLIC_*` prefix
- User roles, packages, and Stripe billing integration

See `PLAN.md` for full roadmap.
