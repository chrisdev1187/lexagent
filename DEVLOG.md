# LexAgent DEVLOG — Single Source of Truth

> Full technical development log. Every architectural decision, migration, approved plan, and phase status lives here. README.md is the non-technical summary. This file is the authoritative record.

**Production:** https://lexagent-ochre.vercel.app  
**API:** https://lexagent-0o5u.onrender.com  
**Supabase:** mgiqicasllvisiwvbiuu.supabase.co  
**GitHub:** https://github.com/chrisdev1187/lexagent  

---

## Architecture Decisions (Permanent Record)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API key model | User-provided (BYOK) for Anthropic; platform key for paid tiers | No Anthropic reseller program needed |
| Settings persistence | localStorage (not Supabase) for API keys | Browser vault only; never server-side |
| Matter data | Supabase JSONB `metadata` column for dynamic fields | Avoids migration churn for every new field |
| Free tier AI | 9-provider waterfall (Groq, Cerebras, SambaNova, etc.) | $0 marginal cost to platform |
| Paid tier AI | Anthropic Claude via platform key, metered by credits | Markup model, transparent to users |
| Role model | admin / member / owner (team context) | Admin = global; owner = team-scoped |
| Jurisdiction focus | USA primary; EU/SA deferred to Phase 9+ | Scope control |
| Credit display rate | 1 credit = $0.65 USD compute value (provisional) | Calibration required after beta |
| Credit expiry | Monthly reset, no rollover | Simple, fair |
| Session policy | 1 active session per account, always | Security; device theft protection |
| Domain abuse flag | Domain NOT used as abuse signal | Law firms have many users on same domain |
| Appeal process | Email only (support@lexagent.ai) | Keeps process controllable, no in-app flow |
| Model for plan copy | claude-opus-4-7 only (not 4.6) | Quality requirement for user-facing plan content |
| `matters.shared` | Kept as legacy backup; do not remove | Backward compat; visibility column is primary |

---

## All Applied Migrations (as of 2026-04-27)

| # | File | Status | What it does |
|---|------|--------|-------------|
| 001 | init | ✅ | Core tables: matters, documents, profiles |
| 002 | rls | ✅ | Row Level Security policies |
| 003 | monetisation | ✅ | Plans, subscriptions, usage_events |
| 004 | vault_storage | ✅ | Vault document storage |
| 005 | shared_matters | ✅ | Matter sharing |
| 006 | admin_rls | ✅ | is_admin(), get_admin_users() RPC |
| 007 | teams | ✅ | teams, team_members, team_invites, user_sessions |
| 008 | matter_acls | ✅ | visibility col, matter_access, document_access, can_access_matter |
| 009 | compliance | ✅ | pgcrypto, audit_log, ACP col, log_audit_event() |
| 010 | usage_enforcement | ✅ | storage_limit_mb, storage_usage, get_quota_status() |
| 011 | ai_usage | ✅ | ai_usage table, get_my_token_usage(), get_admin_token_summary() |
| 012 | billing_portal | ✅ | customer_portal_url on subscriptions |
| 013 | (judges schema) | ✅ | judges table |
| 014 | (waterfall stats) | ✅ | waterfall_stats table |
| 015 | free_tier | ✅ | free_tier_usage table, free plan row |
| 016 | waterfall_stats | ✅ | Provider health tracking |
| 017 | judges seed | ✅ | 4,059 FJC federal judges from biographical CSV |
| 018 | get_my_role | ✅ | get_my_role() SECURITY DEFINER RPC |
| 019 | admin_update_roles | ✅ | admin_set_user_plan() RPC |
| 020 | vault_context | ✅ | Context Library, ACP RLS enforcement |
| 021 | credit_economy | ✅ | credit_balance, action_log, credits_monthly on plans |
| 022 | telemetry | ✅ | user_sessions_ext, abuse_flags, suspension cols, single-session RPCs, admin RPCs |
| 023 | feedback | ✅ | feedback table, RLS |

---

## Key File Map

