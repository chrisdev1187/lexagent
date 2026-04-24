# Changelog

All notable changes to LexAgent are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

From Phase 10 onward, every phase ships under a new version and a single commit/PR bundle. Patch bumps for fixes, minor for features, major for architectural breaks.

---

## [0.4.1] — 2026-04-24 — Phase 12 Slice B: Frontend budget banners + near-live UsagePill

### Added
- **`lib/budget-store.ts`** — zero-dependency pub/sub singleton. `setBudgetState()` / `getBudgetState()` / `subscribeBudget()`. Carries `status`, `spent`, `budget`, and a monotonic `seq` counter bumped on every update.
- **`hooks/useBudgetStatus.ts`** — React hook that subscribes to the budget store and returns live `BudgetState`.
- **`components/shared/BudgetWarningBanner`** — amber (`warning`) / crimson (`rate_limited`) dismissible bar rendered below the TabBar in all matter tabs. Shows usage percentage + "Upgrade" link to `/settings/billing`. Auto re-shows if a subsequent AI call tips back into a warning band.

### Changed
- **`lib/api.ts` — `anthropicFetch()`** now reads `X-Budget-USD-Spent`, `X-Budget-USD-Budget`, `X-Budget-Status` headers from every backend response and calls `setBudgetState()`. Non-blocking — no throw for warning status; `QuotaExceededError` (429) continues as before.
- **`UsagePill`** subscribes to `useBudgetStatus().seq` — re-fetches `usage_monthly` from Supabase after every AI call completes, making the sidebar pill near-live without polling.
- **`matters/[id]/layout.tsx`** mounts `<BudgetWarningBanner />` between TabBar and the page content, so the warning appears on all 11 matter tabs with zero per-page changes.

### Ops note
- No DB or env changes. Works without Supabase / API (budget store stays at defaults, banner stays hidden).

---

## [0.4.0] — 2026-04-24 — Phase 12 Slice A: Wire quota + usage logging

### Added
- **`checkQuota` middleware** mounted on `/api/anthropic/messages` between `requireAuth` and `rateLimit`. Loads the caller's plan budget and current-month spend, hard-blocks at ≥110% with a 429, and surfaces budget state to the client via response headers.
- **Response headers** on every `/messages` reply (admin waterfall + user Anthropic):
  - `X-Budget-USD-Spent` — month-to-date spend in USD
  - `X-Budget-USD-Budget` — plan budget in USD
  - `X-Budget-Status` — `ok` | `warning` (≥80%) | `rate_limited` (≥100%) | `exceeded` (≥110%)
- **Usage attribution fields** on `BodySchema`: optional `matter_id` (UUID) and `tool_name`. Frontend now passes both via `withLexMemory` (research / strategy / draft / judge) and the conflict tab's direct `anthropicFetch` call.
- **`logUsage` fire-and-forget** after every successful provider response — admin-waterfall calls log with `provider/model` so we can attribute volume to the actual upstream; user-path Anthropic calls log with the requested model + parsed `usage` from the JSON body. Errors are caught and never block the response.

