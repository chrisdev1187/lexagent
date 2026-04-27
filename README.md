# LexAgent — AI Legal Practice Platform

> **ARES** (Advanced Research & Evidence System) — AI-powered legal practice management built on a 9-provider free LLM waterfall, 10 live legal databases, LexMemory case intelligence, and enterprise-grade security.

**Live:** https://lexagent-ochre.vercel.app  
**API:** https://lexagent-0o5u.onrender.com  
**GitHub:** https://github.com/chrisdev1187/lexagent  
**Version:** v1.5.4 — see [DEVLOG.md](./DEVLOG.md) for full change history

---

## What It Does

LexAgent gives attorneys a complete AI-powered workspace for every stage of a case — from initial research through document drafting, strategy planning, and billing. Every piece of work is saved to the cloud and available instantly on any device.

- **AI Research** — Queries 10 live legal databases (CourtListener, SEC EDGAR, USPTO, eCFR, Congress.gov, and more) before generating any response. Real database results, not hallucinated citations.
- **Hallucination Shield** — Every AI-generated citation is automatically verified against 9M+ court opinions in real-time. Unverified citations are flagged before they reach a filing.
- **Judge Intelligence** — Profiles on 4,000+ federal judges: appointment history, law school, ruling tendencies, grant rates on motions.
- **Case Strategy** — AI-generated strategy memos that know your entire case — prior research, verified authorities, judge profile — injected automatically via LexMemory.
- **Document Drafting** — 14 document types with firm letterhead, Bluebook-formatted citations, and PDF export.
- **Vault** — Confidential document storage with attorney-client privilege tagging and a non-confidential Context Library that feeds ARES with case-specific knowledge.
- **Billing** — Time tracking, hourly rate management, CSV/PDF invoice export.
- **Conflict Checker** — ABA Rules 1.7/1.9/1.10 screening with persistent AI analysis.
- **LexMemory** — 4-level case intelligence that remembers everything across all tabs: authorities, strategy nodes, open questions, and compressed episode summaries — injected into every AI call automatically.

---

## What's New in v1.5

### Shipped / In Progress

**Universal Persistent Memory (1.5.2)**  
All matter pages now save their state to the cloud. Research conversations, deep research synthesis memos, conflict analysis outputs, and draft text all survive page refresh, logout, and device switches. No more losing work.

**Export Everywhere (1.5.2)**  
Every page that generates useful output now has an export button. Strategy memos, judge intelligence briefs, conflict analyses, research conversations, timelines, and deadline lists can all be exported to PDF or Markdown. Billing exports to CSV and PDF invoice.

**Firm Profile & Teams in Settings (1.5.1)**  
Firm Profile and Teams management moved from the Administration panel to Settings — accessible without needing admin access. Firm name, logo, letterhead, bar number, and practice areas are all in one place.

**Document Branding (1.5.3.1)**  
Firm logos, letterheads, and contact details are now applied consistently across all generated documents. Upload your logo and the app will make it transparent and preview exactly how documents will look before you generate them.

**Vault: Confidential + Context Library (1.5.3.2)**  
The vault now has two sections:  
- **Confidential Vault** — ACP-protected documents with enforced server-side access control  
- **Context Library** — Non-confidential reference material (public filings, statutes, precedents) that ARES uses to enrich AI responses for that matter  

Document redaction tools allow sensitive names and ID numbers to be replaced with `[REDACTED]` in a copy while preserving the original.

**Feedback & Bug Reports (1.5.5)**  
A dedicated Feedback section (accessible from the sidebar) lets attorneys submit bug reports, feature requests, and general feedback directly from the app.

**Fair Usage & Credit Economy (1.5.4 — shipped)**  
A transparent per-action credit system replaces the previous mixed enforcement model. Every AI action deducts credits from a monthly pool — research (10), strategy (10), draft (10), deep research (15), judge/conflict (8). Credits and estimated dollar value are shown on every upgrade prompt. Free tier gets 1 use per feature per matter, waterfall models only. Credits reset monthly with no rollover.