| File | Purpose |
|------|---------|
| `apps/api/src/routes/anthropic.ts` | 9-provider LLM waterfall |
| `apps/api/src/middleware/quota.ts` | Budget enforcement (→ credits.ts in v1.5.4) |
| `apps/api/src/middleware/free_tier.ts` | Free tier per-tool-per-matter gating |
| `apps/web/lib/api.ts` | `anthropicFetch()`, error classes |
| `apps/web/lib/settings.ts` | AppSettings interface, DEFAULT_SETTINGS, ARES system prompt |
| `apps/web/lib/supabase.ts` | Supabase browser client |
| `apps/web/lib/db.ts` | `loadMatters`, `upsertMatter` |
| `apps/web/lib/auth.tsx` | AuthProvider, useAuth, isAdmin, userRole |
| `apps/web/lib/quota.ts` | `getQuotaStatus()`, quota helpers |
| `apps/web/lib/audit.ts` | `logAudit()` wrapper for audit_log |
| `apps/web/lib/lex-memory/` | LexMemory 4-level hierarchy — all types, compress, rank, extract, merge |
| `apps/web/providers/matters-provider.tsx` | Matter type, useMatters, updateMatter |
| `apps/web/providers/teams-provider.tsx` | useTeams via get_my_teams() |
| `apps/web/hooks/usePresence.ts` | Supabase Realtime per-matter channels |
| `apps/web/components/layout/Sidebar.tsx` | Nav, billable timer, firm logo display |
| `apps/web/components/shared/UsagePill.tsx` | Credit-aware usage pill — get_credit_status RPC |
| `apps/web/components/shared/AvatarStack.tsx` | Co-present user avatars |
| `apps/web/components/shared/Markdown.tsx` | react-markdown + remark-gfm renderer |
| `apps/web/components/shared/ExportButton.tsx` | Shared export (PDF / Markdown / CSV) |
| `apps/web/components/shared/Letterhead.tsx` | Firm letterhead injected into all PDF exports |
| `apps/web/components/shared/DisclaimerBanner.tsx` | Session-once legal disclaimer banner |
| `apps/web/components/shared/UpgradeCTA.tsx` | Credit-aware upgrade modal |
| `apps/web/components/settings/FirmProfileTab.tsx` | Firm profile settings tab (v1.5.1) |
| `apps/web/components/settings/TeamsTab.tsx` | Teams settings tab (v1.5.1) |
| `apps/web/lib/credits.ts` | CREDIT_TO_USD constant + CREDIT_COSTS per-action map |
| `apps/web/app/(app)/admin/page.tsx` | Administration panel (14 tabs) |
| `apps/web/app/(app)/settings/page.tsx` | User settings — Firm Profile + Teams + credit bar |
| `apps/web/app/(app)/feedback/page.tsx` | Feedback / bug report page (v1.5.5) |
| `apps/web/app/(app)/matters/[id]/layout.tsx` | Matter tab bar + header + Share |
| `apps/web/app/(app)/matters/[id]/strategy/page.tsx` | Strategy + LexMemory + presence |
| `apps/web/app/(app)/matters/[id]/research/page.tsx` | Research + CourtListener RAG + persistent history |
| `apps/web/app/(app)/matters/[id]/vault/page.tsx` | Vault + ACP + Context Library (v1.5.3) |
| `apps/api/src/middleware/credits.ts` | Credit deduction middleware — replaces quota.ts |

---

## LLM Waterfall (Current)

**Free tier:** 9 free providers tried in order. First success wins.  
**Paid tier:** Anthropic Claude via platform `ANTHROPIC_API_KEY` (Render env).  
**BYOK:** User's own Anthropic key bypasses waterfall entirely.

