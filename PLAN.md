# LexAgent — Master Project Plan

> **Last updated:** 2026-04-18 (Session 7)
> **Current phase:** Phase 3.5 Complete / Phase 4 Active
> **Status:** Fully deployed — Vercel frontend + Render backend + Supabase DB + 10 API integrations live

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
│   └── web/                       # Vite + React frontend — Vercel
│       └── src/
│           ├── components/
│           │   ├── LexAgent.jsx   # Main app (~4,900 lines)
│           │   └── AuthGate.tsx   # Login/signup screen
│           ├── lib/
│           │   ├── api.ts         # Proxy base URLs + auth header injection
│           │   ├── auth.tsx       # AuthProvider + useAuth hook
│           │   ├── supabase.ts    # Supabase browser client (hardcoded public keys)
│           │   ├── db.ts          # Supabase CRUD — matters persistence
│           │   └── storage.ts     # localStorage shim (demo/fallback)
│           └── App.tsx
├── supabase/
│   └── migrations/
│       ├── 001_init.sql           # Tables + triggers
│       └── 002_rls.sql            # Row Level Security policies
└── PLAN.md
```

### LLM Waterfall
```
Groq → Cerebras → SambaNova → OpenRouter → NVIDIA → xAI → Mistral → Gemini → Gemini-2 → Anthropic
```

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
- [x] Enterprise-grade UI: sidebar, dashboard, onboarding wizard, research panel, drafting, judge intel, command palette
- [x] ARES v5 branding, dark theme, color system, typography

### ✅ Phase 3 — Production Infrastructure (Complete: 2026-04-17)
- [x] Vite + React monorepo (pnpm workspaces)
- [x] Hono backend on Render with CORS, auth middleware, rate limiting
- [x] 9-provider free LLM waterfall (Groq → ... → Anthropic)
- [x] 10 legal API integrations proxied through backend
- [x] Supabase schema — 5 tables + RLS policies (001_init.sql, 002_rls.sql)
- [x] AuthProvider + AuthGate (email/password + Google OAuth)
- [x] Both builds verified clean and deployed

### ✅ Phase 3.5 — System Hardening (Complete: 2026-04-18)
- [x] RAG pre-fetch live — databases queried BEFORE AI call, results injected as context
- [x] Admin telemetry — live API ping tests with latency in Admin tab
- [x] Anthropic key admin section — user-provided key, browser-only
- [x] Document panel — inline editing, summarize mode, result history, print/export
- [x] Supabase persistence wired — `db.ts` created, matters sync to cloud on every save
- [x] `useAuth()` hooked into LexAgent.jsx — load/save/delete all call Supabase when authenticated
- [x] localStorage migration — on first login, local matters batch-upserted to Supabase
- [x] `supabase.ts` hardcoded with public URL + anon key (safe — anon key is public by design)
- [x] `AuthGate.tsx` and `auth.tsx` cleaned up — no longer gated on env vars
- [x] README updated to Phase 3.5 complete

### 🔄 Phase 4 — Auth + Enterprise Features (Active)

#### ❌ Supabase auth gate not showing in production (BLOCKER)
Auth gate bypasses in production — users access app without signing in.
- Root cause unresolved: `supabase.ts` has hardcoded real URL/key, `auth.tsx` + `AuthGate.tsx` env checks removed, but deployed bundle still shows old placeholder code
- Suspected cause: Vercel build cache serving stale bundle despite pushes
- Latest fix pushed (d66f567) — needs clean redeploy to verify
- **Next step:** Force clean Vercel redeploy with no build cache

#### ❌ Verify email confirmation flow end-to-end
- `mailer_autoconfirm: false` — Supabase sends confirmation emails ✅
- Supabase redirect URLs need setting: Authentication → URL Configuration → add `https://lexagent-ochre.vercel.app` + `http://localhost:5173`
- `onAuthStateChange` in auth.tsx handles the redirect automatically ✅
- **Blocked by:** auth gate blocker above

#### ❌ User roles, ranks, permissions, packages
New Supabase tables needed:
- `user_roles` — user_id, role (free | pro | admin), package (starter | professional | enterprise)
- `subscriptions` — user_id, stripe_customer_id, plan, status, current_period_end
- Expose role via `useAuth()` hook (load from user_roles on sign-in)
- Gate features in UI based on role (query limits, vault file count, etc.)

#### ❌ Admin dashboard
- Host at `admin.agent0.co.za` on Vercel (`apps/admin` in monorepo)
- Use Supabase Studio for early-stage admin (free, already available)
- Build custom dashboard once daily usage patterns are clear
- Needs: `user_roles`, `subscriptions`, `usage_events` tables populated first

#### ❌ Stripe billing integration
- Stripe webhooks → update `subscriptions` table on payment events
- Per-seat licensing + usage limits enforced server-side in `middleware/ratelimit.ts`

---

## Known Issues & Technical Debt

| Issue | Severity | Status |
|---|---|---|
| Auth gate not showing in production | HIGH | 🔄 In progress — clean redeploy needed |
| Single 4,900+ line file — no modularity | MEDIUM | Phase 4 |
| Render free tier cold starts (~30s after 15min idle) | LOW | Phase 4 — keep-alive ping or upgrade |
| No error boundaries (unhandled crashes) | LOW | Phase 4 |
| No automated tests for UI | LOW | Phase 4 |
| Root `.env` has committed LLM API keys | MEDIUM | Rotate keys, add to .gitignore properly |

---

## Session Notes

### 2026-04-18 — Session 7
- Supabase project created: org = agent0, project = LexAgent, ref = nildwhegvjbrnrpaqkto
- `db.ts` created — full Supabase CRUD for matters (toRow/fromRow mapping, upsert, delete, load)
- `LexAgent.jsx` wired to Supabase: load on mount (with localStorage migration), save/create/delete all call Supabase when authenticated
- MCP server configured: `~/.claude/mcp.json` → `@supabase/mcp-server-supabase`
- Supabase migrations run: 001_init.sql + 002_rls.sql — all 5 tables confirmed live
- README rewritten and pushed to GitHub
- Auth gate debug session: env vars not reaching Vite build despite multiple Vercel redeployments
  - Root cause: Vercel env var injection unreliable in pnpm monorepo setup
  - Fix 1: `apps/web/.env` committed with public Supabase URL + anon key (safe to commit)
  - Fix 2: `supabase.ts` hardcoded real URL + anon key as fallback (removed placeholder)
  - Fix 3: Removed env var checks from `auth.tsx` and `AuthGate.tsx`
  - Status: fixes pushed but Vercel serving stale bundle — suspected build cache issue
- Vercel-Supabase integration connected (supabase-carmine-curtain, VITE_ prefix)
- Confirmed: database live, `matters` table returns `[]`, RLS active

### 2026-04-17 — Session 6
- RAG pre-fetch implemented — databases queried before AI call
- Admin telemetry system added — live API ping tests with latency
- Anthropic key admin section added — user-provided key, browser-only
- Document panel upgraded — inline editing, summarize mode, result history, print/export
- Production confirmed live: Vercel + Render both responding

### 2026-04-16 — Session 5
- 9-provider LLM waterfall implemented (Groq first, Anthropic last)
- Both builds verified clean, deployed to Vercel + Render

### 2026-04-14 — Sessions 1–4
- Full competitor analysis (Harvey AI, CoCounsel, Lexis+AI)
- Phase 2 UI overhaul complete (v5 — 4328 lines)
- Phase 3 infrastructure scaffolded (monorepo, Vite, Hono, Supabase schema)

---

*This document is updated at the end of every working session. Future developers: read this before touching any code.*
