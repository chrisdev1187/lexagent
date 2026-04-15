# LexAgent — Master Project Plan

> **Last updated:** 2026-04-14 (Session 4)  
> **Current phase:** Phase 3 — Production Infrastructure  
> **Status:** Monorepo scaffolded, Hono backend + Supabase schema complete — install deps + configure env to run

---

## Product Overview

**LexAgent** is an AI-powered legal practice platform built on the Anthropic API (Claude). Its core engine is branded **ARES** (Autonomous Research & Evidence System). The product is positioned as a direct competitor to Harvey AI, targeting law firms of all sizes with a focus on:

- AI-powered legal research with live database integrations
- Hallucination Shield — real-time citation verification (key differentiator)
- Judge intelligence profiling
- Document drafting and SOL calculation
- Built-in conflict checking

**Primary Competitor:** Harvey AI  
**Secondary Competitors:** Thomson Reuters CoCounsel, Lexis+AI, Clio Duo, Spellbook, EvenUp, Briefpoint

---

## Current System Architecture

```
lexagent-v4.jsx          — Single monolithic JSX file (~3,300+ lines)
lexagent-testrunner.jsx  — Test suite for core AI features
docs/
  LexAgent_SA_Localisation_Report.pdf   — South Africa jurisdiction research
  LexAgent_ZA_Client_Proposal.pdf       — SA client proposal (expansion market)
```

### Runtime Environment
- **Platform:** Claude artifact viewer (sandbox)
- **Storage:** `window.storage` (Claude artifact API) — shared:true for cross-device
- **API:** Direct Anthropic API calls from browser (client-side key)
- **Auth:** None (API key stored in vault)
- **Deploy:** Claude artifact link

### Live Integrations
| Service | Data | Auth |
|---|---|---|
| Anthropic API | Claude Sonnet 4.6 + Opus 4.6 + web search | API key (client-side) |
| CourtListener API | 9M opinions, 18M citations, 16K+ judges | Optional token |
| Harvard Caselaw Access Project | 6.7M cases, 1658–2020 | None (free) |
| GovInfo API | US Code, CFR, Federal Register | Optional key |

### Feature Tabs (11 total)
| Tab | Feature | Status |
|---|---|---|
| Research | AI chat + web search + doc upload + citation verify | Working |
| Deep Research | Multi-pass extended research | Working |
| Vault | Document storage / knowledge base | Working |
| Strategy | JSON-structured case strategy analysis | Working |
| Judge Intel | Live judge profiles from CourtListener | Working |
| Deadlines | SOL calculator + deadline tracking | Working |
| Timeline | Case event timeline builder | Working |
| Shield | Citation audit panel (verified/hallucinated) | Working |
| Draft | Legal document drafting (motions, memos, briefs) | Working |
| Evidence | Notes and evidence tracking | Working |
| Conflict | Conflict-of-interest checker | Working |

---

## Competitive Differentiators

| Feature | LexAgent | Harvey AI | CoCounsel | Lexis+AI |
|---|---|---|---|---|
| Hallucination Shield + citation verify | ✅ Live | ❌ | ❌ | Partial |
| Judge profiling (16K+ judges) | ✅ | ❌ | ❌ | ❌ |
| CourtListener direct integration | ✅ | ❌ | ❌ | ❌ |
| Harvard CAP (360yr archive) | ✅ | ❌ | ❌ | ❌ |
| SOL calculator | ✅ | ❌ | ❌ | ❌ |
| Conflict checker | ✅ | ❌ | ✅ | ❌ |
| Document upload + analysis | ✅ | ✅ | ✅ | ✅ |
| Draft + export (PDF/DOCX) | ✅ | ✅ | ✅ | Partial |
| SA/international jurisdiction | ✅ (planned) | ❌ | ❌ | ❌ |

---

## Phase Roadmap

### ✅ Phase 1 — Analysis & Planning (Complete: 2026-04-14)
- [x] Full codebase audit
- [x] Competitor landscape analysis
- [x] Architecture documentation
- [x] Risk identification
- [x] Phase planning