| # | Provider | Free Model | Paid Model |
|---|----------|-----------|-----------|
| 1 | Groq | llama-3.1-8b-instant | llama-3.3-70b-versatile |
| 2 | Cerebras | llama3.1-8b | llama-3.3-70b |
| 3 | SambaNova | (same) | Meta-Llama-3.3-70B-Instruct |
| 4 | OpenRouter | meta-llama/llama-3.3-70b-instruct:free | (same) |
| 5 | NVIDIA | (same) | meta/llama-3.3-70b-instruct |
| 6 | xAI | grok-3-mini | grok-3-mini |
| 7 | Mistral | mistral-small-latest | mistral-small-latest |
| 8 | Gemini | gemini-2.0-flash | gemini-2.0-flash |
| 9 | Gemini-2 | gemini-2.0-flash | gemini-2.0-flash |

---

## LexMemory Architecture

4-level case intelligence injected into every AI call automatically via `withLexMemory()` HOF.

| Level | Name | Content | Cap | Injected? |
|-------|------|---------|-----|-----------|
| L4 | Theme | matter type, jurisdiction, court, judge, primary theory, statutes | ~50 tok | Always |
| L3 | Semantic Nodes | authorities (citations+propositions), strategies, open questions | 80 nodes | Greedy by rank |
| L2 | Episodes | per-tab caveman-compressed summaries (≤100 tok each) | 3/tab = 18 total | 2 most recent |
| L1 | Raw | full AI responses, never compressed | 5/tab = 30 total | Never |

**Token budget:** 250 tokens per call (L4: 50, blocking OPEN: 60, L3 greedy, L2 × 2).  
**Storage:** `matter.lexMemory` JSONB field — no separate migration needed.

---

## Plans (v1.5.4 — pending approval)

| Plan | USD/mo | Credits/mo | Matters | Seats | Storage |
|------|--------|-----------|---------|-------|---------|
| Free | $0 | 1 use/feature | 1 | 1 | 100 MB |
| Starter | $45 | 500 | 10 | 1 | 512 MB |
| Professional | $95 | 1,500 | 25 | 3 | 2 GB |
| Firm | $200 | 5,000 | 60 | 10 | 10 GB |
| Premium | $2,000 | 20,000 | Unlimited | Unlimited | Unlimited |

**Credit rate (provisional):** 1 credit = $0.65 USD compute value. Requires beta calibration.  
**Expiry:** Monthly reset, no rollover. Admin-granted bonus credits expire 90 days from grant.  
**Free tier:** Lifetime per-feature-per-matter limit (not monthly). Waterfall models only.

### Per-Action Credit Costs (provisional)

| Action | Credits |
|--------|---------|
| Research AI call | 10 |
| Deep research synthesis | 15 |
| Strategy generation | 10 |
| Draft generation | 10 |
| Judge intel search | 8 |
| Conflict check | 8 |
| Vault document upload | 2 |
| Matter creation | 0 (matter limit governs) |
| Deadline / Timeline add | 0 |
| Billing log entry | 0 |
| Export (PDF/doc/CSV) | 0 |

---

## Security & Account Policy

**Session enforcement:** 1 active session per account. New login revokes all previous sessions.  
**Device tracking:** Browser fingerprint (FingerprintJS v4) + IP + user agent logged per session.  
**Domain policy:** Email domain NOT used as abuse signal (law firms have many users per domain).  
**Abuse signals:** >3 accounts from same IP, >3 accounts from same device fingerprint, email alias variations (chris@/chris+1@), >5× average daily usage.  
**Suspension:** Immediate effect. User sees appeal instructions (email only). Admin notified at drwillybum@gmail.com.  
**Admin sessions:** Admin accounts may have 2 concurrent sessions (monitoring + management).

---

## Completed Phases (v1.0 – v1.4)

### Phase 1 — Teams + Role Enforcement (2026-04-19)
- 007_teams migration: teams, team_members, team_invites, user_sessions, user_roles
- Concurrent session enforcement per plan tier
- Admin user management fix (get_admin_users RPC)
- ADMIN_ONLY_TABS: apikeys, prompt, telemetry, users
- UsagePill: % for members, $ for admins

