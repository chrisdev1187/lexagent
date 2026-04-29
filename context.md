# LexAgent — Codebase Context (read first)

**Updated:** 2026-04-29 · v1.10 ARES wiring shipped

## URLs
- web: https://lexagent-ochre.vercel.app
- api: https://lexagent-0o5u.onrender.com (Render free, sleeps 15min)
- db: mgiqicasllvisiwvbiuu.supabase.co
- gh: https://github.com/chrisdev1187/lexagent

## Tree (top 2)
```
apps/api/src/{routes,middleware,lib}
apps/web/{app,lib,components,hooks,providers}
supabase/migrations/  (001–024 applied)
DEVLOG.md  (SSOT in repo)
context.md (this)
```

## Permanent architecture
- BYOK Anthropic free; platform key paid
- 9-LLM waterfall: Mistral #1 → Llama-3.3-70B fleet (Groq, Cerebras, SambaNova, OpenRouter, NVIDIA) → xAI → Gemini ×2
- localStorage only for API keys
- matters.metadata JSONB for dynamic fields; matters.shared kept as legacy
- Roles: admin / member / owner; suspension cols on user_roles
- Single-session via record_session RPC
- claude-opus-4-7 for plan copy
- 1 credit = $0.65 compute (provisional)

## Key files (1-line each)

### apps/api/src
- routes/anthropic.ts — 9-provider waterfall + X-Eval-Run
- routes/billing.ts — stripe portal/checkout
- routes/{cap,congress,courtlistener,ecfr,edgar,govinfo,openstates,regulations,uspto}.ts — gov feeds
- routes/healthdeep.ts — deep health probe
- middleware/auth.ts — Bearer JWT; fails closed (503) on Supabase outage ✅
- middleware/session.ts — checks user_sessions_ext.is_revoked via X-Session-Id
- middleware/ratelimit.ts — in-process token bucket; not multi-instance
- middleware/{credits,quota,free_tier,telemetry}.ts — gates + access log

### apps/web
- app/(auth)/{login,reset-password}/page.tsx
- app/(app)/admin/page.tsx — 14-tab admin (1912 LOC)
- app/api/admin/{create,delete,set-password}-user/route.ts — service-role CRUD
- app/api/admin/_lib.ts — requireAdmin() JWT + role
- app/api/ares-eval/route.ts — eval harness endpoint
- lib/auth.tsx — AuthProvider, useAuth, get_my_role RPC, recordSession on login
- lib/session-id.ts — localStorage lex_session_id
- lib/api.ts — anthropicFetch, X-Session-Id propagation
- lib/settings.ts — ARES system prompt v5 (~1740 tok)
- lib/db.ts — loadMatters / upsertMatter
- lib/audit.ts — logAudit()
- lib/lex-memory/ — 4-level (L1 Raw → L4 Theme); extract.ts uses canonical shadow-schema types ✅
- lib/ares/index.ts — barrel
- lib/ares/shadow-schema.ts — strict AresShadow
- lib/ares/critic.ts — evaluator-optimizer, 1-rev cap, PROHIBITED_PATTERNS
- lib/ares/critic-llm.ts — 9-LLM waterfall via criticJson
- lib/ares/debate.ts — movant/respondent/judge 3-call
- lib/ares/tools/registry.ts — dispatch
- lib/ares/tools/cite-verify.ts — CL Citation-Lookup + subsequent-history
- lib/ares/tools/subsequent-history.ts — eyecite substitute (local-context + CL cited-by)
- lib/ares/tools/{cite-lookup,posture-detect,ethics-check,plan-check}.ts
- lib/eval/{types,metrics,runner,gold-set,index}.ts — 16q gold set + Brier
- hooks/useFingerprint.ts — FingerprintJS v4, 1hr cache lex_fp
- components/admin/UserDetailDrawer.tsx — 467 LOC; sessions/actions/abuse/suspend
- components/shared/{VersionBadge,VersionPill}.tsx — read NEXT_PUBLIC_APP_VERSION

### supabase/migrations
- 001–019: baseline, RLS, roles, RPCs
- 018_get_my_role — SECURITY DEFINER
- 020 vault_context · 021 credit_economy · 022 telemetry · 023 feedback · 024 ares_v5_telemetry
- 022 adds: user_sessions_ext, abuse_flags, suspension cols on user_roles, RPCs: record_session, update_session_seen, get_user_detail, revoke_user_sessions, suspend_user, unsuspend_user

### Client storage keys
- lex_session_id · lex_fp

