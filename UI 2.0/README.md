# LexAgent Design System — Lex Protocol

> **"Law First, Neural Second."** A legal-cyberpunk design system for LexAgent / ARES — the AI-powered legal research platform. Authoritative, secure, professional — infused with neon precision, liquid glass, and data-driven texture.

**Live product:** https://lexagent-ochre.vercel.app  
**GitHub:** https://github.com/chrisdev1187/lexagent  
**Version:** v0.3.0

---

## Sources Used

| Source | Path / URL | Status |
|---|---|---|
| Web app codebase | `lexagent/apps/web/` (mounted via File System Access API) | ✅ Read |
| Existing Lex Protocol design system | `lexagent/lex-protocol-design/` | ✅ Read |
| Product docs / client proposal | `lexagent/docs/` | ✅ Referenced |
| Figma | Not provided | — |

---

## Product Overview

**LexAgent** (also branded **Lex Protocol / ARES**) is a SaaS platform for attorneys. It combines:

- AI-powered legal research (RAG pre-fetch across 10 live legal databases)
- Hallucination Shield — every citation verified against CourtListener in real-time
- Judge intelligence profiling (16,000+ federal and state judges)
- Document vault (multi-PDF upload, AI analysis, summarize/compare)
- Matter management, SOL calculator, conflict checker, billing tracker
- Firm profile and letterhead settings

**Competitive position:** Harvey AI alternative at near-zero marginal cost via a 9-provider free LLM waterfall.

**Two surfaces:**
1. **Console** (`apps/web`) — attorney-facing dashboard (Next.js 15, Tailwind v4, Radix UI)
2. **Client Portal** — planned client-facing secure portal / marketing front door

---

## Stack

- **Framework:** Next.js 15 App Router + React 19
- **Styling:** Tailwind v4 + custom CSS vars (Lex Viridian / Midnight Court system)
- **Icons:** lucide-react (primary), custom Blueprint SVGs (legal-specific)
- **Fonts:** Fraunces (serif display) · Inter (sans body) · JetBrains Mono (data mono)
- **Backend:** Hono (Node) on Render
- **Auth/DB:** Supabase (Postgres + JWT)

---

## CONTENT FUNDAMENTALS

### Voice
Writes like a **senior partner briefing a junior associate**: confident, precise, dry. Every sentence is load-bearing. Ornament is a liability.

- **Person:** Second-person direct ("You have 3 motions pending.") for action items. Third-person neutral ("The court filed an objection at 14:32.") for system events. Never first-person plural ("we").
- **Tense:** Simple present for state. Simple past for events. No continuous tenses.
- **Casing:**
  - Sentence case for labels and UI copy ("Upload evidence")
  - ALL CAPS + wide tracking (0.18em) for micro-labels, chips, IDs (`CASE ID: 4492-X`, `SEALED`, `PRIVILEGED`)
  - Title Case only for proper nouns (Rule 26, Ninth Circuit)
- **Numbers:** Always numerals. Monospace for anything copy-pasteable (case numbers, citations, amounts, timestamps).
- **Dates/times:** ISO-ish, monospace: `2026-04-18 · 14:32 PDT`. Never "today at 2pm."

### Tone Dials
| Dimension | Rating | Notes |
|---|---|---|
| Seriousness | 9/10 | Real money, real liberty |
| Warmth | 3/10 | Respectful, not friendly. No exclamation points. |
| Technicality | 7/10 | Use legal terms precisely — never soften "motion" into "document" |
| Playfulness | 0/10 | No puns, jokes, or attention-drawing metaphors |

### Emoji & Ornament
- **No emoji, ever.** Not in UI, not in empty states, not in toasts.
- Unicode glyphs permitted: `§ ¶ · → ↗ ↘ ✕ ✓ ◆ ▸ ▾`
- No exclamation points. Urgency = Verdict Crimson + screen position, not punctuation.

### Example Copy

**✓ Good — empty state:**
> No open matters.
> When a case is opened, it appears here. Filings, depositions, and deadlines populate automatically.
> [ Open matter · ⌘ N ]

**✗ Bad — too friendly:**
> 👋 Welcome! You don't have any cases yet. Let's get started — it's easy!

**✓ Good — notification:**
> `14:32 PDT` **Motion to Compel** — Opposing counsel filed a response. 12 pages. Review by `2026-04-22`.

---