### Changed
- **`BodySchema`** now accepts `matter_id` + `tool_name`; both stripped before forwarding to Anthropic so the upstream call doesn't 400 on unknown fields.
- **User-path `Response`** explicitly attaches `X-Budget-*` headers (Hono's `c.header()` set in middleware is bypassed by raw `new Response(...)` returns).
- **BYOK + no-Supabase paths** in `checkQuota` now also emit budget headers (`Spent=0`, `Status=ok`) so the frontend has a single uniform contract.

### Ops note
- No DB migration. All required tables (`usage_events`, `usage_monthly`) and RPCs already shipped in `003_monetisation.sql`.
- Exit criteria for this slice: an account with `plan_id='free'` ($0 budget) → 429 after one call; `usage_events` row appears with correct token counts; UsagePill ticks up after each AI call. Frontend banners + UpgradeCTA wiring lands in v0.4.1 (Slice B).

---

## [0.3.3] — 2026-04-24 — Phase 11: Admin version badge + account menu + usage routing

### Added
- **`<VersionBadge>`** — fixed top-right corner of the app shell, admin-only, bold neon-green with soft glow. Links to `/changelog`. Hidden for non-admin users so the UI stays clean for clients while admins always see what version they're testing.
- **User account dropdown** in the sidebar — clicking the user avatar now opens a menu with **Profile & Usage** (`/settings/profile`), **Billing & Plan** (`/settings/billing`), **API Keys** (`/settings/api-key`), and **Sign out**. Closes on outside-click. Previously these three settings pages existed but were unreachable from navigation — dead click on the avatar and no other link.

### Changed
- **`<UsagePill>` routing** — now role-aware. Admins → `/admin` (full quota panel with org-wide breakdown). Users → `/settings/profile` (their own monthly spend + recent events). Previously everyone was sent to `/admin`, which non-admins can't access.

### Fixed
- Sidebar user row is now an actual `<button>` with `aria-haspopup`/`aria-expanded`, not a passive `<div>`.

### Ops note
- No env or DB changes. Admin detection continues to use `user_roles.role = 'admin'` via `useAuth().isAdmin`.

---

## [0.3.2] — 2026-04-24 — Phase 11: Fix /changelog prerender

### Fixed
- **Build** — `/changelog` was failing Vercel prerender with `Functions cannot be passed directly to Client Components` (digest `469269651`). The Server Component page was passing a Lucide icon (a function) as a prop to `<PanelShell>`, a Client Component — Next.js can't serialize function props across that boundary during static export.
- Split the page: `page.tsx` (Server Component) now reads `CHANGELOG.md` at build time and passes only the Markdown **string** + version string to a new `ChangelogView.tsx` (Client Component) which owns the icon import and renders `<PanelShell>`. No function props cross the RSC boundary.

### Ops note
- No env changes required. This is purely a build/prerender fix.

---

## [0.3.1] — 2026-04-24 — Phase 11: Admin-gate the 9-provider waterfall

### Changed
- **Backend AI routing is now role-aware.** `apps/api/src/routes/anthropic.ts` resolves the caller's `user_roles.role` on every request:
  - `admin` → free 9-provider waterfall (Groq → Cerebras → … → Gemini). Zero-cost path, internal testing only.
  - `user` with BYOK → their Anthropic key (`user_roles.byok_key`, `byok_active=true`).
  - `user` without BYOK → platform `ANTHROPIC_API_KEY`.
  - Anything else (no key available, not admin) → `503 configuration_error` with a clear message.
- Response headers now tag the serving tier: `_provider` + `_tier: "admin-waterfall"` for admins, `X-Tier: byok | platform` for users.

### Fixed
- Research page no longer shows the misleading "Add your Anthropic API key" banner when `settings.anthropicKey` is empty. The backend handles routing; the banner was lying.

### Ops note
- **Action required on Render:** set `ANTHROPIC_API_KEY` for the platform-default path. Without it, non-admin users with no BYOK key will hit the 503 error.
- Admin accounts (`drwillybum@gmail.com`, `christiaanbothma47@gmail.com`) continue to use the free waterfall for QA — no Anthropic key consumption.

---

## [0.3.0] — 2026-04-24 — Phase 10: Version System

### Added
- Root `package.json` now carries a `version` field aligned with `apps/web/package.json`.
- `CHANGELOG.md` at repo root — canonical release history.
- `<VersionPill>` in Sidebar footer links to `/changelog`.
- `/changelog` in-app route rendering the latest release notes.
- `NEXT_PUBLIC_APP_VERSION` is wired through `next.config` from `package.json` at build time — single source of truth.

### Changed
- `PLAN.md` and `README.md` updated to reflect current phase and release process.

---

## [0.2.1] — 2026-04-24 — Phase 9: Hardening & Visibility

### Fixed
- **CRITICAL** — Race condition in `withLexMemory` HOF. Fire-and-forget extraction now reads the latest matter via a functional `updateMatter(prev => ...)` so concurrent writes (e.g., user editing the matter while an AI call completes) are no longer clobbered by a stale snapshot.
- **CRITICAL** — Tab-ID mismatch: `settings.ts` had `deepresearch` while the folder route and `TabId` union are `deep-research`. Routing + LexMemory tab-affinity now resolve.
- Silent extraction failures now emit `console.warn` so memory issues are diagnosable.

### Added
- `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` — Next.js error boundaries with recovery UI.
- Citations page: saving a verified citation now promotes it into LexMemory as a `Level3Authority` node with `verified=true` and `confidence=3`.
- Overview tab surfaces LexMemory state: node count, verified authority count, episode count, theme pills (primary theory, posture, statutes), last episode summary, pre-init explainer.
- `authorityFromVerified()` helper in `lib/lex-memory/extract.ts`.

---

## [0.2.0] — 2026-04-24 — Phase 8: LexMemory + Token Observability

### Added
- **LexMemory** — 4-level xMemory hierarchy (L1 Raw → L2 Episodes → L3 Semantic Nodes → L4 Theme) persisted per matter in Supabase JSONB. Caveman-compressed context block injected into every AI call via `withLexMemory()` HOF; ~250-token budget with importance-ranked greedy fill. Delivers 60–80% input-token savings over a matter's lifetime vs. raw history injection.
- `ai_usage` table (migration `011_ai_usage.sql`) with RLS, admin guard, and three SECURITY DEFINER RPCs — `get_my_token_usage`, `get_admin_token_summary`, `get_token_daily_trend`.
- Admin Quota tab: total tokens, LexMemory efficiency %, tokens-by-tab bars, top-users table, 7-day sparkline.
- `useMyTokenUsage` and `useAdminTokenUsage` React hooks.
- `withLexMemory()` — one-line HOF integration point for Research, Strategy, Draft, Judge tabs. Fire-and-forget extraction never blocks the UI.

### Changed
- Strategy page no longer hand-injects citations or judge analysis into system prompt; LexMemory does it automatically.
- Draft page system prompt simplified — memory block replaces legacy `citationsBlock`.

---

## [0.1.0] — Phase 1–7 baseline

Phases 1–7 predate this changelog. Summary of shipped capabilities at 0.1.0:

- Next.js 15 App Router + React 19 frontend on Vercel
- Hono backend on Render
- Supabase auth (email/password + Google OAuth) + Postgres persistence
- 9-provider LLM waterfall (Groq, Cerebras, SambaNova, OpenRouter, NVIDIA, xAI, Mistral, Gemini ×2) with user-provided Anthropic fallback
- 10 legal database integrations (CourtListener, SEC EDGAR, USPTO, eCFR, Congress.gov, GovInfo, Regulations.gov, OpenStates)
- Hallucination Shield — real-time citation verification against CourtListener
- Judge intelligence (16k+ federal/state judges)
- Document drafting, Vault (multi-PDF), timeline, deadlines, conflict checker, billing tracker
- Lemon Squeezy billing + regional currency
- Full admin panel with user management, quota, audit log
- Design system: Lex Viridian (Tailwind v4, emerald on near-black)

---

[0.3.0]: https://github.com/chrisdev1187/lexagent/releases/tag/v0.3.0
[0.2.1]: https://github.com/chrisdev1187/lexagent/releases/tag/v0.2.1
[0.2.0]: https://github.com/chrisdev1187/lexagent/releases/tag/v0.2.0
[0.1.0]: https://github.com/chrisdev1187/lexagent/releases/tag/v0.1.0
