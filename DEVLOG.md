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
| 024 | ares_v5_telemetry | ⏳ PENDING | `prompt_version`, `mode`, `tool_calls`, `critic_score` columns on `ai_usage` + `get_admin_ares_version_split()` RPC |
| 025 | record_session_user_id | ✅ | record_session() accepts p_user_id; auth.tsx routes through /api/record-session so x-forwarded-for IP is captured |
| 026 | abuse_heavy_usage | ⏳ PENDING | check_heavy_usage() trigger on ai_usage: flags heavy_usage if today > 5× 30d avg (min avg 3 req/day) |

---

## Key File Map

| File | Purpose |
|------|---------|
| `apps/api/src/routes/anthropic.ts` | 9-provider LLM waterfall |
| `apps/api/src/middleware/quota.ts` | Budget enforcement (→ credits.ts in v1.5.4) |
| `apps/api/src/middleware/free_tier.ts` | Free tier per-tool-per-matter gating |
| `apps/web/lib/api.ts` | `anthropicFetch()`, error classes |
| `apps/web/lib/settings.ts` | AppSettings, DEFAULT_SETTINGS, ARES v5.0 system prompt, `ARES_PROMPT_VERSION` |
| `apps/web/lib/ares/` | ARES v6 tool registry (cite_verify, cite_lookup, posture_detect, ethics_check, plan_check, draft_skeleton_load, retrieval_query) + shadow-schema runtime guards |
| `apps/web/lib/ares/tools/cite-verify.ts` | Bluebook parser + CourtListener Citation-Lookup wrapper |
| `apps/web/lib/ares/tools/cite-lookup.ts` | Case-name search via CourtListener |
| `apps/web/lib/ares/tools/posture-detect.ts` | Procedural-posture classifier on the waterfall small-model tier |
| `apps/web/lib/ares/tools/ethics-check.ts` | Constitutional-AI Model Rules walkthrough on the waterfall |
| `apps/web/lib/ares/tools/plan-check.ts` | Plan-then-Execute validator on the waterfall |
| `apps/web/lib/ares/critic-llm.ts` | Small-model wrapper that maps "haiku" requests through `anthropicFetch` to the 9-LLM waterfall (free) |
| `apps/web/lib/ares/critic.ts` | **(2026-04-28)** Evaluator-Optimizer rubric scorer + 1-revision optimizer; `aresCritic()` → `{score, revised_draft, persisted_score}` |
| `apps/web/lib/ares/debate.ts` | **(2026-04-28)** 3-call orchestrator for MSJ/appeal posture: movant + respondent + judge synthesizer |
| `apps/web/lib/ares/tools/subsequent-history.ts` | **(2026-04-28)** Practical eyecite substitute: local-context phrase scan + CL cited-by snippet scan; conservative thresholding |
| `apps/web/lib/ares/shadow-schema.ts` | `ares.shadow.v1` JSON schema types + `validateShadow()` |
| `apps/web/lib/eval/types.ts` | **(2026-04-28)** EvalQuestion, EvalRun, EvalMetrics, EvalAggregate, EvalComparison schemas |
| `apps/web/lib/eval/metrics.ts` | **(2026-04-28)** computeMetrics, aggregate, compareGates — pure functions over runs |
| `apps/web/lib/eval/runner.ts` | **(2026-04-28)** Concurrency-bounded gold-set runner with injectable model fetcher |
| `apps/web/lib/eval/gold-set.ts` | **(2026-04-28)** 16-question seed (4 postures × 4 jurisdictions) |
| `apps/web/app/api/ares-eval/route.ts` | **(2026-04-28)** Admin-only POST endpoint to run the eval against the configured prompt |
| `apps/web/lib/supabase.ts` | Supabase browser client |
| `apps/web/lib/db.ts` | `loadMatters`, `upsertMatter` |
| `apps/web/lib/auth.tsx` | AuthProvider, useAuth, isAdmin, userRole |
| `apps/web/lib/quota.ts` | `getQuotaStatus()`, quota helpers |
| `apps/web/lib/audit.ts` | `logAudit()` wrapper for audit_log |
| `apps/web/lib/lex-memory/` | LexMemory 4-level hierarchy — types, compress, rank, extract (shadow JSON aware), merge, usage-logger |
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