### Phase 2 — Matter & Vault ACLs (2026-04-19)
- 008_matter_acls: visibility (private/team/custom), matter_access, document_access
- RLS rewrite for matters; storage ACLs for team vault
- `matters.shared` kept as legacy backup

### Phase 3 — Real-time Presence (2026-04-19)
- usePresence hook (Supabase Realtime per-matter channels)
- AvatarStack in matter header
- Optimistic locking warning on strategy page

### Phase 4 — Compliance (2026-04-19)
- 009_compliance: pgcrypto, audit_log, audit_checkpoints, ACP col
- log_audit_event() + generate_audit_checkpoint() RPCs
- Vault: ACP toggle + shield badge + doc.upload/doc.delete audit events
- Admin: Audit Log tab (paginated, seal checkpoint button)

### Phase 5 — Usage Enforcement + Quota Dashboard (2026-04-19)
- 010_usage_enforcement: storage_limit_mb, storage_usage, team_usage_monthly
- get_quota_status / adjust_storage_usage / check_matter_quota RPCs
- QuotaExceededError from HTTP 429, UpgradeCTA modal
- Admin: Quota & Usage tab with progress bars

### Phase 6 — Lex Protocol Design System (2026-04-24)
- Midnight Court design system: colors_and_type.css + components.css
- `lex-app` class on `<html>`, CSS imports in globals.css
- All buttons → lex-btn, all chips → lex-chip, all cards → lex-card
- All color tokens → inline style (Tailwind v4 has no utility mapping for CSS vars)

### Phase 7 — Research Quality Overhaul (2026-04-24)
- Markdown.tsx: react-markdown + remark-gfm
- courtlistener.ts: searchOpinions(), searchPeople(), citationLookup()
- health.ts: warmRender() on app mount
- Research: CourtListener grounding before every AI call, sources panel
- Deep Research: CourtListener as default tab, Bluebook bill citations
- Citations: batch verify, "Save to matter", Bluebook output
- Draft: firm profile + verifiedCitations in prompt, proper letterhead in PDF
- Strategy: verifiedCitations + judgeAnalysis in prompt
- Judge: AI strategic brief synthesis, saves to judgeAnalysis

### Phase 8 — LexMemory + Token Observability (2026-04-24)
- withLexMemory() HOF wrapping all 6 AI pages
- L1–L4 memory hierarchy with caveman compression
- lib/lex-memory/ — 9 files: types, tokens, compress, rank, merge, bootstrap, extract, build-context, index
- usage-logger.ts: logAiUsage() fire-and-forget
- 011_ai_usage: ai_usage table, token RPCs
- HOF rollout: research, strategy, draft, judge pages

### V1.3.0 — Leave Nothing Untouched (2026-04-25)
- A1: ARES v3.0 deployed to DEFAULT_SYSTEM in settings.ts
- A2: Prompt + API-Key tabs locked to admin only in settings/page.tsx
- A3: Grader upgraded to direct Anthropic (not waterfall) with temperature:0
- B6: Service card deep-inspect panel in admin telemetry
- E2: getOpinion(id) + getDocket(docketId) in courtlistener.ts
- E4: FJC judge panel in judge page (law school, appointing president, commission date)
- E6: Playwright spec covering admin telemetry, vault lifecycle, judge FJC panel, LexMemory logging
- 018_get_my_role: get_my_role() SECURITY DEFINER RPC
- 019_admin_update_roles: admin_set_user_plan() RPC
- Audit scores: Overall 92.4/100 (Research 88, Strategy 96, Judge 96, Draft 86, Conflict 96)

---

## v1.5 Roadmap (Approved 2026-04-26)

### 1.5.1 — Navigation: Firm Profile & Teams → Settings
**Status:** ✅ COMPLETE (2026-04-26)  
Move both tabs from `/administration` into `/settings`. Extract `FirmProfileTab` and `TeamsTab` to `components/settings/`. Firm Profile: all users can view, admin-only edit. Teams: admin-only. Admin panel shows redirect notice.