## VISUAL FOUNDATIONS

### Philosophy
Cyberpunk aesthetics are **controlled to preserve legal professionalism**. Neon is a precious metal — it appears surgically, never as decoration. The interface reads as *precision instrumentation*, not chaos. Think Bloomberg terminal crossed with a private bank vault.

### Color
Dark-mode-only. No light mode. The absence of light is deliberate — "nothing here is public."

**Background layers** (5 levels, always step down):
| Token | Hex | Use |
|---|---|---|
| `--midnight-court` | `#050505` | Absolute base, body background |
| `--midnight-deep` | `#0a0a0c` | Panel base, sidebar |
| `--midnight-raised` | `#111114` | Cards, raised surfaces |
| `--midnight-elev` | `#17171c` | Hover state backgrounds, elevated panels |
| `--midnight-line` | `#1f1f26` | Hairline dividers |
| `--midnight-mute` | `#2a2a33` | Disabled/muted chrome |

**Chrome (foreground):**
| Token | Hex | Use |
|---|---|---|
| `--gavel-chrome` | `#e0e0e0` | Primary text — never pure white |
| `--gavel-silver` | `#b8b8bc` | Secondary text, body copy |
| `--gavel-steel` | `#7a7a82` | Tertiary, metadata |
| `--gavel-graphite` | `#4a4a52` | Quaternary, hints, disabled |

**Verdict accents:**
| Token | Hex | Meaning |
|---|---|---|
| `--verdict-neon` | `#00ffc3` | Primary — affirmative, selected, confirmed |
| `--verdict-violet` | `#6a00ff` | Sealed / privileged contexts |
| `--verdict-amber` | `#ffb800` | Caution / pending |
| `--verdict-crimson` | `#ff3355` | Breach / adversarial / missed deadline |

**Rules:**
- Neon appears on ONE primary action per screen, focus rings, selected states, and affirmative data.
- Violet carries legal weight — its presence means something is sealed/privileged.
- No blues, oranges, or additional greens beyond neon.

### Typography
Three-family system:

| Role | Family | Weights | Use |
|---|---|---|---|
| **Serif display** | Fraunces (sub: Editorial New) | 400/500/600 | Headlines, page titles, quote blocks, big numbers |
| **Sans body** | Inter | 400/500/600/700 | Labels, body, buttons, long-form |
| **Mono data** | JetBrains Mono | 400/500/600 | IDs, timestamps, citations, command palette |

Rule: **If a number might be copy-pasted, it's mono.**

### Backgrounds & Imagery
- **Full-bleed imagery:** Never. Backgrounds are solid `--bg-base` or panel color.
- **Blueprint grid** (`.bg-blueprint`): 48px neon hairline grid, 4% opacity, used behind dashboards.
- **Scanlines** (`.scanline`): Animated neon sweep across active data widgets.
- **Noise texture** (`.texture-check`): 3.5% overlay on glass surfaces for "physical" feel.
- **Gradients:** Only radial neon/violet glows as atmospheric ambient. No linear marketing gradients.

### Motion
Terminal-like, not bouncy. Nothing overshoots or bounces.

| Token | Value | Use |
|---|---|---|
| `--ease-terminal` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entry traces, primary reveals |
| `--ease-crisp` | `cubic-bezier(0.2, 0.6, 0.2, 1)` | Simple out-motion |
| `--dur-instant` | `80ms` | Press acknowledgment |
| `--dur-fast` | `160ms` | Hover transitions |
| `--dur-base` | `240ms` | Standard UI transitions |
| `--dur-slow` | `400ms` | Max for interactive feedback |
| `--dur-reveal` | `800ms` | Page-level Entry Traces |

**Entry Trace:** Elements render left-to-right via clip-path reveal + 1px blur resolution.
**Blueprint draw:** SVG paths draw via `stroke-dasharray` animation on scroll.

### Hover & Press States
- **Text links:** `--fg-secondary` → `--verdict-neon`; 0.5px neon underline fades in over 160ms.
- **Primary buttons:** Glow intensifies (sm → md). Background barely brightens (~3%). No transform.
- **Secondary buttons:** Border `--border-hair` → `--border-neon`. Background → `rgba(0,255,195,0.04)`.
- **Cards:** Border `--border-hair` → `--border-line`; faint neon ambient at top via inset shadow. No lift or scale.
- **Press:** Scale to `0.985`, background darkens 5%, glow drops one level. 80ms duration.