| # | Provider | Small/Critic Model | Main Model |
|---|----------|--------------------|-----------|
| 1 | **Mistral** | mistral-small-latest | **mistral-large-latest** |
| 2 | Groq | llama-3.1-8b-instant | llama-3.3-70b-versatile |
| 3 | Cerebras | llama3.1-8b | llama-3.3-70b |
| 4 | SambaNova | (same) | Meta-Llama-3.3-70B-Instruct |
| 5 | OpenRouter | meta-llama/llama-3.3-70b-instruct:free | (same) |
| 6 | NVIDIA | (same) | meta/llama-3.3-70b-instruct |
| 7 | xAI | grok-3-mini | grok-3-mini |
| 8 | Gemini | gemini-2.0-flash | gemini-2.0-flash |
| 9 | Gemini-2 | gemini-2.0-flash | gemini-2.0-flash |

**2026-04-28 reordering:** Mistral promoted to position 1 with `mistral-large-latest` on the main tier (was position 7, small-only). Critic / haiku-class requests still drop to `mistral-small-latest` for speed. Reasoning: Mistral-Large beats the Llama-3.3-70B fleet on legal reasoning benchmarks and stays free under Mistral's free-tier RPM. Llama providers retained as failover.

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

## v1.6 Roadmap — ARES v5 / v6 Upgrade (Plan: `~/.claude/plans/jaunty-dazzling-horizon.md`)

Comprehensive prompt + agent-architecture upgrade. Ships in three tiers: **v5** (prompt-only, deployable now), **v6** (tool registry + critic loop + multi-agent debate, 1 quarter), **v6.x** (moonshots).

### 1.6.0 — ARES v5.0 Prompt Rewrite
**Status:** ✅ COMPLETE (2026-04-27)  
- `apps/web/lib/settings.ts` `DEFAULT_SYSTEM` rewritten from v3.0 (~1,400 tok) to v5.0 (~1,740 tok).
- New `ARES_PROMPT_VERSION = "5.0"` export.
- New behaviors: Verbosity Tier Selector (LITE/STANDARD/DEEP), Plan-then-Execute Toggle (complexity ≥ 3), Embedded Evaluator Loop (max 1 self-revision), Devil's-Advocate Pass (2–3 OC rebuttals before BOTTOM LINE), Tool-Call READY Syntax (`<<TOOL_REQUEST: cite_verify {...}>>`), Verbalized Confidence (`{p=0.XX}` per claim, 5-bucket calibration anchor table), Ethics Circuit (formal Model Rules walkthrough on 6 triggers — Rules 3.3, 3.4, 1.6/1.7/1.9, 4.2, 3.5), Bluebook 22nd ed. Rule 18.3 for AI cites.
- New flags: `[CONFIDENCE: low|med|high]`, `[ETHICS-REVIEW: Model Rule X.Y — outcome]`.
- New required output: Shadow JSON `ares.shadow.v1` block at end of STANDARD/DEEP responses (issues, holdings, cites with confidence + subsequent_history, circuit_splits, counterarguments, flags, confidence object, bottom_line, tool_requests, ethics_review).
- Admin reset button + settings page now display `v{ARES_PROMPT_VERSION}` badge.
- Memory: `ares_core.md` rewritten as v5; new `ares_v3_to_v5_diff.md` documents token budget delta and feature justifications.
- TypeScript build green.
- **Backward-compat:** zero changes to 6 matter feature pages, zero changes to `with-lex-memory.ts`, zero migrations. Single git revert restores v3.