### 🔄 Phase 2 — Demo UI Overhaul (Active: 2026-04-14)
**Goal:** Enterprise-grade UI within the existing single-JSX-file architecture. Same Claude artifact platform. No backend changes. Full demo capability for law firm pitches.

**Constraints:**
- Must remain a single JSX file (Claude artifact compatible)
- `window.storage` API stays (no localStorage migration yet)
- Client-side Anthropic API key stays (explain as pre-production during demo)
- All 11 tabs must remain functional

**UI Upgrade Targets:**

#### 2.1 Landing / Onboarding (NEW) ✅
- [x] Loading/splash screen with ARES v5 branding, scale icon, animated entry, green shield-active dot
- [x] 3-step onboarding wizard: Welcome → Firm Setup → API Key (OnboardingWizard component)
  - Step 0: Brand reveal, 3 feature highlight cards (Shield, Judge Intel, Research), "Get Started" CTA
  - Step 1: Firm name input + practice area multi-select chips (20 pill buttons, color-coded by PRACTICE_COLORS)
  - Step 2: API key input with "Test" button (live ping to Anthropic), launch CTA
  - Dot progress indicator on steps 1–2; skip option on Step 0
  - Auto-shows when fresh install: no matters AND no API key in vault
  - onComplete callback saves key to vault via saveSettings()

#### 2.2 Dashboard Redesign ✅
- [x] Metrics cards: 4 cards (Active Matters, Citations Verified, Documents Drafted, Shield Status) — 32px serif number, background icon watermark at 0.12 opacity, sub-label copy
- [x] Matter grid: 3-column card grid with colored 3px top accent bar (per practice area), bottom separator, verification count badge
- [x] PRACTICE_COLORS lookup — 12 practice area → color mappings (crimson, cobalt, gold, emerald, violet, amber)
- [x] Empty state: 72px icon, italic serif headline, "Upload a complaint or indictment..." copy, action button
- [ ] Recent activity feed (deferred)
- [ ] Quick action cards (deferred)

#### 2.3 Sidebar / Navigation ✅
- [x] Collapsible sidebar: 52px (collapsed) / 224px (expanded) with CSS width/opacity transitions
- [x] `sidebarCollapsed` state + `sbCollapsed = sidebarCollapsed || isTablet` computed behavior
- [x] "ARES v5 · LEGAL AI PLATFORM" brand header with "SHIELD ACTIVE" green dot indicator
- [x] Collapse toggle button: absolute positioned at right:-12px, rotates 180° on state change
- [x] Icon-only mode when collapsed: colored dots replace matter list cards, labels hidden via `.sidebar-label` class
- [x] Search bar collapses to icon-only when collapsed
- [ ] Navigation groups (INTELLIGENCE / DRAFTING / CASE / VERIFY / ADMIN) — deferred
- [ ] User/Firm name display — deferred

#### 2.4 Case / Matter Header ✅
- [x] Breadcrumb navigation: "All Matters ›" (clickable, returns to dashboard) › matter title
- [x] Underline tab strip: `borderBottom: 2px solid gold` for active tab, transparent for inactive — replaced pill tabs
- [x] Verification count displayed in topbar
- [ ] Rich matter metadata in header (client, court, judge, status badge) — deferred
- [ ] Tab notification dots — deferred

#### 2.5 Research Panel
- [ ] Premium chat interface (avatars, better bubbles) — pending
- [ ] Source attribution cards — pending
- [ ] Better quick-action chips — pending

#### 2.6 Document Drafting
- [ ] Template picker — pending
- [ ] Full-screen mode — pending

#### 2.7 Judge Intel
- [ ] Rich judge profile card — pending

#### 2.8 Global UX ✅ (partial)
- [x] Command palette retained from v4, CSS polish applied
- [x] Toast notification system retained
- [x] CSS shimmer skeleton animation added (`.skeleton` class + `shimmer` keyframe)
- [ ] Keyboard shortcut help overlay — deferred