## State (v1.7 audit complete 2026-04-28)
- ✅ ARES v5 prompt-only
- ✅ ARES v6: critic + debate + eval harness + subsequent-history
- ✅ Mistral-large-latest at waterfall #1
- ✅ v1.7.1 security pass (7/13 gaps fixed; 6 deferred)
- ✅ Migration 026: heavy_usage abuse trigger (⏳ apply in prod Supabase)
- ✅ Migration 024: ares_v5_telemetry (⏳ apply in prod Supabase)
- ✅ Settings → Security tab + ChangePasswordSection
- ✅ API auth: suspension enforcement → 403 + AccountSuspendedError
- ✅ Admin → ARES tab: Gold Set Eval button wired to /api/ares-eval
- ✅ /administration → redirects to /admin; sidebar fixed
- ✅ v1.7.2–v1.7.6 audited: no regressions; billing invoice + enrichment UI tabs deferred to v1.8
- ✅ v1.10: with-lex-memory→aresCritic (criticScore populated in ai_usage) 
- ✅ v1.10: strategy + deep-research → postureDetect → aresDebate (msj/appeal)
- ⏳ citeVerify(context) wiring
- ⏳ Smoke test waterfall order · Run eval for v5 baseline
- ⏳ Migrations 024 + 026 — apply in prod Supabase

## v1.7 audit — COMPLETE (2026-04-28)
- 1.7.1 Users & onboarding — ✅ DONE (7/13 gaps fixed; 6 deferred)
- 1.7.2 Admin — ✅ DONE (eval button wired)
- 1.7.3 Settings — ✅ DONE (Security tab + ChangePasswordSection)
- 1.7.4 Billing — ✅ AUDITED (CSV export exists; invoice generation → v1.8)
- 1.7.5 Matters — ✅ AUDITED (all 14 sub-pages clean; no broken code)
- 1.7.6 Enrichment — ✅ AUDITED (all 10 routes healthy; GovInfo/USPTO/OpenStates UI → v1.8)

## v1.7.1 gap status
1. ✅ record_session IP — FIXED (migration 025, API route reads x-forwarded-for)
2. ❌ No SAML/OIDC SSO — DEFERRED
3. ❌ No magic link · 2FA · CAPTCHA — DEFERRED
4. ❌ Email-alias detection — DEFERRED
5. ✅ ">5× avg daily" abuse signal — FIXED (migration 026)
6. ✅ requireAuth fails open — FIXED (auth.ts → 503)
7. ❌ Rate limiter multi-instance — DEFERRED (needs Redis)
8. ✅ No user sessions panel — FIXED (Settings → Security tab)
9. ❌ No invite-acceptance UX — DEFERRED
10. ✅ No suspension UX — FIXED (API returns 403 + AccountSuspendedError)
11. ✅ signUp enumeration — FIXED (auth.tsx anti-enumeration)
12. ❌ Trusted device flow — DEFERRED
13. ✅ resetPassword redirectTo — FIXED (NEXT_PUBLIC_SITE_URL)

## v1.8 — SHIPPED (2026-04-28)
1. ✅ Guided intake: NewMatterModal → 3-step wizard (info → AI conflict check → confirm + engagement letter draft)
2. ✅ Cite scan: citations page "Scan Full Document" → AI extracts citations from pasted brief → auto-populates verify queue
3. ✅ Research memo: research page "Memo" button → AI formats conversation as formal legal memo → MD/PDF export
4. ✅ Deadline calc: deadlines page "AI Deadline Calculator" → trigger event + jurisdiction → computes procedural deadlines → bulk-add to matter

## v1.10 — SHIPPED (2026-04-29)
1. ✅ ARES critic wiring: with-lex-memory.ts calls aresCritic() after every response; persisted_score → ai_usage.critic_score
2. ✅ ARES debate wiring: strategy + deep-research pages run postureDetect → aresDebate(msj/appeal) before main ARES call; judge synthesis prepended to user content

## v1.9 — SHIPPED (2026-04-28)
1. ✅ Template library: draft tab "Quick Templates" → per-doc-type preset instruction chips (MTD 12b6/12b1, MSJ, briefs, demand letters, etc.) → click to pre-fill instructions textarea
2. ✅ Missing fields quick-fill: draft tab amber callout when court/caseNumber/parties/judgeName absent → inline inputs save to matter on blur → improves draft without navigating away
3. ✅ Clause snippet bank: save instructions as named snippet (persisted in matter.snippets JSONB, 20-cap) → append to instructions; delete per-snippet; bank auto-hides when empty

## Hard rules
- No budget — all AI via lib/ares/critic-llm.ts → 9-LLM waterfall, never direct Haiku/Opus
- Cannot test without commit + push to origin/master
- RTK prefix on all Bash calls (manual; no hook on Windows)
- DEVLOG.md is in-repo SSOT
- **Caveman mode (2026-04-28):** 1K/prompt max · Grep before Read · no full Reads >100 LOC · no agent spawns · diffs not files

## Update protocol
Update this file at end of every sprint commit. Treat as code. Stale context.md = lying to future-self.