### 1.5.2 — Universal Persistent Memory + Exports
**Status:** ✅ COMPLETE (2026-04-26)  
**Pages getting persistence:** Research (chat history → `researchHistory[]`, cap 50), Deep Research (synthesis → `deepResearchSynthesis`, query log → `deepResearchHistory[]`), Conflict (AI analysis → `conflictAnalysis`), Draft (versions → `draftVersions[]`, last 5).  
**New shared component:** `ExportButton` (PDF via print, Markdown download, CSV).  
**Pages getting export:** Strategy (PDF), Judge Intel (PDF), Conflict (PDF), Research (Markdown), Deep Research (PDF/Markdown), Billing (PDF invoice), Timeline (PDF), Deadlines (PDF).  
All new fields go into JSONB metadata — no migration needed.

### 1.5.3.1 — Document Branding
**Status:** ✅ COMPLETE (2026-04-26)  
Canvas API logo transparency tool. Letterhead builder with live preview (Logo Left / Center / Text Only). `Letterhead.tsx` component injected into all PDF exports via `@media print`. New AppSettings fields: `letterheadLayout`, `letterheadImageUrl`.

### 1.5.3.2 — Vault: Context Library + Redaction + ACP RLS
**Status:** ✅ COMPLETE (2026-04-26) — Migration 020 applied  
Split vault into Confidential Vault (existing, ACP RLS enforced server-side) and Context Library (non-confidential docs that enrich ARES via lexMemory L3 nodes). Redaction toolbar: regex patterns for SSN, SA ID, plus user-selected name redaction; creates `redacted: true` copy. Attorney warning modal required before adding to Context Library (acknowledgement logged in audit_log).

### 1.5.4 — Credit Economy Overhaul
**Status:** ✅ COMPLETE (2026-04-27) — Migration 021 applied  
Replace USD budget enforcement with unified credit system. `credit_balance` table (monthly, per user). `action_log` table (all actions, not just AI). `credits_monthly` column on plans. `deduct_credits()` RPC. New `credits.ts` middleware replaces `quota.ts`. Hard block at 100% for free tier; 110% grace for paid. Cooldown: 15 min after exhaustion. Display: both credit cost and dollar equivalent to users. Use `claude-opus-4-7` for all plan copy generation.

**Approved credit-to-dollar rate:** 1 credit = $0.65 USD (provisional, calibration required).  
**Credits expire:** Yes, monthly. No rollover. Admin bonus credits: 90-day expiry.

### 1.5.4.1 — Plan Updates All Surfaces
**Status:** ✅ COMPLETE (2026-04-27)  
Update Supabase plans table, Render API middleware, web Settings billing tab, UsagePill, UpgradeCTA, admin Quota tab, marketing/landing pages.

### 1.5.4.2 / 1.5.4.2.1 — Fair Use + Compliance
**Status:** ✅ COMPLETE (2026-04-27)  
First-session disclaimer banner (non-blocking). TOS acceptance gate (`user_roles.tos_accepted_at`). `/legal/terms` and `/legal/privacy` pages. Upgrade prompt on every feature gate hit. Free tier: "You've used your free [feature]. Upgrade to Starter for N uses/month."

### 1.5.2b — Admin Usage Logging + Abuse Detection
**Status:** ✅ COMPLETE (2026-04-27) — Migration 022 applied  
`user_sessions_ext` table (session_id, device_fingerprint, ip_address, user_agent, is_revoked). `abuse_flags` table. `suspended_until/suspension_reason` cols on `user_roles`. RPCs: `record_session()` (revokes all prior — single-session enforcement), `get_user_detail()` (admin drawer data), `revoke_user_sessions()`, `suspend_user()`, `unsuspend_user()`, `update_session_seen()`. FingerprintJS v4 free tier installed (`@fingerprintjs/fingerprintjs`), cached in localStorage. `session-id.ts`: rotates UUID on each login. `api.ts`: sends `X-Session-Id` + `X-Device-Fingerprint` headers, handles `X-Session-Invalid` response → auto sign-out. `auth.tsx`: calls `record_session()` on every sign-in. `session.ts` API middleware: validates session on `/api/anthropic/messages`. CORS updated to expose `X-Session-Invalid`. `UserDetailDrawer.tsx` component (tabs: Overview, Sessions, Actions, Abuse Flags; actions: Revoke Sessions, Suspend, Unsuspend). Admin user management table: detail button opens drawer. API error genericization: waterfall errors stripped of provider names for non-admin users.