**Account Security (1.5.2b)**  
One active session per account. Logging in from a new device immediately logs out the previous session. Browser fingerprinting, IP tracking, and abuse detection protect the platform from multi-account abuse.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | **Next.js 15** App Router + React 19, deployed on Vercel |
| Design System | **Lex Protocol** — custom CSS design system, emerald on near-black |
| Fonts | Playfair Display (serif) · Inter (sans) · JetBrains Mono (mono) |
| Icons | lucide-react |
| Backend | Hono (Node), deployed on Render |
| Monorepo | pnpm workspaces |
| Auth | Supabase — email/password, JWT session tokens, single-session enforcement |
| Database | Supabase Postgres — 19+ migrations, full RLS, audit log |
| AI (free tier) | 9-provider waterfall: Groq → Cerebras → SambaNova → OpenRouter → NVIDIA → xAI → Mistral → Gemini × 2 |
| AI (paid) | Anthropic Claude (platform-managed key, usage-metered) |
| Case Memory | LexMemory 4-level hierarchy (L1 Raw → L2 Episodes → L3 Nodes → L4 Theme) |

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
# Required for auth: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Run
pnpm --filter api dev    # API on :8080
pnpm --filter web dev    # Web on :3000
```

---

## Environment Variables

### `apps/api/.env` (never committed)

```bash
# ── LLM Providers ─────────────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...               # console.groq.com (free)
# CEREBRAS_API_KEY=csk-...         # cloud.cerebras.ai (free)
# SAMBANOVA_API_KEY=...            # cloud.sambanova.ai (free)
# OPENROUTER_API_KEY=sk-or-...     # openrouter.ai (free tier)
# NVIDIA_API_KEY=nvapi-...         # integrate.api.nvidia.com (free)
# XAI_API_KEY=xai-...              # console.x.ai (free tier)
# MISTRAL_API_KEY=...              # console.mistral.ai (free tier)
# GEMINI_API_KEY=AIza...           # aistudio.google.com (free)
# GEMINI_API_KEY_2=AIza...         # second account for rotation
# ANTHROPIC_API_KEY=sk-ant-...     # platform key for paid tier users

# ── Legal Database APIs ───────────────────────────────────────────────────────
# COURTLISTENER_TOKEN=...          # courtlistener.com/register (free)
# DATA_GOV_KEY=...                 # api.data.gov/signup (free) — GovInfo + Congress + Regulations
# OPENSTATES_KEY=...               # openstates.org/accounts/signup (free)