### Borders
- Hairline **0.5px** is the signature. Always `0.5px solid rgba(...)`.
- Neutral hairline: `rgba(224,224,224,0.08)`
- Neon hairline: `rgba(0,255,195,0.35)`
- Never 1px+ colored borders for structural dividers.

### Shadows & Elevation
Four levels, each with two-layer composition (drop shadow + inset specular):

| Token | Use |
|---|---|
| `--shadow-1` | Flat (focusable cells) |
| `--shadow-2` | Raised (cards, panels) |
| `--shadow-3` | Overlay (menus, popovers) |
| `--shadow-4` | Floating (modals — faint neon halo) |

### Glass (Liquid Glass)
Used on: top nav, command palette, modal backgrounds, floating toolbars.

Three layers: (a) `rgba(20,20,26,0.55)` base fill, (b) `backdrop-filter: blur(18px) saturate(160%)`, (c) `rgba(255,255,255,0.06)` top specular.

Class: `.glass-blur` / `.glass-blur--strong`

### Corner Radii (Industrial — never rounder than 16px)
| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 2px | Chips, inline code |
| `--radius-sm` | 4px | Fields, buttons |
| `--radius-md` | 6px | Cards, panels |
| `--radius-lg` | 10px | Modals, large cards |
| `--radius-xl` | 16px | Hero containers |
| `--radius-pill` | 999px | Counters, avatar circles, status chips |

### Cards
- Base: `--bg-raised` fill, 0.5px hair border, 6px radius, `--shadow-2`
- Glass variant: `.glass-blur` utility, 10px radius, specular top edge
- Active: neon hair border, faint ambient halo at top edge
- Always carry a `micro-label` eyebrow in UPPERCASE MONO (e.g. `CASE ID · 4492-X`)

### Layout
- **Bento Box grid:** 12-column, 12px gap. Cards span 3/4/6/8/12 columns.
- **Top nav:** Fixed 56px, glass-blur, 0.5px bottom border.
- **Sidebar:** 240px (collapsed 52px), `--bg-panel`, non-glass.
- **Max content width:** 1280px.
- **Paragraph measure:** Capped at 68ch.

---

## ICONOGRAPHY

### Primary System — Lucide React
CDN: `https://unpkg.com/lucide-static` or npm `lucide-react`

- **Stroke:** 1.5px
- **Size:** 16px inline, 20px in buttons, 24px in nav
- **Color:** `currentColor`; active icons take `--verdict-neon`

### Custom Blueprint Icons
Located in `assets/icons/`. Legal-specific concepts drawn in "blueprint" style (1px solid chrome + 0.5px neon offset):

| File | Concept |
|---|---|
| `gavel-blueprint.svg` | Court, ruling, judgment |
| `seal-blueprint.svg` | Document sealing, privilege |
| `writ-blueprint.svg` | Legal writ, order |
| `chain-of-custody.svg` | Evidence chain, provenance |

> ⚠️ These are placeholder SVGs approximating the aesthetic. Replace with final production vectors when delivered.

### Logo Assets
| File | Use |
|---|---|
| `assets/logo-mark.svg` | Scales-in-Grid monogram, 16px–400px |
| `assets/logo-wordmark.svg` | "LEX PROTOCOL" in Fraunces 500 |
| `assets/logo-lockup.svg` | Mark + wordmark horizontal |

### Emoji
**Never used.** See Content Fundamentals.

---

## File Index

| File | Purpose |
|---|---|
| `README.md` | This document |
| `SKILL.md` | Portable skill manifest for Claude Code |
| `colors_and_type.css` | All CSS custom properties: color, type, spacing, motion, elevation |
| `components.css` | Production-ready component classes (import after `colors_and_type.css`) |
| `tailwind.preset.js` | Drop-in Tailwind theme preset matching all CSS vars |
| `motion.variants.js` | Reusable Motion/Framer Motion animation variants |

| Folder | Purpose |
|---|---|
| `assets/` | Logos, brand marks, custom blueprint SVG icons |
| `assets/icons/` | Custom Blueprint SVG icon set |
| `preview/` | HTML design system cards (rendered in Design System tab) |
| `ui_kits/app/` | **Lex Protocol Console** — attorney dashboard UI kit |

---

*Last updated: 2026-04-24 · LexAgent Design System v1.0.0*