### 1.5.5 — Feedback & Bug Report System
**Status:** ✅ COMPLETE (2026-04-26) — Migration 023 applied  
`feedback` table (type, title, body, status, priority, metadata). `/feedback` page with three tabs: Bug Report, Feature Request, General Feedback. Auto-capture: page URL, user agent, plan, user ID. Admin "Feedback" tab in administration panel with status/priority management.

### 1.5.6 — IP Protection + Confidentiality
**Status:** ✅ COMPLETE (2026-04-27)  
- API error genericization: waterfall errors no longer expose provider names or internal model identifiers to non-admin users — error message is now "AI service temporarily unavailable."
- TOS + Privacy pages: existed and complete at `/legal/terms` and `/legal/privacy`.
- Deferred (legal): Patent research on LexMemory compression system, trade secret documentation, competitor monitoring alerts, `X-Robots-Tag` header on API routes.

---

## Sprint Plan

```
Sprint 1 (~5 days, no DB):             ✅ COMPLETE 2026-04-26
  1.5.1  → Firm Profile + Teams to Settings
  1.5.5  → Feedback system (migration 023)
  1.5.6  → License, GitHub hardening, source map disable

Sprint 2 (~5 days, JSONB only):        ✅ COMPLETE 2026-04-26
  1.5.2  → Persistence: research, deep research, conflict, draft
  1.5.2  → Exports: 8 pages + ExportButton component

Sprint 3 (~5 days, migration 020):     ✅ COMPLETE 2026-04-26
  1.5.3.1 → Branding: letterhead builder, logo transparency
  1.5.3.2 → Vault: Context Library, redaction, ACP RLS, attorney warning

Sprint 4 (~9 days, OWNER APPROVED):    ✅ COMPLETE 2026-04-27
  1.5.4   → Credit economy overhaul (migrations 021 applied)
  1.5.4.1 → Plan updates all surfaces (credits middleware, UsagePill, UpgradeCTA)
  1.5.4.2 → Fair use, compliance, DisclaimerBanner, CreditExhaustedError all pages

Sprint 5 (~5 days, migration 022):     ✅ COMPLETE 2026-04-27
  1.5.2b  → Admin user detail, fingerprinting, single-session, abuse detection
  1.5.6   → TOS/Privacy pages, API error genericization

```

---

## Audit History

| Date | Score | Research | Strategy | Judge | Draft | Conflict |
|------|-------|----------|----------|-------|-------|----------|
| 2026-04-25 | 92.4 | 88 | 96 | 96 | 86 | 96 |

**Known gaps from last audit:**
- Draft 86: missing doc drafting rules (ARES v3.0 fixes this)
- Grader reliability: was using Groq Haiku to grade Groq output (circular) — fixed in V1.3.0
- Streaming: absent — deferred to Phase D (V1.3.0)
- Conflict: was raw anthropicFetch (not withLexMemory) — fixed in V1.3.0

**Target for v1.5:** All features ≥90, Draft ≥95, Overall ≥94.

---

## Deferred (Do Not Touch Until Noted)

| Item | Why deferred | Trigger to resume |
|------|-------------|-------------------|
| Lemon Squeezy billing | Credit economy overhaul replaces this | After 1.5.4 ships |
| EU GDPR / SA POPIA | USA-only focus for now | Phase 9+ |
| Anthropic partner program | Platform key model chosen instead | Never |
| Per-matter ACL editor | Complex, low priority | Phase 10+ |
| LexMemory for non-case contexts | Wait for audit score threshold | Overall ≥94 |
| Patent filing | Needs legal review | After IP research |