### 1.6.1 — Shadow JSON Consumer + ai_usage telemetry
**Status:** ✅ CODE COMPLETE / migration 024 PENDING APPLY  
- `apps/web/lib/lex-memory/extract.ts` rewritten: parses `ares.shadow.v1` JSON blocks (`parseAresShadow()`); maps `cites[]` → Level3Authority (carries `verified_via`, `subsequent_history`, confidence), `counterarguments[]` + `holdings[]` → Level3Strategy, `flags[]` + `circuit_splits[]` + `issues[]` → Level3OpenQuestion. Regex extraction kept as backstop for v3 responses + anything ARES omits.
- L2 episode summary now prefers `shadow.bottom_line` over caveman-compressed prose; shadow JSON block stripped before fallback compression.
- `apps/web/lib/lex-memory/usage-logger.ts` accepts `promptVersion`, `mode`, `toolCalls`, `criticScore`; written to new columns.
- `apps/web/lib/lex-memory/with-lex-memory.ts` reads shadow on completion, populates the new telemetry fields.
- `supabase/migrations/024_ares_v5_telemetry.sql` adds columns + `get_admin_ares_version_split()` RPC for the admin telemetry tab.

### 1.6.1.1 — v6 Tool Registry Scaffold
**Status:** ✅ COMPLETE  
- New tree at `apps/web/lib/ares/`:
  - `shadow-schema.ts` — `ares.shadow.v1` types + `validateShadow()` runtime guard.
  - `tools/types.ts` — `ToolDefinition<I,O>` plus input/output types for all 7 tools.
  - `tools/registry.ts` — `ARES_TOOLS` record, `getTool()`, `listTools()`, `dispatchTool()`, `parseToolRequests()` (parses v5 `<<TOOL_REQUEST: name {json}>>` prose syntax), `toolToAnthropicWire()` (strips runtime handler for Anthropic tool-use messages).
  - `tools/cite-verify.ts` — `parseCite()` Bluebook parser (case/statute/reg/rule/secondary), reporter↔court plausibility, year plausibility, CL Citation-Lookup resolution. Returns `{ ok, normalized, type, reporter_match, year_plausible, subsequent_history, confidence, source_url }`. Subsequent-history detection is `unknown` until eyecite JS port lands (1.6.3 follow-on).
  - `tools/cite-lookup.ts` — case-name search via existing `searchOpinions()`, returns ranked candidates filtered by year ±1.
  - `index.ts` — public barrel.
- 5 remaining tools (`posture_detect`, `ethics_check`, `plan_check`, `draft_skeleton_load`, `retrieval_query`) registered with throwing handlers — schemas stay in sync with the prompt; v6 wave B wires the waterfall-backed handlers (see 1.6.1.2).
- TypeScript compilation green.

### 1.6.1.2 — Wave B Critic Tools on the 9-LLM Waterfall (no Haiku spend)
**Status:** ✅ COMPLETE (2026-04-28)
**Why this exists:** budget = $0. Original plan called for Haiku-backed critics; we instead route critic calls through the existing 9-provider waterfall (`apps/api/src/routes/anthropic.ts`). Free for admin/free tier; cheap-to-free for paid users via the same upstream chain. Cost saving: ~100% vs direct Haiku calls.
- `apps/web/lib/ares/critic-llm.ts` — `critic()` and `criticJson<T>()` wrappers around `anthropicFetch`. Pin model id `claude-haiku-4-5-20251001`; the proxy translates "haiku" requests to the small-model row of each provider (llama-3.1-8b on Groq/Cerebras, gemini-2.0-flash, etc.). Strict JSON variant walks balanced braces so trailing prose is tolerated.
- `apps/web/lib/ares/tools/posture-detect.ts` — classifies `pre-lit | pleadings | discovery | msj | trial | appeal` from a fact summary; returns confidence + 0–3 implied deadlines. Graceful fallback (`pleadings`, conf 0.3) if waterfall is unavailable.
- `apps/web/lib/ares/tools/ethics-check.ts` — Constitutional-AI walkthrough on a Model Rules constitution (1.1, 1.3, 1.6, 1.7/1.9, 3.1, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.5, 7.x, 8.4(c) + Bluebook Rule 18.3). Returns `{ rules_implicated, severity: ok|modify|decline, permissible_alternative }`. Severity is normalized; an alternative is always provided.
- `apps/web/lib/ares/tools/plan-check.ts` — validates Plan-then-Execute numbered plans against the 7-step rubric (INTAKE→DELIVER, jurisdiction/posture/controlling authority, counterargs, verify, BOTTOM LINE). Returns `{ complete, missing_steps, estimated_tokens }`. Token estimate clamped to 200–8000.
- `tools/registry.ts` updated: 3 throwing handlers replaced with real waterfall-backed implementations. `apps/web/lib/ares/index.ts` re-exports `postureDetect`, `ethicsCheck`, `planCheck`, `critic`, `criticJson`, `ARES_CRITIC_MODEL`.
- TypeScript compilation green.
- **Outstanding wave B:** `draft_skeleton_load` (template registry), `retrieval_query` (CAP FAISS + CL hybrid), `critic.ts` (multi-pass evaluator-optimizer loop), `debate.ts` (3-call orchestrator), `matter-graph.ts`, `adversarial-doc.ts`. eyecite JS port still required for true `subsequent_history` in `cite_verify` (currently `unknown`).

