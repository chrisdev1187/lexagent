# LexAgent — Enterprise AI Legal practice Platform

> **ARES v6** (Advanced Research & Evidence System) — State-of-the-Art AI legal practice management featuring recursive agentic reasoning, neuro-symbolic statutory alignment, and high-precision token-based monetization.

**Live:** https://lexagent-ochre.vercel.app  
**API:** https://lexagent-0o5u.onrender.com  
**GitHub:** https://github.com/chrisdev1187/lexagent  
**Version:** v2.0.1 — see [DEVLOG.md](./DEVLOG.md) for full change history

---

## The LexAgent Advantage

LexAgent is a professional-grade workspace designed to handle the complexity of modern legal practice. By combining a distributed LLM waterfall with real-time legal database grounding and a persistent "LexMemory" system, LexAgent provides attorneys with an AI partner that actually understands the nuances of their cases.

- **ARES v6 Agentic Loop** — Our core AI orchestrator now performs up to 5 recursive turns of autonomous reasoning. It can trigger tools, analyze results, and self-correct without user intervention.
- **Neuro-symbolic Statutory Guardrail** — ARES automatically detects when legal claims conflict with the primary statutes of a matter, forcing self-correction before responses are delivered.
- **Hallucination Shield** — Real-time Bluebook-aware citation verification against 9M+ court opinions. Unverified or "bad law" (overruled) citations are instantly flagged.
- **High-Precision Credit Economy** — A token-to-credit model with model-specific multipliers ensures fair and transparent billing for compute usage.
- **LexMemory Case Intelligence** — A 4-level semantic memory system that carries context across Research, Strategy, Draft, and Judge profiles, ensuring the AI never "forgets" key facts or rulings.
- **Enterprise-Grade Security** — Single-session enforcement, MFA support, browser fingerprinting, and audit logging provide a defensible foundation for privilege-safe work.

---

## What's New in v2.0

### SOTA Orchestration (v2.0.1)

**Agentic Reasoning Loop**
ARES now uses a multi-turn recursive loop. If the AI needs to verify a citation, lookup a judge, or check a statute, it does so autonomously in the foreground before finalizing its answer. Real-time "Thought Traces" let you see exactly how the AI is working.

**Statutory Alignment**
A mandatory alignment check ensures that all AI responses respect the "Primary Statutes" defined for a matter. If ARES attempts to suggest a path blocked by binding law, the system triggers an automatic revision turn.

**Precision Monetization**
Implemented a high-fidelity budget system. Users see a real-time "Economy Gauge" in the sidebar. Costs are calculated based on actual token usage with multipliers for premium models like Claude 3.5 Sonnet.

**Unified Command Bar (Cmd+K)**
A global command palette allows for rapid navigation across matters, tabs, and settings, significantly reducing click-depth for power users.

**Professional Theme Variant**
Introduced a "Soft Professional" theme designed for long-term focus and reduced eye strain, featuring high-contrast serif typography and a balanced emerald palette.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | **Next.js 15** App Router + React 19, Server Components |
| Design System | **Lex Protocol** — Modular design system, Emerald/Midnight |
| AI Loop | **ARES v6** — Recursive agentic reasoning (5 turns) |
| Backend | Hono (Node), deployed on Render |
| Auth | Supabase with MFA and Single-Session Enforcement |
| Database | Supabase Postgres — Audit-logged, RLS-enforced |
| LLM Waterfall | Mistral Large 2 → Llama 3.3 70B → Gemini 2.0 Flash |
| Case Memory | LexMemory 4-level Semantic Ranking & Extraction |

---

## Feature Overview

| Section | Features |
|---|---|
| **Research** | Recursive tool-calling, RAG pre-fetch, thought traces, memo export |
| **Strategy** | Adversarial debate mode, LexMemory context injection, PDF export |
| **Judge Intel** | Tendency analysis, FJC biographical data, ruling grant-rate stats |
| **Vault** | Confidential ACP storage + Context Library with automated redaction |
| **Docket Watch** | Real-time PACER National Index & CourtListener monitoring |
| **Deadlines** | AI-calculated statutory deadlines based on jurisdiction and event |
| **Draft** | Multi-version document assembly, firm letterhead, Bluebook citations |
| **Conflict** | ABA Rules screening with persistent AI analysis and risk scoring |
| **Admin** | ARES Inspector, detailed Telemetry, Audit logs, and Quota management |

---

## Quickstart (Local Dev)

```bash
# 1. Install
pnpm install

# 2. Configure backend
cp apps/api/.env.example apps/api/.env
# Add GROQ_API_KEY (free) or ANTHROPIC_API_KEY

# 3. Configure frontend
cp apps/web/.env.example apps/web/.env.local
# Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Run
pnpm dev
```

---

## Plans

| Plan | Price | Credits/mo | Matters | Storage |
|---|---|---|---|---|
| Free | $0 | 1 per tool | 1 | 100 MB |
| Starter | $45/mo | 500 | 10 | 512 MB |
| Professional | $95/mo | 1,500 | 25 | 2 GB |
| Firm | $200/mo | 5,000 | 60 | 10 GB |
| Premium | $2,000/mo | 20,000 | Unlimited | Unlimited |

---

## Deployment

### Backend → Render
Web Service, Root: `apps/api`, Build: `pnpm install && pnpm build`, Start: `node dist/index.js`.

### Frontend → Vercel
Import repo, auto-detects Next.js. Ensure `NEXT_PUBLIC_API_URL` points to the Render service.

### Database → Supabase
Run all migrations in `apps/web/supabase/migrations/` (001 → 029).

---

## Documentation
Full technical roadmap and decision log: **[DEVLOG.md](./DEVLOG.md)**