#### 2.9 Branding & Typography ✅
- [x] New T color object: bg #08090F, surface #10131F, sidebarBg #07080E, platinum #A8B4CC, textSub #5E6E90, crimson #C43355, cobalt #4070D8, emerald #26A860, amber #C87828, violet #8A55D8
- [x] Gold reserved for active states / primary actions only (reduced from v4 flat gold everywhere)
- [x] Sidebar uses platinum/textSub for inactive nav items, gold only for active
- [x] Playfair Display / Plus Jakarta Sans / JetBrains Mono font stack unchanged
- [x] `dotBounce` keyframe, `scale-in` and `cmd-in` animation classes
- [x] `.case-card:hover` — `transform:translateY(-1px)` lift
- [x] Improved scrollbar with `:-webkit-scrollbar-thumb:hover` state
- [x] Prose blockquote style added

### 🔄 Phase 3 — Production Infrastructure (Active: 2026-04-14)
**Goal:** Real deployment with backend, proper auth, portable storage.

- [x] Vite + React project scaffold (`apps/web/`)
- [x] `window.storage` → `localStorage` migration (8 lines changed in LexAgent.jsx)
- [x] Backend proxy (Hono on Railway) — `apps/api/` with auth + rate limiting
- [x] CORS fix via backend proxy (all legal API calls proxied)
- [x] Supabase database schema — matters, documents, logs, usage_events + RLS
- [x] Supabase Auth components (AuthProvider + AuthGate — email + Google OAuth)
- [x] Environment variables + secrets management (.env.example files)
- [ ] Vercel deployment + custom domain
- [ ] Install deps + local smoke test (`pnpm install`, `pnpm dev`)

### 📋 Phase 4 — Enterprise Features (Month 2+)
**Goal:** Full enterprise SaaS with billing, team features, compliance.

- [ ] Multi-tenant firm accounts
- [ ] Per-seat licensing + usage limits
- [ ] Stripe billing integration
- [ ] Admin dashboard (usage, costs, users)
- [ ] Audit logs (SOC 2 prerequisite)
- [ ] Custom firm branding / white-label mode
- [ ] Matter sharing & team collaboration
- [ ] Clio / MyCase / PracticePanther webhooks
- [ ] South Africa + international jurisdiction modules
- [ ] Fine-tuned model per practice area
- [ ] Mobile app (React Native)

---

## Known Issues & Technical Debt

| Issue | Severity | Phase to Fix |
|---|---|---|
| Anthropic API key exposed client-side | HIGH | Phase 3 |
| `window.storage` not portable (Claude-only) | HIGH | Phase 3 |
| Single 3,300+ line file — no modularity | MEDIUM | Phase 3 |
| CourtListener CORS depends on browser policy | MEDIUM | Phase 3 |
| No rate limiting / cost management | MEDIUM | Phase 3 |
| No error boundaries (unhandled crashes) | LOW | Phase 3 |
| No automated tests for UI | LOW | Phase 4 |

---

## Research Log

### Session 1 — 2026-04-14

#### Codebase Audit
- Full codebase audit complete (~3,300 lines, single JSX file)
- Identified 11 feature tabs, all functional
- Confirmed live integrations: CourtListener, Harvard CAP, GovInfo
- Key differentiator confirmed: Hallucination Shield is unique in market
- SA expansion already scoped in docs (LexAgent_ZA_Client_Proposal.pdf)
- Decision: Demo upgrade stays within Claude artifact / single-JSX architecture

#### Competitor Analysis: Harvey AI
- **Pricing:** ~$1,200+/seat/month (enterprise) — LexAgent can undercut significantly
- **Design philosophy:** "Earning trust through precision — every pixel works hard so users don't have to"
- **Three core principles:** Domain Awareness, Effortless Complexity, Intentional Design
- **UI structure:** Sidebar with threads/drafts/review tables, global search, chat-style layout
- **Color system:** Warm-neutral palette, amber/olive/jade accents, WCAG compliant
- **2025 releases:** Workflow Builder, Microsoft 365 Outlook add-in, mobile app, Shared Spaces
- **Key gap Harvey doesn't have:** Citation hallucination detection, judge profiling, CourtListener direct