# ── Supabase (required for auth + cloud persistence) ─────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# ── CORS ─────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,https://lexagent-ochre.vercel.app
```

### `apps/web/.env.local` (never committed)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Database Migrations

All migrations in `apps/web/supabase/migrations/` — apply in order.

| Migration | Purpose |
|---|---|
| 001_init | Core tables: matters, documents, profiles |
| 002_rls | Row Level Security policies |
| 003_monetisation | Plans, subscriptions, usage_events |
| 004_vault_storage | Vault document storage |
| 005_shared_matters | Matter sharing |
| 006_admin_rls | Admin RLS + is_admin() function |
| 007_teams | Teams, team_members, team_invites |
| 008_matter_acls | visibility column, matter_access, document_access |
| 009_compliance | pgcrypto, audit_log, ACP column |
| 010_usage_enforcement | storage_limit_mb, storage_usage, quota RPCs |
| 011_ai_usage | ai_usage table, token tracking RPCs |
| 012_billing_portal | Billing portal URL |
| 013–014 | Judge database (FJC), waterfall stats |
| 015_free_tier | free_tier_usage table, free plan |
| 016_waterfall_stats | Provider health tracking |
| 017_judges | 4,059 FJC federal judges seeded |
| 018_get_my_role | get_my_role() SECURITY DEFINER RPC |
| 019_admin_update_roles | admin_set_user_plan() RPC |
| 020_vault_context | Context Library, ACP RLS enforcement *(v1.5.3 — applied)* |
| 021_credit_economy | Credit balance, action_log, plans update *(v1.5.4 — applied)* |
| 022_telemetry | Session tracking, fingerprint, abuse detection *(v1.5.2b — Sprint 5)* |
| 023_feedback | Feedback/bug report table *(v1.5.5 — applied)* |

---

## Auth Flow

1. User visits app → redirected to `/login`
2. User signs up with email → Supabase sends confirmation email
3. User confirms → account activated, redirected to `/dashboard`
4. Supabase issues JWT → stored in browser, injected into API calls via `Authorization: Bearer`
5. Render backend validates JWT on every request via `middleware/auth.ts`
6. **Single-session enforcement**: new login from any device immediately revokes all other active sessions
7. Matters load from Supabase — all data persists across devices and sessions

---

## API Integrations

All external API calls proxied through the Hono backend. Secrets never reach the browser.

| Route | External API | Data |
|---|---|---|
| `/api/anthropic` | 9-provider LLM waterfall + Anthropic | AI completions |
| `/api/courtlistener` | courtlistener.com | 9M opinions, 4K+ judges |
| `/api/govinfo` | api.govinfo.gov | US Code, CFR, Federal Register |
| `/api/congress` | api.congress.gov | Bills, amendments, voting records |
| `/api/regulations` | api.regulations.gov | Federal rulemaking, agency dockets |
| `/api/ecfr` | ecfr.gov | Live Code of Federal Regulations |
| `/api/edgar` | sec.gov / efts.sec.gov | Corporate filings: 10-K, 10-Q, 8-K |
| `/api/uspto` | api.patentsview.org | Patent full-text, IP research |
| `/api/openstates` | v3.openstates.org | 50-state legislation |

---

## Feature Overview

| Section | Features |
|---|---|
| **Research** | AI chat + RAG pre-fetch from 8 databases, citation verify, persistent history, export |
| **Deep Research** | Multi-source: Congress, eCFR, EDGAR, CourtListener, OpenStates — persistent synthesis, export |
| **Strategy** | AI case strategy with LexMemory injection, export to PDF |
| **Judge Intel** | Live judge profiles, FJC biography, AI strategic brief, export |
| **Vault** | Confidential (ACP-enforced) + Context Library (ARES enrichment), redaction tools |
| **Deadlines** | Deadline tracking, priority sorting, overdue detection, export |
| **Timeline** | Case event chronology, 7 event types, export |
| **Draft** | 14 document types, firm letterhead, Bluebook citations, version history, PDF |
| **Citations** | Batch citation verify (CourtListener), Bluebook formatting, save to matter |
| **Conflict** | ABA 1.7/1.9/1.10 screening, persistent AI analysis, export |
| **Billing** | Billable timer, time entries, CSV + PDF invoice export |
| **Notes** | Evidence + witness + strategy notes |
| **Settings** | Firm Profile, Teams, personal usage, model config, API keys (admin) |
| **Feedback** | Bug reports, feature requests, general feedback |
| **Administration** | Telemetry, ARES Inspector, audit log, user management, abuse detection |

---

## Plans

| Plan | Price | Credits/mo | Matters | Seats |
|---|---|---|---|---|
| Free | $0 | 1 use per feature | 1 | 1 |
| Starter | $45/mo | 500 | 10 | 1 |
| Professional | $95/mo | 1,500 | 25 | 3 |
| Firm | $200/mo | 5,000 | 60 | 10 |
| Premium | $2,000/mo | 20,000 | Unlimited | Unlimited |

Credits reset monthly. 1 credit ≈ $0.65 in AI compute value (provisional, calibration pending).  
Free tier: 1 use per feature per matter, waterfall models only.

---

## Competitive Position

| Feature | LexAgent | Harvey AI | CoCounsel | Lexis+AI |
|---|---|---|---|---|
| Hallucination Shield | ✅ | ❌ | ❌ | Partial |
| RAG pre-fetch (real DB retrieval) | ✅ | ✅ | ❌ | Partial |
| LexMemory case intelligence | ✅ | ❌ | ❌ | ❌ |
| Judge profiling (4K+ federal judges) | ✅ | ❌ | ❌ | ❌ |
| CourtListener direct integration | ✅ | ❌ | ❌ | ❌ |
| Firm branding on all documents | ✅ | ❌ | ❌ | ❌ |
| Vault with ACP enforcement | ✅ | ❌ | ❌ | ❌ |
| Conflict checker | ✅ | ❌ | ✅ | ❌ |
| Free tier with full feature access | ✅ | ❌ | ❌ | ❌ |
| Cloud persistence, multi-device | ✅ | ✅ | ✅ | ✅ |
| Single-session security | ✅ | ❌ | ❌ | ❌ |

Harvey AI: ~$1,200+/seat/month. LexAgent Starter: $45/month.

---

## Project Structure

```
lexagent/
├── apps/
│   ├── api/                        # Hono backend — Render
│   │   └── src/
│   │       ├── index.ts            # Entrypoint, all routes mounted
│   │       ├── routes/             # One file per external API
│   │       │   └── anthropic.ts    # 9-provider LLM waterfall
│   │       └── middleware/
│   │           ├── auth.ts         # Supabase JWT validation + session check
│   │           ├── quota.ts        # Quota enforcement
│   │           ├── credits.ts      # Credit deduction (v1.5.4)
│   │           └── free_tier.ts    # Free tier per-feature gating
│   └── web/                        # Next.js 15 App Router — Vercel
│       ├── app/
│       │   ├── (auth)/login/       # Login / sign-up
│       │   ├── (app)/
│       │   │   ├── dashboard/      # Matter cards, stats
│       │   │   ├── matters/[id]/   # 14 tab pages per matter
│       │   │   ├── settings/       # Firm Profile, Teams, personal settings
│       │   │   ├── administration/ # Admin-only: telemetry, users, audit
│       │   │   └── feedback/       # Bug reports, feature requests (v1.5.5)
│       │   └── legal/              # TOS, Privacy Policy (v1.5.6)
│       ├── components/
│       │   ├── layout/             # Sidebar, TopBar
│       │   ├── settings/           # FirmProfileTab, TeamsTab (v1.5.1)
│       │   └── shared/             # ExportButton, Letterhead, Markdown, etc.
│       └── lib/
│           ├── api.ts              # anthropicFetch(), getApiHeaders()
│           ├── auth.tsx            # AuthProvider, useAuth, session enforcement
│           ├── db.ts               # upsertMatter, loadMatters
│           ├── quota.ts            # Quota helpers
│           └── lex-memory/         # LexMemory 4-level AI memory system
├── apps/web/supabase/migrations/   # 023 migrations, all applied
├── LICENSE                         # Proprietary — All Rights Reserved (v1.5.6)
├── DEVLOG.md                       # Full technical dev log (SSOT)
└── README.md                       # This file — overview + quickstart
```

---

## Deployment

### Backend → Render
1. Connect GitHub repo at render.com
2. Service: **Web Service**, Root: `apps/api`, Build: `pnpm install && pnpm build`, Start: `node dist/index.js`
3. Required env: `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ALLOWED_ORIGINS`

### Frontend → Vercel
1. Import repo at vercel.com — auto-deploys on every push to master
2. Root Directory: `apps/web`, Framework: **Next.js** (auto-detected)
3. Required: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Database → Supabase
1. Create project at supabase.com
2. Run all migrations in `apps/web/supabase/migrations/` in order (001 → 023)
3. Auth → URL Configuration → set Site URL + Redirect URLs to your Vercel domain

---

## Release Process

1. Plan the change (update DEVLOG.md)
2. Implement + typecheck clean (`pnpm --filter web exec tsc --noEmit`)
3. Bump version in `apps/web/package.json` (SemVer)
4. Update DEVLOG.md with what changed and why
5. Push to master → Vercel auto-deploys

Full technical roadmap and decision log: **[DEVLOG.md](./DEVLOG.md)**
