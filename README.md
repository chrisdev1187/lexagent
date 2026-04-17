# LexAgent — AI Legal Practice Platform

> **ARES** (Autonomous Research & Evidence System) — Harvey AI competitor built on a 9-provider free LLM waterfall, 10 live legal databases, and a real-time Hallucination Shield.

**Live:** https://lexagent-ochre.vercel.app  
**API:** https://lexagent-0o5u.onrender.com

---

## What It Does

- AI-powered legal research across 10 authoritative databases
- Hallucination Shield — every citation verified against CourtListener in real-time
- Judge intelligence profiling (16,000+ federal and state judges)
- Legal document drafting (motions, memos, briefs, demand letters)
- SOL calculator, case timeline, conflict checker
- Zero API cost in normal operation — free LLM waterfall with 9 providers

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + React, deployed on Vercel |
| Backend | Hono (Node), deployed on Render |
| Monorepo | pnpm workspaces |
| Auth | Supabase (optional — bypassed in dev/demo) |
| LLM | 9-provider waterfall (Groq → Cerebras → SambaNova → OpenRouter → NVIDIA → xAI → Mistral → Gemini × 2) |
| Paid fallback | Anthropic Claude (Sonnet 4.6 / Opus 4.7 / Haiku 4.5) |

---

## Quickstart

```bash
# 1. Install
pnpm install

# 2. Configure backend
cp apps/api/.env.example apps/api/.env
# Add at minimum: GROQ_API_KEY (free at console.groq.com)

# 3. Configure frontend
echo "VITE_API_URL=http://localhost:8080" > apps/web/.env.local

# 4. Run
pnpm --filter api dev    # API on :8080
pnpm --filter web dev    # Web on :5173
```

The app runs without Supabase. Auth is bypassed, all requests treated as `userId = "anon"`.

---

## Environment Variables

### `apps/api/.env`

```bash
# ── LLM Providers (add as many as you want — more = more redundancy) ──────────
GROQ_API_KEY=gsk_...               # console.groq.com (free)
# CEREBRAS_API_KEY=csk-...         # cloud.cerebras.ai (free)
# SAMBANOVA_API_KEY=...            # cloud.sambanova.ai (free)
# OPENROUTER_API_KEY=sk-or-...     # openrouter.ai (free tier)
# NVIDIA_API_KEY=nvapi-...         # integrate.api.nvidia.com (free)
# XAI_API_KEY=xai-...              # console.x.ai (free tier)
# MISTRAL_API_KEY=...              # console.mistral.ai (free tier)
# GEMINI_API_KEY=AIza...           # aistudio.google.com (free)
# GEMINI_API_KEY_2=AIza...         # second account for rotation
# ANTHROPIC_API_KEY=sk-ant-...    # fallback when all free providers exhausted (paid)

# ── Legal Database APIs ────────────────────────────────────────────────────────
# CourtListener — courtlistener.com/register (free token)
# COURTLISTENER_TOKEN=your-token

# api.data.gov — api.data.gov/signup (free) — ONE key covers 3 APIs:
#   GovInfo (US Code, CFR, Federal Register)
#   Congress.gov (bills, amendments, voting records)
#   Regulations.gov (federal rulemaking, agency dockets)
# DATA_GOV_KEY=your-key

# OpenStates — openstates.org/accounts/signup (free)
# OPENSTATES_KEY=your-key

# Free APIs with no key needed (always active):
#   eCFR: ecfr.gov — live Code of Federal Regulations
#   SEC EDGAR: sec.gov — corporate filings full-text search
#   USPTO PatentsView: patentsview.org — patent database

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-app.vercel.app

# ── Supabase (optional) ───────────────────────────────────────────────────────
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_KEY=your-service-role-key

# ── Rate limits ───────────────────────────────────────────────────────────────
ANTHROPIC_RPM=60
LEGAL_RPM=120
```

### `apps/web/.env.local`