### 1.6.2 — Eval Harness MVP
**Status:** ✅ MVP COMPLETE (2026-04-28) — gold-set expansion 16→200 deferred to content sprint.
- `apps/web/lib/eval/types.ts` — schemas for `EvalQuestion`, `EvalRun`, `EvalMetrics`, `EvalAggregate`, `EvalComparison`. Per-question gold-set fields: `expected_outcome`, `expected_counterarg_count`, `required_authorities`, `prohibited_authorities`.
- `apps/web/lib/eval/metrics.ts` — pure functions: `computeMetrics()`, `aggregate()`, `compareGates()`. Cite-hallucination heuristic uses Bluebook reporter / year structural sanity (eyecite-class verification deferred to 1.6.3 path). Counterargument coverage prefers shadow JSON, falls back to header sweep. Brier term computed against `expected_outcome`. Latency p50/p95.
- `apps/web/lib/eval/runner.ts` — concurrency-bounded gold-set runner, configurable fetcher, per-question abort/timeout. Default concurrency 2 (waterfall safe).
- `apps/web/lib/eval/gold-set.ts` — 16-question seed: 4 postures (pleadings, discovery, msj, appeal) × 4 jurisdictions (federal, ca, ny, tx). Plausible facts, no real client matters, conservative `required_authorities` (empty) until verified.
- `apps/web/app/api/ares-eval/route.ts` — admin-only POST endpoint. Runs current `DEFAULT_SYSTEM` (or caller-supplied `systemPrompt`) against gold set, forwards admin Bearer token to Render API, returns aggregate + per-question metrics + trimmed run details.
- Ship gates wired: `hallucinated_per_100 ≤ 2`, `counterarg_coverage ≥ 0.7`, `bottom_line_present_rate = 1`, `brier ≤ 0.2`, `latency_p50 ≤ 1.1×baseline` via `compareGates()`.
- TypeScript + production build green.
- **Outstanding:** expand seed gold set to 200 (5 postures × 4 jurisdictions × 10), wire admin UI tab to POST /api/ares-eval and render comparison table, integrate LegalBench-RAG-mini external runner.