#### Competitor Analysis: Thomson Reuters CoCounsel
- **Pricing:** $150–400+/month (bundled with Westlaw)
- **Strength:** Best average score (79.5%) in benchmark tests, strongest at document summarization
- **Weakness:** Locked to TR ecosystem, weaker at open-ended drafting
- **Gap:** No dedicated citation verification, no conflict checker

#### Competitor Analysis: Lexis+ AI
- **Pricing:** Enterprise, requires sales call
- **Strength:** Full Lexis + news + public records + international
- **Weakness:** Dated UX, requires existing Lexis subscription
- **Gap:** No judge intelligence, no SOL calculator

#### UI/UX Research Findings

**Harvey Design System (from official blog):**
- Intent-based semantic token naming (foreground-base, bg-base, etc.)
- Phased token migration with linter enforcement
- Figma → code sync via GitHub Actions
- Warm-neutral color hue locked at 90° across accents
- Chroma: higher in light tones, lower in dark tones
- All components WCAG accessible by default

**2025/2026 Enterprise SaaS Dashboard Trends:**
- Dark grey (#121212 or similar) preferred over pure black — better depth
- Linear/Vercel sidebar pattern: collapsible, icon-only mode, grouped navigation
- 82% of users enable dark mode when available
- Progressive disclosure — show essentials first, reveal advanced on demand
- Embedded collaboration (comments, tags, tasks without tab switching)
- AI-specific patterns: streaming baseline, citations inline, visible thinking states
- Moving from pure chat → hybrid chat/agent orchestration UI
- Token-by-token rendering is table stakes expectation in 2026

**Chat Interface Best Practices:**
- Dark grey background (not pure black) for chat area
- Rich formatting mid-stream (markdown while tokens arrive)
- Citation cards inline with verification badges
- Follow-up suggestions persistent in thread
- Visible "thinking" states for agent work
- Streaming is absolute baseline — no "wait for full response" UX

**Onboarding Best Practices (Legal SaaS):**
- Ideally completed in 24–48 hours (client onboarding benchmark)
- Multi-step wizard with progress indicator
- Centralized intake → auto-creates case files
- Secure document portal feeling from day one

#### Open Source Resources Identified
- shadcn/ui — copy-paste headless components, Radix primitives, accessibility built-in
- Linear Design System (Figma community file) — sidebar/navigation inspiration
- Vercel admin dashboard templates (Next.js + shadcn/ui)
- Blueprint by Palantir — enterprise data-heavy components
- Creative Tim Black Dashboard React — dark theme patterns

---

## Phase 2 — Detailed UI Implementation Spec

> These are the exact changes to be made to `lexagent-v4.jsx` for the demo upgrade.
> All changes stay within the single-file Claude artifact architecture.

### UI-01: Onboarding Flow (NEW FEATURE)
**When:** First launch (no cases, no API key stored)  
**Components to add:**
- `OnboardingWizard` component with 4 steps:
  1. **Welcome** — LexAgent logo reveal, "The AI Legal Platform" tagline, animated shield badge, 3 feature highlights (Research, Shield, Judge Intel)
  2. **Firm Setup** — Firm name input, practice area selection (multi-select chips), jurisdiction defaults
  3. **API Configuration** — Anthropic key field with link to console.anthropic.com, CourtListener token (optional), "Test Connection" button
  4. **First Matter** — Quick matter creation or "Skip → Dashboard"
- Progress indicator (4 dots or step bar)
- Skip option after Step 2
- Stores: `firmName`, `practiceAreas` in settings

### UI-02: Dashboard Redesign
**Current:** Flat list of cases + "New Matter" button  
**New structure:**
- **Metrics row** (4 cards):
  - Active Matters (count + last 7 days delta)
  - Citations Verified (total across all matters, % pass rate)
  - Documents Drafted (total exports)
  - ARES Shield Status (CLEAR / CAUTION / DANGER based on any open not_found citations)
- **Quick Actions** (3 cards): Start Research, Draft Document, Check Conflicts
- **Matter grid** (replaces flat list): 2-col on desktop, 1-col mobile
  - Each card: matter title, client, case type badge, jurisdiction, risk badge (Low/Med/High/Critical), status dot, last activity timestamp, citation count
- **Recent Activity feed** (sidebar, desktop only): timestamped log of last 8 actions
- **Empty state** (no matters): illustration-style placeholder, compelling headline, big "Create First Matter" CTA

### UI-03: Sidebar Navigation
**Current:** Desktop sidebar is a fixed left panel with tab icons  
**New:**
- **Header:** LexAgent wordmark (SVG text logo) + version badge
- **Sub-header:** "Powered by ARES" in monospace dim text
- **Firm name display:** if set, show firm name with avatar initial
- **Navigation groups:**
  - INTELLIGENCE: Research, Deep Research, Judge Intel
  - DRAFTING: Draft, Vault
  - CASE: Strategy, Evidence, Timeline, Deadlines
  - VERIFY: Shield, Conflict Check
  - ADMIN: Settings (gear icon)
- **Active matter context** (when inside a matter): mini-card at top showing matter name + risk badge
- **Bottom:** Shield status indicator (green/amber/red dot + "ARES Active"), version string
- **Collapsible:** clicking logo collapses to icon-only mode (save to localStorage)

### UI-04: Matter / Case Header
**When:** Inside a matter (current view)  
**New header bar:**
- Breadcrumb: "Matters ›" (clickable) › Matter Title
- Matter title (large, serif font)
- Client name + Court name inline
- Status badge (Active/Pending/Closed) — editable via click
- Risk badge (Low/Med/High/Critical) in risk color
- Judge name (if set) with link icon to Judge Intel tab
- Action buttons: Edit Matter, Share, Export All

### UI-05: Research Panel Enhancements
- **Message bubbles:** ARES messages get shield icon avatar, user gets initials avatar
- **ARES "thinking" state:** animated dots + "ARES is researching…" label + optional sub-label (Searching CourtListener… / Running web search…)
- **Source attribution cards:** when CourtListener/Harvard results appear, render as compact cards (case name, citation, court, year, confidence badge, link)
- **Better quick-chip design:** pill-shaped, animated hover, grouped by category
- **Input area refinement:** larger text area, document attachment indicator improved, send button with loading state

### UI-06: Command Palette (Ctrl+K) Enhancement
**Current:** Basic command palette  
**New:** 
- Grouped results: ACTIONS / MATTERS / TABS / RECENT
- Recent searches stored
- Keyboard navigation with arrow keys
- Search within matter titles, case types, clients
- Quick create: "New matter: [title]" pattern

### UI-07: Document Drafting Panel
- **Template picker:** visible grid of template types (Motion to Dismiss, Research Memo, Settlement Letter, etc.) before free-form input
- **Full-screen editor toggle:** expand button maximizes draft area
- **Word count + estimated print pages** shown in toolbar
- **Export row:** PDF and DOCX buttons prominently placed, Copy to Clipboard

### UI-08: Judge Intelligence Panel
- **Judge profile card:** styled like a premium profile card (avatar initial in large circle, full name serif, court, appointment year)
- **Stats bar:** Years on bench, approx. cases decided (CourtListener data), political affiliation badge
- **Strategy cards:** each recommendation rendered as an action card (icon + title + description) rather than plain text

### UI-09: Branding & Visual Refinements
- **LexAgent SVG wordmark:** inline SVG, "Lex" in Playfair Display + "Agent" in JetBrains Mono
- **ARES badge:** small shield icon + "ARES v4" in mono, shown in sidebar footer and research panel header
- **Color hierarchy refinements:**
  - Reduce flat gold usage — reserve gold (#C8A96E) for primary actions, active states, key labels only
  - Introduce more use of platinum (#A8B4CC) for secondary text
  - Dark surface: shift from #060810 base to slightly warmer #08090F
  - Use gold gradient sparingly on primary buttons (linear-gradient 135deg gold → goldBright)
- **Typography scale tightened:**
  - Page titles: 22px Playfair Display
  - Section headers: 10px JetBrains Mono uppercase tracking-wide
  - Body: 13px Plus Jakarta Sans
  - Captions: 11px Plus Jakarta Sans
- **Micro-animations:** 
  - Tab switch: subtle slide + fade
  - Card hover: 2px lift with box-shadow change
  - Shield badge: pulse animation when verifying
  - Dashboard metrics: count-up animation on load

### UI-10: Loading & Empty States
- **Skeleton screens:** replace blank areas during load with gold-tinted skeleton shimmer
- **Consistent empty states:** every panel has an icon + serif italic message + action button
- **Error states:** styled error cards (not plain text) with retry option
- **Connection status:** subtle indicator in sidebar when API is unreachable

---

### Implementation Order (for the demo)
1. ✅ UI-09 (branding/color — sets the foundation for everything else)
2. ✅ UI-03 (sidebar — most visible structural change)
3. ✅ UI-02 (dashboard — first thing law firms see)
4. ✅ UI-04 (matter header — breadcrumb + underline tab strip)
5. ✅ UI-10 (loading/empty states — skeleton shimmer + empty state copy)
6. ✅ UI-01 (onboarding — demo flow, 3-step wizard)
7. ✅ UI-05 (research — core feature, must shine)
8. ✅ UI-07 (drafting — second most used feature)
9. ✅ UI-08 (judge intel — strong differentiator)
10. ✅ UI-06 (command palette — power user feature)

---

## Session Notes

### 2026-04-14 — Session 1
- User confirmed: Demo focus only — no backend, no auth, no Vercel yet
- Priority: Polish and enterprise-grade UI within existing single-JSX architecture
- User confirmed: Keep it simple, easy to maintain, easy for future devs
- PLAN.md to be updated after every session — living document
- Research phase completed: Harvey AI design system, competitor pricing, UI patterns, chat best practices
- Harvey AI pricing confirmed at $1,200+/seat/month — LexAgent has major price advantage
- Key finding: Hallucination Shield + Judge Intel are genuinely unique — no competitor has both
- Key finding: Token-by-token streaming + inline citations are now baseline expectation in 2026
- Key finding: Linear/Vercel collapsible sidebar is the gold standard for enterprise SaaS navigation
- Detailed UI implementation spec created (UI-01 through UI-10) — see Phase 2 Detailed Spec above
- Implementation order defined — UI-09 (branding) first, then sidebar, dashboard, onboarding

### 2026-04-14 — Session 2
- **Strategy:** Output token limit hit on full-rewrite attempt. Switched to `cp v4 → v5` + targeted Edit calls — avoids limit, keeps all functional code identical.
- **`lexagent-v5.jsx` created** (4088 lines) — ready for sandbox testing
- **Completed edits (5 total):**
  1. **T color object** — new refined palette: warmer bg, platinum midtones, distinct crimson/cobalt/emerald/amber/violet accent roles
  2. **CSS string** — shimmer keyframe, dotBounce, scale-in/cmd-in, sidebar transition classes (.sidebar-rail, .sidebar-label, .sidebar-collapsed), .skeleton utility, improved scrollbars, blockquote prose, card hover lift
  3. **Dashboard component** — PRACTICE_COLORS map, 4 metric cards with watermark icons, matter grid with colored accent bars, empty state with explanatory copy
  4. **LexAgent() state** — added `sidebarCollapsed` boolean state
  5. **Desktop layout** — loading screen, collapsible sidebar (52/224px), brand header + SHIELD ACTIVE indicator, breadcrumb matter topbar, underline tab strip, admin/dashboard topbars
- **Mobile section:** unchanged from v4 (acceptable for demo)
- **Key technical decisions:**
  - `sbCollapsed = sidebarCollapsed || isTablet` — merges explicit toggle with tablet auto-collapse
  - Sidebar toggle button only shown on desktop (`!isTablet`)
  - Gold reserved for active/primary only; platinum/textSub used for secondary nav
  - PRACTICE_COLORS defined at module level (before Dashboard) so sidebar matter list can reuse it
- **Pending (next session):** UI-05 Research panel, UI-07 Drafting, UI-08 Judge Intel, UI-06 Command Palette, UI-01 Onboarding wizard
- **Immediate next step:** Paste v5 into Claude artifact sandbox and verify render

### 2026-04-14 — Session 3
- **All remaining Phase 2 items completed** — UI-01, UI-05, UI-06, UI-07, UI-08
- **`lexagent-v5.jsx` now 4328 lines** (up from 4088)
- **Completed edits (8 total):**
  1. **UI-05 ResearchPanel avatars** — branded YOU/ARES avatar bubbles (8px border-radius, gold/cobalt tint) on every chat message
  2. **UI-05 ResearchPanel loading state** — ARES-branded with dotBounce animation, contextual "Searching web…" vs "Querying knowledge base…" copy
  3. **UI-05 ResearchPanel quick chips** — pill-shaped suggestion chips with gold hover (borderRadius:20)
  4. **UI-07 DraftPanel DTYPES** — 8 document types with `{id, label, icon, desc}` structure; descriptions render as subtitle in type selector
  5. **UI-07 DraftPanel output header** — word count + estimated page count display (`N words · ~N pages`)
  6. **UI-08 JudgePanel profile card** — 72px serif-initial avatar, 5-cell stats bar (years, win%, party affiliation, ABA rating) using border illusion grid
  7. **UI-06 CommandPaletteInner** — grouped ACTIONS + MATTERS sections, flat index keyboard nav, practice-area colored dot for matter rows
  8. **UI-01 OnboardingWizard** — full 3-step wizard (Welcome → Firm Setup → API Key), live key test pinging haiku, dot progress indicator, integrated into LexAgent() with fresh-install detection
- **Key technical decisions:**
  - Fresh-install detection: `(!c||!c.length) && !mergedSettings.anthropicKey` checked at `setLoaded(true)` in useEffect
  - Grouped command palette uses mutable `let idx = 0` counter for flat keyboard nav index across sections
  - Stats bar cell separators: `background:T.border` on grid container + `gap:1` + `background:T.panel2` on cells = 1px border illusion without actual borders
  - Live API key test pings `claude-haiku-4-5-20251001` with `max_tokens:5` to validate key cheaply
- **All Phase 2 UI items: ✅ complete**
- **Immediate next step:** Paste v5 into Claude artifact sandbox and verify render

### 2026-04-14 — Session 4
- **Phase 3 infrastructure scaffolded** — monorepo, Vite frontend, Hono backend, Supabase schema
- **New files created (37 total):**
  - `package.json` + `pnpm-workspace.yaml` — pnpm monorepo root
  - `apps/web/` — full Vite + React TS app (package.json, vite.config.ts, tsconfig*, index.html, main.tsx, styles/index.css)
  - `apps/web/src/lib/storage.ts` — localStorage shim (drop-in for window.storage)
  - `apps/web/src/lib/api.ts` — proxy URL constants + authToken setter
  - `apps/web/src/lib/supabase.ts` — Supabase client singleton
  - `apps/web/src/lib/auth.tsx` — AuthProvider + useAuth hook (email + Google OAuth)
  - `apps/web/src/components/AuthGate.tsx` — login/signup screen (full LexAgent dark theme)
  - `apps/web/src/components/LexAgent.jsx` — lexagent-v5.jsx with 12 surgical edits applied
  - `apps/web/src/App.tsx` — thin wrapper: AuthProvider > AuthGate > LexAgent
  - `apps/api/` — Hono backend (package.json, tsconfig, index.ts)
  - `apps/api/src/routes/anthropic.ts` — POST /api/anthropic/messages (Zod-validated, proxies with server key)
  - `apps/api/src/routes/courtlistener.ts` — GET/POST passthrough + server-side token injection
  - `apps/api/src/routes/cap.ts` — Harvard CAP GET passthrough
  - `apps/api/src/routes/govinfo.ts` — GovInfo GET passthrough + server-side key injection
  - `apps/api/src/middleware/auth.ts` — Supabase JWT verification middleware
  - `apps/api/src/middleware/ratelimit.ts` — per-user token bucket (configurable RPM)
  - `apps/api/src/lib/supabase.ts` — service-role Supabase client
  - `supabase/migrations/001_init.sql` — profiles, matters, documents, logs, usage_events + triggers
  - `supabase/migrations/002_rls.sql` — RLS policies (user_id = auth.uid())
  - `.gitignore`, `.env.example` files for both apps
- **LexAgent.jsx edits (12 changes, all surgical):**
  1. Added import for `ANTHROPIC_ENDPOINT, COURTLISTENER_BASE, CAP_BASE, GOVINFO_BASE` from `../lib/api`
  2. Modified `safeFetch` to rewrite Anthropic URL to proxy endpoint
  3. Replaced `store` localStorage (was `window.storage` without `{value}` wrapper)
  4. Replaced `vaultStore` with localStorage (namespaced `lexagent:vault:` prefix)
  5–6. Fixed 2 direct `window.storage` calls in shared-matter sync code
  7–8. Swapped 2 CourtListener citation lookup + search URLs to `COURTLISTENER_BASE`
  9–10. Swapped CourtListener judge + positions URLs to `COURTLISTENER_BASE`
  11. Swapped Harvard CAP URL to `CAP_BASE`
  12. Swapped GovInfo URL to `GOVINFO_BASE`
- **Zero `window.storage` live calls remain** in `apps/web/src/components/LexAgent.jsx`
- **Key technical decisions:**
  - `safeFetch` intercepts the literal URL string — no changes needed at 10 Anthropic call sites
  - Auth is bypassed when Supabase env vars aren't configured — allows dev without Supabase
  - CORS allows `*.vercel.app` + explicitly listed origins via `ALLOWED_ORIGINS` env var
  - Rate limiter is in-memory token bucket — swap for Redis (e.g. Upstash) for multi-instance
  - Service role Supabase key only in `apps/api` — anon key only in `apps/web`
- **Remaining Phase 3 steps:**
  1. `pnpm install` at monorepo root
  2. Copy `.env.example` → `.env.local` (web) and `.env` (api), fill in keys
  3. `pnpm dev` to verify local parity
  4. Deploy `apps/api` to Railway, set env vars
  5. Deploy `apps/web` to Vercel, set env vars, add custom domain

---

## File Index

| File | Purpose |
|---|---|
| `lexagent-v4.jsx` | Stable baseline — single JSX artifact (3917 lines) |
| `lexagent-v5.jsx` | Artifact build — paste into Claude artifact to test |
| `apps/web/` | Vite + React app — production frontend |
| `apps/web/src/components/LexAgent.jsx` | Production copy of v5 (12 edits: localStorage + proxy URLs) |
| `apps/api/` | Hono backend — deploy to Railway |
| `supabase/migrations/` | DB schema + RLS — run via Supabase dashboard or CLI |
| `lexagent-testrunner.jsx` | AI feature test suite |
| `PLAN.md` | This document — master project plan |
| `docs/LexAgent_SA_Localisation_Report.pdf` | SA jurisdiction research |
| `docs/LexAgent_ZA_Client_Proposal.pdf` | SA market client proposal |

---

*This document is updated at the end of every working session. Future developers: read this before touching any code.*
