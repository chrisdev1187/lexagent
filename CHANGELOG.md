# Changelog

All notable changes to LexAgent are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

From Phase 10 onward, every phase ships under a new version and a single commit/PR bundle. Patch bumps for fixes, minor for features, major for architectural breaks.

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