### 1.6.3 — v6 Tool Registry + Citation Grounding Loop
**Status:** PARTIAL — cite_verify (with subsequent-history), cite_lookup, posture_detect, ethics_check, plan_check, critic, debate ✅; draft_skeleton + retrieval_query + matter_graph + adversarial-doc PENDING.
New tree under `apps/web/lib/ares/`:
- `tools/registry.ts` — 7 named tools, dispatcher. ✅
- `tools/cite-verify.ts` — Bluebook parser + CourtListener Citation-Lookup + subsequent-history. ✅ (2026-04-28: now consults `subsequent-history.ts`; caps confidence on `overruled` to 0.25 and `distinguished` to 0.75; flips `ok=false` when `overruled`. Accepts optional `context` field for local-context phrase scan.)
- `tools/subsequent-history.ts` — **NEW (2026-04-28)** practical eyecite JS substitute. Two-layer detection: (a) local-context phrase scan for Bluebook signal phrases (`overruled by`, `abrogated by`, `rev'd`, `distinguished`, `questioned in`, `criticized in`, `vacated`, `superseded by statute`); (b) CourtListener cited-by snippet scan via `/search/?q="<cite>"&type=o&order_by=dateFiled` with target-mention boost. Conservative thresholding (Plan Risk #4): `overruled` only on explicit signal; `distinguished` advisory; `ok` requires no negative hits AND ≥1 positive citation across ≥2 results. Combiner picks the more severe of local + CL. Returns `{ status, evidence, source }`.
- `tools/cite-lookup.ts` — CL search wrapper for name-only cites. ✅
- `tools/ethics-check.ts` — Constitutional-AI critic over Model Rules, on the waterfall small-model tier. ✅
- `tools/posture-detect.ts` — small-model classifier on the waterfall. ✅
- `tools/plan-check.ts` — small-model critic on Plan-then-Execute output, on the waterfall. ✅
- `tools/draft-skeleton.ts` — template registry + jurisdiction overlay. PENDING
- `tools/retrieval-query.ts` — CAP FAISS + CL hybrid (Research page only). PENDING
- `critic.ts` — **✅ (2026-04-28)** Evaluator-Optimizer rubric scorer + 1-revision optimizer. Rubric (4 axes): cite_integrity, counterargument_coverage, bottom_line_present, prohibited_phrases. Hard-fail prohibited list (`as an AI language model`, `I cannot provide legal advice`, etc.) flips `passed=false` regardless of score. Weighted overall = 0.5·cite + 0.3·counter + 0.2·BL. PASS threshold 0.7. LITE mode skipped entirely (Risk #1). Optimizer pass on hard fail with capped 12k-char input → re-scored. `persisted_score` field for `ai_usage.critic_score`. Hard cap: 1 revision, never loops.
- `debate.ts` — **✅ (2026-04-28)** 3-call orchestrator (movant + respondent + judge synthesizer). Triggered only on `posture in {msj, appeal}`; other postures return `skipped:true`. Sequential by design (respondent reads movant; judge reads both). Each round on the waterfall via `criticJson()`. Judge returns `predicted_outcome ∈ {movant, respondent, split, uncertain}` + confidence + reasoning + key_points. Graceful degradation: failed rounds return placeholder argument; failed judge falls back to prose `critic()` then to `uncertain` low-confidence default.
- `shadow-schema.ts` — Zod schema + Outlines integration. ✅ (validateShadow + isAresShadow)
- `matter-graph.ts` — typed entity graph extension to LexMemory. PENDING
- `adversarial-doc.ts` — opposing-brief analysis mode. PENDING

**Outstanding wiring (deferred from 2026-04-28 build):**
- `with-lex-memory.ts` does not yet call `aresCritic()` — `criticScore` still hardcoded `null` in the usage-logger payload.
- Strategy / Deep-Research feature pages do not yet detect MSJ/appeal posture and invoke `aresDebate()`.
- `citeVerify()` callers do not yet pass the surrounding draft text as `context` — local-history layer is currently dormant in production. CL cited-by layer functions independently.

### 1.6.4 — DSPy + LegalBench-RAG CI Gate
**Status:** PARTIAL — base eval endpoint exists (1.6.2); DSPy GEPA + CI workflow pending.
- `apps/web/app/api/ares-eval/route.ts` ✅ — admin-only POST endpoint, runs the gold set against the configured prompt. Foundation for the nightly DSPy loop.
- `.github/workflows/ares-eval.yml` PENDING — CI gate on PRs touching `lib/settings.ts` or `lib/ares/*`.
- DSPy GEPA optimization loop PENDING — must hold out 30% of internal gold set from training to avoid over-optimization.

### 1.6.x — Moonshots (Exploratory)
**Status:** DEFERRED (post-v6)  
- Probabilistic outcome model (calibrated p(success at MSJ) against historical wins).
- Citation-graph KeyCite-substitute (recency decay + subsequent-history traversal).
- Sub-personas (ARES-Lit / ARES-Trans / ARES-Reg / ARES-Crim) routed by classifier.
- Replay engine (rerun any analysis under v3 / v5 / v6 from audit log).
- Privilege/work-product auto-tagging on output.

### Migration & Rollback Plan
- `AppSettings.aresPromptVersion: "3.0" | "5.0" | "6.0"` registry; admin page exposes toggle.
- Env kill-switch `ARES_FORCE_VERSION` overrides everything (deploys without code change).
- v6 tools opt-in via `tools` arg to `withLexMemory()`; absent = identical to v5. Roll out page-by-page, starting with Research (lowest blast radius).
- Shadow JSON shipped consume-disabled for 2 weeks; flip `extract.ts` only after JSON quality validated against regex baseline.

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

Sprint 6 (v1.6 wave A, no DB):         IN PROGRESS 2026-04-27
  1.6.0   → ARES v5.0 prompt rewrite ✅ (settings.ts + admin/settings UI + memory)
  1.6.1   → Shadow JSON consumer in extract.ts + ai_usage column migration
  1.6.2   → Eval harness MVP (LegalBench-RAG-mini + 200-question gold set)

Sprint 7 (v1.6 wave B, infra):         CODE COMPLETE 2026-04-28 (wiring deferred)
  1.6.1.1 → v6 Tool registry scaffold ✅
  1.6.1.2 → Wave B critic tools on the 9-LLM waterfall (posture/ethics/plan) ✅
  1.6.2   → Eval harness MVP (types/metrics/runner/seed/endpoint) ✅
  1.6.3   → cite_verify (subsequent-history layer: local + CL cited-by) ✅
  1.6.3   → critic.ts (Evaluator-Optimizer, 1-revision cap, LITE-skip) ✅
  1.6.3   → debate.ts (movant/respondent/judge, MSJ/appeal posture) ✅
  1.6.3   → draft_skeleton, retrieval_query, matter-graph, adversarial-doc PENDING
  1.6.4   → DSPy GEPA + CI workflow PENDING (base /api/ares-eval endpoint ✅)
  WIRING  → with-lex-memory→aresCritic, pages→aresDebate, citeVerify→context PENDING

Waterfall reordered 2026-04-28: Mistral promoted #7 → #1 with mistral-large-latest
  on the main tier (was mistral-small-only). Llama-3.3-70B fleet retained as failover.

Sprint 8 (v1.7 system-wide audit):     IN PROGRESS 2026-04-28
  Apply the v5/v6 ARES upgrade methodology to the rest of the platform —
    1. Summarize what we have (current state)
    2. Research better systems / repos / webapps / solutions
    3. "Steal what is best" — adapt and integrate
    4. Ship behind feature flags with regression eval
  Surfaces in scope:
    1.7.1 → Users & onboarding ✅ INVENTORY DONE 2026-04-28 (13 gaps logged in context.md)
    1.7.2 → Admin (UserDetailDrawer, telemetry, abuse, feedback triage) — QUEUED
    1.7.3 → Settings (UI prefs, model selection, BYOK, ethics toggles)   — QUEUED
    1.7.4 → Plan + Credit economy (billing client + admin billing dashboard) — QUEUED
    1.7.5 → Matters (matter list, matter dashboard, attorney views, sharing) — QUEUED
    1.7.6 → Data enrichment + web-scraping agents ("superpower" layer)        — QUEUED

  v1.7.1 Pass A (security + dedup, 4 surgical fixes, 2026-04-28):
    A1 ✅ apps/api/src/middleware/auth.ts — fail closed (503) on Supabase outage
        instead of fail-open-to-anon. Previously masked outages and let
        unauthenticated traffic into authenticated routes.
    A2 ✅ apps/web/lib/auth.tsx — anti-enumeration on signUp. Collapses both
        explicit "already registered" errors and silent identities=[] aliases
        into success-shape so the UI shows the same "check your inbox" copy.
    A3 ✅ apps/web/lib/lex-memory/extract.ts — duplicate AresShadow / AresShadowCite
        types deleted; now re-exports the canonical types from lib/ares/shadow-schema.
        parseAresShadow uses isAresShadow() type guard. Eliminates the type cast
        previously needed in eval/runner.ts.
    A4 ✅ apps/web/lib/auth.tsx — resetPassword reads NEXT_PUBLIC_SITE_URL with
        window.location.origin fallback. Fixes Vercel preview redirects.
    Type-check: web ✅ clean · api ✅ clean.

  v1.7.1 Pass B (2026-04-28):
    B1 ✅ record_session IP gap already CLOSED — migration 025 moved call to
         /api/record-session Next.js route which reads x-forwarded-for. IP-cluster
         signal is live.
    B2 → Email-alias detection RPC (normalize +alias, dot-trick, disposable domains) — DEFERRED
    B3 ✅ Migration 026: ">5× avg daily usage" abuse trigger on ai_usage INSERT.
         Fires check_heavy_usage() — inserts heavy_usage flag if today > 5× 30d avg
         AND avg ≥ 3 req/day (noise floor). supabase/migrations/026_abuse_heavy_usage.sql

  v1.7.1 Pass C (2026-04-28):
    C1 ✅ "Security" tab in Settings (apps/web/app/(app)/settings/page.tsx):
         Lists active user_sessions_ext rows with device/IP/last-seen + Revoke button.
         Calls revoke_user_sessions() RPC. Current session badge shown; can't self-revoke.
    C2 ✅ API suspension enforcement (apps/api/src/middleware/auth.ts):
         After JWT validation, queries user_roles.suspended_until. If active suspension
         returns 403 { error, reason, suspended_until }. Frontend (api.ts) throws
         AccountSuspendedError — callers can show human-readable message instead of
         generic "Auth error".
    C3 → Magic link · TOTP · CAPTCHA on signup — DEFERRED (Supabase auth changes)

  v1.7.1 Pass D (2026-04-28):
    D1 ✅ /administration → redirects to /admin. Sidebar updated to href="/admin".
         Old page now renders null + router.replace("/admin") on mount.
    D2 → Rate limiter to multi-instance store (Redis on Render addon) when scale demands

  v1.7.2 Admin (2026-04-28):
    ✅ ARES tab: Gold Set Eval button wired. POSTs /api/ares-eval (16q, concurrency 2),
       displays accuracy / correct/total / Brier score / duration inline. Was ⏳ in
       context.md since v1.6.0.

  v1.7.3 Settings (2026-04-28):
    ✅ ChangePasswordSection added to Settings → Profile tab. Input validation:
       min 8 chars, confirm match. Calls supabase.auth.updateUser({ password }).
       TypeScript clean. Commit 21a549f.
    ✅ Security tab (committed prior session): user_sessions_ext list, Revoke button,
       current-session badge. (logged under v1.7.1 Pass C1.)

  v1.7.4 Billing (2026-04-28):
    AUDIT FINDING: billing/page.tsx has time entry CRUD + CSV export + summary stats.
    No formal invoice generation — deferred to v1.8. Scope: invoice generation from
    time entries is a distinct feature (PDF, matter header, attorney/client fields).
    No broken code; existing functionality is complete and functional.

  v1.7.5 Matters (2026-04-28):
    AUDIT FINDING: All 14 matter sub-pages checked (billing, citations, conflict,
    deadlines, deep-research, draft, judge, notes, overview, research, strategy,
    timeline, vault). No TODO/FIXME/broken code found. Persistence via matters.metadata
    JSONB. Data integrity confirmed — no data-loss risk. Clean pass.

  v1.7.6 Enrichment (2026-04-28):
    AUDIT FINDING: All 10 API routes registered in index.ts and functional.
    CAP returns clean 410 Gone (decommissioned; handled gracefully). Deep-research UI
    exposes 4 sources (congress, ecfr, courtlistener opinions, edgar). GovInfo,
    OpenStates, USPTO, Regulations.gov routes exist at API layer but no UI tabs —
    deferred to v1.8 (new feature addition, not a bug). Admin API-keys tab already
    has fields for GovInfo/OpenStates keys. Clean pass.

  v1.7 Sprint COMPLETE (2026-04-28):
    All 6 surfaces audited. No regressions introduced. Deferred items logged in
    context.md v1.8 roadmap. Next: v1.8 attorney workflow features.

  v1.7 Attorney Workflow Audit (2026-04-28):
    Research: mapped 7-stage attorney workflow (intake→filing→billing); 45% time lost
    to admin, 12 hrs/week non-billable. LexAgent strong at stages 3–5 (research/draft/
    cite-check), blind spot at stages 1 (intake), 6 (court filing), 7 (billing admin).
    Gap matrix in plan file: glimmering-sniffing-rivest.md.
    OSS repos to steal from: eyecite, Docassemble, Juriscraper, RECAP, CourtListener
    docket alerts.
    v1.8 roadmap: guided intake flow · eyecite full-doc scan · research memo export ·
    deadline calculator.

  Caveman mode activated 2026-04-28:
    1K/prompt max · Grep before Read · no full Reads >100 LOC · no agent spawns ·
    diffs not files. context.md (in repo root) is now SSOT for codebase orientation;
    update at end of every sprint commit. Memory pointer in MEMORY.md.

Sprint 9 (v1.8 — attorney workflow): COMPLETE 2026-04-28
  v1.8 attorney workflow features shipped (4 items from attorney audit plan):
  1. ✅ NewMatterModal → 3-step intake wizard
       Step 1: Matter info (title, client, opposing party, type, jurisdiction, facts)
       Step 2: AI conflict check — POSTs to waterfall, checks against all matters,
               returns CONFLICT_FOUND/RISK/REASON. Advisory + manual review notice.
       Step 3: Confirm + optional engagement letter draft (AI-generated, saved to
               matter metadata as engagementLetter; editable in Draft tab).
  2. ✅ Citations → "Scan Full Document" section
       Paste full brief/motion → AI extracts all legal citations → auto-populates
       the verify queue. Collapses on success. Non-fatal on AI error.
  3. ✅ Research → "Memo" button (visible when conversation has messages)
       AI call formats research conversation as formal legal memo (Questions
       Presented / Brief Answer / Discussion / Conclusion). MD + PDF export
       via existing ExportButton. Dismissable inline panel.
  4. ✅ Deadlines → "AI Deadline Calculator" section
       Select trigger event (complaint filed, MSJ, etc.) + date + jurisdiction
       → AI computes exact YYYY-MM-DD deadlines with rule citations + priority.
       "Add to Matter" bulk-adds parsed deadlines to deadlines list.
  TypeScript clean. Commit b0bc3dd.

Sprint 10 (v1.9 — document assembly): COMPLETE 2026-04-28
  Three new features in apps/web/app/(app)/matters/[id]/draft/page.tsx (commit: see git log):
  1. Template library — DOC_TEMPLATES map (14 doc types, 2-3 presets each); collapsible "Quick Templates"
     section above instructions; click chip → pre-fills instructions, closes panel.
  2. Missing fields quick-fill — QUICK_FILL_KEYS = [court, caseNumber, parties, judgeName]; amber callout
     shown when any are absent; inline lex-input per field; onBlur → updateMatter; no navigation required.
  3. Clause snippet bank — Snippet interface {id, label, text}; stored in matter.snippets JSONB (20-cap);
     "Save snippet" button next to instructions label; saved snippets show in collapsible bank with "Use"
     (appends) and delete per-snippet; bank hidden when empty.
  No migrations — all data via [key: string]: unknown index signature. TypeScript clean.
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

**Target for v1.6 (post-ARES-v5):**
- Citation integrity (eyecite-verifiable %): v3 ~70% (est.) → v5 ≥ 80% → v6 ≥ 97%
- Hallucinated cites per 100: v3 4–6 → v5 ≤ 2 → v6 0
- Counterargument coverage (judge rubric): v3 qualitative → v5 ≥ 70% → v6 ≥ 85%
- Brier score on verbalized confidence: v5 ≤ 0.20, v6 ≤ 0.12
- Median sys-prompt tokens: v5 ≤ 1,800 (current 1,650 v3), v6 ≤ 1,500 (tools replace prose)

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
