# Changelog

All notable changes to LexAgent are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

From Phase 10 onward, every phase ships under a new version and a single commit/PR bundle. Patch bumps for fixes, minor for features, major for architectural breaks.

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
