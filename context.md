# LexAgent — Codebase Context (read first)

**Updated:** 2026-04-28 · v1.6.0 shipped · v1.7.1 inventory done

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
- middleware/auth.ts — Bearer JWT; **fails open to anon on Supabase outage (smell)**
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
- lib/lex-memory/ — 4-level (L1 Raw → L4 Theme); extract.ts has duplicate looser AresShadow type
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

## State (v1.6.0 pushed 2026-04-28)
- ✅ ARES v5 prompt-only
- ✅ ARES v6: critic + debate + eval harness + subsequent-history
- ✅ Mistral-large-latest at waterfall #1
- ⏳ Wiring: with-lex-memory→aresCritic · pages→aresDebate (msj/appeal) · citeVerify(context) · admin→/api/ares-eval button
- ⏳ Smoke test new waterfall order
- ⏳ Run eval for v5 baseline

## v1.7 audit roadmap
- 1.7.1 Users & onboarding — **inventory done** (gaps below)
- 1.7.2 Admin · 1.7.3 Settings · 1.7.4 Billing · 1.7.5 Matters · 1.7.6 Enrichment

## v1.7.1 gaps (13)
1. record_session called from browser with p_ip_address: null → IP-cluster signal dead
2. No SAML/OIDC SSO (only Google)
3. No magic link · no TOTP/2FA · no CAPTCHA
4. Email-alias detection unimplemented
5. ">5× avg daily" abuse signal unimplemented
6. requireAuth fails open to anon on Supabase config error
7. Rate limiter in-process; multi-instance unsafe
8. No user-facing "where am I signed in" panel
9. No invite-acceptance UX for team seats
10. No suspension UX (generic 401)
11. signUp leaks "user already exists" (enumeration)
12. No "trusted device" flow
13. resetPassword redirectTo = origin → Vercel preview brittle

## Hard rules
- No budget — all AI via lib/ares/critic-llm.ts → 9-LLM waterfall, never direct Haiku/Opus
- Cannot test without commit + push to origin/master
- RTK prefix on all Bash calls (manual; no hook on Windows)
- DEVLOG.md is in-repo SSOT
- **Caveman mode (2026-04-28):** 1K/prompt max · Grep before Read · no full Reads >100 LOC · no agent spawns · diffs not files

## Update protocol
Update this file at end of every sprint commit. Treat as code. Stale context.md = lying to future-self.