```bash
VITE_API_URL=http://localhost:8080
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## API Integrations

All external API calls are proxied through the Hono backend. Secrets never reach the browser.

| Route | External API | Key Required | Data |
|---|---|---|---|
| `/api/anthropic` | 9-provider LLM waterfall | Server env keys | AI completions |
| `/api/courtlistener` | courtlistener.com | `COURTLISTENER_TOKEN` (optional) | 9M opinions, 18M citations, 16K judges |
| `/api/govinfo` | api.govinfo.gov | `DATA_GOV_KEY` | US Code, CFR, Federal Register |
| `/api/congress` | api.congress.gov | `DATA_GOV_KEY` (same key) | Bills, amendments, voting records |
| `/api/regulations` | api.regulations.gov | `DATA_GOV_KEY` (same key) | Federal rulemaking, agency dockets |
| `/api/ecfr` | ecfr.gov | None | Live Code of Federal Regulations |
| `/api/edgar` | sec.gov / efts.sec.gov | None | Corporate filings: 10-K, 10-Q, 8-K |
| `/api/uspto` | api.patentsview.org | None | Patent full-text, IP research |
| `/api/openstates` | v3.openstates.org | `OPENSTATES_KEY` | 50-state legislation, bills |
| `/api/cap` | *(decommissioned)* | — | Returns 410 — api.case.law shut down 2024 |

---

## LLM Waterfall

The backend tries providers in this order. Skips any without a key. On HTTP 429 (rate limit) skips to the next. Returns the first success.

```
Groq → Cerebras → SambaNova → OpenRouter → NVIDIA → xAI → Mistral → Gemini → Gemini-2 → Anthropic
```

**Preferred provider routing:** The frontend model selector lets users pick a specific provider. That provider is sorted first in the waterfall and falls back automatically if rate-limited.

**Model mapping:** Free providers receive Llama 3.3 70B (or 8B for haiku-class requests). The Anthropic models (Sonnet 4.6, Opus 4.7, Haiku 4.5) are available for paid testing via the admin model selector.

---

## Project Structure

```
lexagent/
├── apps/
│   ├── api/                     # Hono backend
│   │   └── src/
│   │       ├── index.ts         # Server entrypoint, all routes mounted
│   │       ├── routes/          # One file per external API
│   │       │   ├── anthropic.ts # LLM waterfall + provider routing
│   │       │   ├── courtlistener.ts
│   │       │   ├── govinfo.ts
│   │       │   ├── congress.ts
│   │       │   ├── ecfr.ts
│   │       │   ├── regulations.ts
│   │       │   ├── edgar.ts
│   │       │   ├── uspto.ts
│   │       │   ├── openstates.ts
│   │       │   └── cap.ts       # 410 Gone — API decommissioned
│   │       └── middleware/
│   │           ├── auth.ts      # Supabase JWT (bypassed if unconfigured)
│   │           └── ratelimit.ts # Per-user token bucket
│   └── web/                     # Vite + React frontend
│       └── src/
│           ├── components/
│           │   ├── LexAgent.jsx # Main app (~4,400 lines)
│           │   └── AuthGate.tsx # Login/signup screen
│           ├── lib/
│           │   ├── api.ts       # Proxy base URLs
│           │   ├── auth.tsx     # AuthProvider + useAuth
│           │   └── supabase.ts  # Supabase client
│           └── App.tsx
├── supabase/migrations/         # DB schema + RLS policies
├── render.yaml                  # Render.com deploy config
├── PLAN.md                      # Internal dev roadmap (full detail)
└── README.md                    # This file
```

---

## Deployment

### Backend → Render

1. Connect GitHub repo at render.com
2. Service: **Web Service**, Root: `apps/api`, Build: `pnpm install && pnpm build`, Start: `node dist/index.js`
3. Set env vars: `GROQ_API_KEY`, `ALLOWED_ORIGINS` (your Vercel URL)
4. Optional: add `COURTLISTENER_TOKEN`, `DATA_GOV_KEY`, `OPENSTATES_KEY`, Supabase keys

Or use the included `render.yaml` for one-click deploy.

### Frontend → Vercel

1. Import repo at vercel.com
2. Root Directory: `apps/web`
3. Set env var: `VITE_API_URL=https://your-render-api.onrender.com`
4. Optional: Supabase `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

---

## Feature Overview

| Tab | Feature |
|---|---|
| Research | AI chat + web search + PDF upload + citation verify + CourtListener direct search |
| Deep Research | Multi-pass extended research with iterative refinement |
| Vault | Document storage and knowledge base |
| Strategy | JSON-structured case strategy analysis |
| Judge Intel | Live judge profiles — biography, affiliation, career positions, ABA ratings |
| Deadlines | Statute of limitations calculator + deadline tracking |
| Timeline | Case event timeline builder |
| Shield | Hallucination audit — every citation classified as Verified / Unconfirmed / Not Found |
| Draft | Legal document drafting — motions, memos, briefs, demand letters |
| Evidence | Notes and evidence tracking |
| Conflict | Conflict-of-interest checker |

---

## Competitive Position

| Feature | LexAgent | Harvey AI | CoCounsel | Lexis+AI |
|---|---|---|---|---|
| Hallucination Shield + citation verify | ✅ | ❌ | ❌ | Partial |
| Judge profiling (16K+ judges) | ✅ | ❌ | ❌ | ❌ |
| CourtListener direct integration | ✅ | ❌ | ❌ | ❌ |
| Historical case search (pre-2000) | ✅ | ❌ | ❌ | ❌ |
| SOL calculator | ✅ | ❌ | ❌ | ❌ |
| Conflict checker | ✅ | ❌ | ✅ | ❌ |
| Free tier operation | ✅ | ❌ | ❌ | ❌ |
| Document upload + analysis | ✅ | ✅ | ✅ | ✅ |

Harvey AI pricing: ~$1,200+/seat/month. LexAgent runs at near-zero marginal cost on free provider tiers.

---

## Current Status (2026-04-17)

Phase 3 (Production Infrastructure) complete. Working on Phase 3.5 hardening:

- **Next:** RAG pre-fetch — query databases before AI call, inject real results as context
- **Then:** Admin key ping tests, Supabase persistence, Render cold-start UX, empty provider response handling

See `PLAN.md` for full roadmap and internal session notes.
