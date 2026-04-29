# LEX PROTOCOL — MASTER IMPLEMENTATION PROMPT
# Copy this entire file and paste it to Claude Code (or any AI agent) to reproduce the exact Lex Protocol Console UI.

---

## CONTEXT

You are implementing **Lex Protocol** — the UI system for **LexAgent / ARES**, an AI-powered legal research platform. The aesthetic is **legal-cyberpunk**: authoritative, precise, dark-mode-only, with surgical neon accents. Think Bloomberg terminal crossed with a private bank vault. Brand positioning: *"Law First, Neural Second."*

---

## STEP 1 — INSTALL FILES

Copy the following files from this zip into your project root (or `apps/web/styles/` for Next.js):

```
colors_and_type.css     → Global CSS custom properties (import FIRST)
components.css          → Component classes (import AFTER colors_and_type.css)
tailwind.preset.js      → Tailwind v4 theme preset
motion.variants.js      → Framer Motion animation variants
assets/logo-mark.svg
assets/logo-wordmark.svg
assets/logo-lockup.svg
assets/icons/gavel-blueprint.svg
assets/icons/seal-blueprint.svg
assets/icons/writ-blueprint.svg
assets/icons/chain-of-custody.svg
```

In your global CSS / layout:
```css
@import './colors_and_type.css';
@import './components.css';
```

In `tailwind.config.js` / `tailwind.config.ts`:
```js
const lexPreset = require('./tailwind.preset.js');
module.exports = { presets: [lexPreset] };
```

---

## STEP 2 — FONTS

Load via Google Fonts (or self-host from `fonts/` if Editorial New files are provided):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
```

Or in Next.js `layout.tsx`:
```tsx
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', axes: ['opsz'] });
const sans  = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono  = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
```

---

## STEP 3 — COLOR TOKENS (exact hex values)

Apply these CSS variables — they are already in `colors_and_type.css` but replicated here for reference:

```css
/* BACKGROUNDS — 6 levels, always step down */
--midnight-court:   #050505;   /* body bg */
--midnight-deep:    #0a0a0c;   /* sidebar, panel base */
--midnight-raised:  #111114;   /* cards */
--midnight-elev:    #17171c;   /* hover bg, elevated panels */
--midnight-line:    #1f1f26;   /* dividers */
--midnight-mute:    #2a2a33;   /* disabled */

/* FOREGROUND — never pure white */
--gavel-chrome:     #e0e0e0;   /* primary text */
--gavel-silver:     #b8b8bc;   /* secondary */
--gavel-steel:      #7a7a82;   /* tertiary / metadata */
--gavel-graphite:   #4a4a52;   /* quaternary / hints */

/* VERDICT ACCENTS */
--verdict-neon:     #00ffc3;   /* primary — affirmative, selected, confirmed */
--verdict-neon-dim: #00b386;   /* pressed state */
--verdict-violet:   #6a00ff;   /* sealed / privileged */
--verdict-amber:    #ffb800;   /* caution / pending */
--verdict-crimson:  #ff3355;   /* breach / adversarial / missed deadline */

/* BORDERS — always 0.5px, never 1px */
--border-hair:      rgba(224,224,224,0.08);
--border-line:      rgba(224,224,224,0.14);
--border-neon:      rgba(0,255,195,0.35);
--border-neon-hot:  rgba(0,255,195,0.65);
--border-violet:    rgba(106,0,255,0.40);

/* GLOW */
--glow-neon-sm:     0 0 8px rgba(0,255,195,0.35);
--glow-neon-md:     0 0 16px rgba(0,255,195,0.45), 0 0 32px rgba(0,255,195,0.20);
--glow-neon-lg:     0 0 24px rgba(0,255,195,0.55), 0 0 48px rgba(0,255,195,0.25);
--glow-violet-md:   0 0 16px rgba(106,0,255,0.55), 0 0 32px rgba(106,0,255,0.22);
--glow-crimson-md:  0 0 14px rgba(255,51,85,0.55);

/* GLASS */
--glass-bg:         rgba(20,20,26,0.55);
--glass-bg-strong:  rgba(24,24,30,0.78);
--glass-border:     rgba(224,224,224,0.10);
--glass-spec:       rgba(255,255,255,0.06);

/* ELEVATION */
--shadow-1: 0 1px 0 rgba(255,255,255,0.03) inset, 0 1px 2px rgba(0,0,0,0.6);
--shadow-2: 0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 12px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(224,224,224,0.06);
--shadow-3: 0 1px 0 rgba(255,255,255,0.04) inset, 0 16px 40px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(224,224,224,0.08);
--shadow-4: 0 1px 0 rgba(255,255,255,0.05) inset, 0 40px 80px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(0,255,195,0.10);
```

---

## STEP 4 — TYPOGRAPHY RULES

```
Fraunces  → headlines, page titles, matter names (always italic for case names), big numbers
Inter     → body copy, labels, buttons, nav, form fields
JetBrains Mono → case IDs, timestamps, citation tags, chip text, micro-labels, command palette
```

**Type scale (exact px):**
```
--fs-micro:   10px   UPPERCASE MONO tracking-[0.18em] — status chips, IDs, eyebrows
--fs-label:   11px   chips, tags, field labels
--fs-body-sm: 13px   small body, sidebar items
--fs-body:    15px   default body
--fs-body-lg: 17px   lead paragraphs
--fs-h6:      18px   sans 600
--fs-h5:      22px   sans 600
--fs-h4:      28px   sans 600
--fs-h3:      36px   serif 500
--fs-h2:      52px   serif 400
--fs-h1:      72px   serif 400 opsz:144
```

**Line heights:** tight 1.05 · snug 1.20 · body 1.55 · loose 1.75
**Tracking:** tight -0.02em (serif display) · widest 0.18em (uppercase mono micro-labels)

---

## STEP 5 — LAYOUT

```
App shell:     display:flex, flex-direction:column, height:100vh, background:#050505
Top nav:       height:52px (mobile) / 56px (desktop), sticky, glass-blur, 0.5px bottom border
Sidebar:       width:240px (expanded) / 52px (collapsed), background:#0a0a0c, 0.5px right border
Content:       flex:1, overflow:auto
Bento grid:    12-column, 12px gap (--bento-gap), max-width:1280px
Card gap:      14px in matter grid
```

**Blueprint background** (apply to `body::before` or `.bg-blueprint`):
```css
background-image:
  linear-gradient(to right, rgba(0,255,195,0.025) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(0,255,195,0.025) 1px, transparent 1px);
background-size: 48px 48px;
mask-image: radial-gradient(ellipse at 80% 10%, black 0%, transparent 70%);
```

---

## STEP 6 — COMPONENT SPECIFICATIONS

### TOP NAV (56px, glass)
```css
position: sticky; top: 0; z-index: 40;
height: 56px;
background: rgba(10,10,12,0.85);
backdrop-filter: blur(18px) saturate(160%);
border-bottom: 0.5px solid rgba(224,224,224,0.08);
padding: 0 20px;
```
Contents: Logo mark (28×28, neon border) + "LEX PROTOCOL" (Fraunces 14px 500) + "ARES" badge (mono 9px) → flex spacer → search trigger (260px, mono 12px, ⌘K badge) → notification bell → avatar circle

### SIDEBAR (240px / 52px collapsed)
```css
background: #0a0a0c;
border-right: 0.5px solid rgba(224,224,224,0.08);
transition: width 0.22s cubic-bezier(0.16,1,0.3,1);
```
Sections (top→bottom):
1. Logo row (56px) — mark + wordmark + ARES badge
2. Nav items: Dashboard · Clients · Administration — active state: `background:rgba(0,255,195,0.06)`, `border-left:2px solid var(--verdict-neon)`, `color:var(--verdict-neon)`
3. "+ New Matter" dashed button — `border:0.5px dashed rgba(0,255,195,0.28)`, `background:rgba(0,255,195,0.04)`, mono 10px uppercase
4. Search filter input — mono 11px, `background:var(--bg-raised)`
5. "MATTERS · N" micro-label header
6. Matter list — each item: serif italic 12px title + mono 9px status + status dot
7. Bottom: timer row + usage pill + user avatar row + version pill + collapse toggle

### MATTER CARDS (dashboard grid, 3-col)
```css
background: rgba(17,17,20,0.7);
border: 0.5px solid rgba(224,224,224,0.09);
border-radius: 6px;
padding: 16px;
/* hover: */
border-color: rgba(0,255,195,0.25);
transform: translateY(-1px);
transition: all 160ms cubic-bezier(0.16,1,0.3,1);
```
Card anatomy:
- Header row: serif italic 13px title (truncate) + client mono 9px / status chip (right)
- Tags row: case type + jurisdiction — pill chips, mono 9px, `background:rgba(224,224,224,0.04)`
- Stats footer (border-top 0.5px): shield icon + verified count · clock + hours · calendar + deadlines

### STATUS CHIPS (pill, mono 9px uppercase tracking-[0.16em])
```
Active:   color:#00ffc3  border:rgba(0,255,195,0.45)  bg:rgba(0,255,195,0.06)
Pending:  color:#ffb800  border:rgba(255,184,0,0.45)  bg:rgba(255,184,0,0.06)
Urgent:   color:#ff3355  border:rgba(255,51,85,0.45)   bg:rgba(255,51,85,0.06)
Closed:   color:#b8b8bc  border:rgba(224,224,224,0.14) bg:rgba(224,224,224,0.03)
Sealed:   color:#6a00ff  border:rgba(106,0,255,0.45)   bg:rgba(106,0,255,0.06)
```
Always: `padding:3px 8px; border-radius:999px; border:0.5px solid ...`

### BUTTONS
```
Primary:   background:#00ffc3  color:#050505  border:0.5px solid #00ffc3  box-shadow:0 0 14px rgba(0,255,195,0.40)  font-weight:600
Secondary: background:transparent  color:#e0e0e0  border:0.5px solid rgba(0,255,195,0.35)
Ghost:     background:transparent  color:#b8b8bc  border:0.5px solid transparent
Danger:    background:transparent  color:#ff3355  border:0.5px solid rgba(255,51,85,0.40)

All buttons: font-family:Inter  font-size:13px  padding:8px 16px  border-radius:4px
             transition:all 160ms cubic-bezier(0.16,1,0.3,1)
Press state: scale(0.985), background darkens 5%, 80ms
```

### FORM INPUTS
```css
background: rgba(17,17,20,0.7);
border: 0.5px solid rgba(224,224,224,0.10);
border-radius: 4px;
padding: 9px 12px;
font-family: Inter; font-size: 13px; color: #e0e0e0;
/* focus: */
border-color: rgba(0,255,195,0.45);
box-shadow: 0 0 0 3px rgba(0,255,195,0.10);
/* error: */
border-color: rgba(255,51,85,0.45);
```

### MICRO-LABELS (eyebrow / ID labels)
```css
font-family: 'JetBrains Mono';
font-size: 10px; font-weight: 500;
text-transform: uppercase; letter-spacing: 0.18em;
color: var(--fg-tertiary);
/* neon variant: */
color: #00ffc3; text-shadow: 0 0 8px rgba(0,255,195,0.35);
```

### TABS (matter detail)
```css
/* Tab bar */
border-bottom: 0.5px solid rgba(224,224,224,0.08);
padding: 0 8px;

/* Active tab */
color: #00ffc3;
border-bottom: 1.5px solid #00ffc3;
font-weight: 500;
text-shadow: 0 0 8px rgba(0,255,195,0.3);
margin-bottom: -0.5px;

/* Inactive */
color: #7a7a82;
font-family: Inter; font-size: 13px;
padding: 10px 14px;
```

### GLASS SURFACES (top nav, command palette, modals)
```css
background: rgba(20,20,26,0.55);
backdrop-filter: blur(18px) saturate(160%);
-webkit-backdrop-filter: blur(18px) saturate(160%);
border: 0.5px solid rgba(224,224,224,0.10);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), var(--shadow-2);
/* strong variant: */
background: rgba(24,24,30,0.78);
backdrop-filter: blur(32px) saturate(180%);
```

### MODALS
```css
background: #0a0a0c;
border: 0.5px solid rgba(0,255,195,0.22);
border-radius: 10px;
box-shadow: 0 40px 80px rgba(0,0,0,0.8), 0 0 0 0.5px rgba(0,255,195,0.10);
padding: 28px;
/* backdrop: */
background: rgba(0,0,0,0.7);
backdrop-filter: blur(4px);
```

### COMMAND PALETTE (⌘K)
```css
width: 560px;
background: rgba(17,17,22,0.92);
backdrop-filter: blur(32px) saturate(180%);
border: 0.5px solid rgba(0,255,195,0.22);
border-radius: 10px;
box-shadow: 0 32px 64px rgba(0,0,0,0.7);
/* search input: font-size:15px, no border, no bg */
/* result items: padding:10px 16px, border-bottom:0.5px solid rgba(224,224,224,0.05) */
```

### RESEARCH CHAT (matter → Research tab)
- RAG status bar: `border-bottom:0.5px solid rgba(224,224,224,0.08)` — green `[DB]` tags for each connected database
- Messages: user right-aligned `background:rgba(0,255,195,0.08)` / assistant left `background:var(--bg-raised)`
- Citation tags inline: `[DB] VERIFIED` (neon), `[WEB] UNCONFIRMED` (amber), `[MEM] NOT FOUND` (crimson) — mono 9px, bg+border tinted
- Compose: `textarea` + primary "Submit" button + database shortcut chips below

### CITATION TAGS
```
Verified:    color:#00ffc3  bg:rgba(0,255,195,0.06)  border:rgba(0,255,195,0.25)  text:"[DB] VERIFIED"
Unconfirmed: color:#ffb800  bg:rgba(255,184,0,0.06)   border:rgba(255,184,0,0.30)   text:"[WEB] UNCONFIRMED"
Not Found:   color:#ff3355  bg:rgba(255,51,85,0.06)   border:rgba(255,51,85,0.25)   text:"[MEM] NOT FOUND"
All: font-mono 9px uppercase, padding:2px 7px, border-radius:2px, border:0.5px solid
```

---

## STEP 7 — MOTION & EASING

```css
--ease-terminal: cubic-bezier(0.16, 1, 0.3, 1);  /* primary — entry traces, reveals */
--ease-crisp:    cubic-bezier(0.2, 0.6, 0.2, 1);  /* secondary — simple out */

/* Durations */
--dur-instant:  80ms   /* press ack */
--dur-fast:     160ms  /* hover, micro-interactions */
--dur-base:     240ms  /* standard transitions */
--dur-slow:     400ms  /* max for interactive feedback */
--dur-reveal:   800ms  /* page-level Entry Traces */
```

**Entry Trace** (for headlines, hero rows):
```css
@keyframes trace-in {
  0%   { clip-path: inset(0 100% 0 0); opacity: 0; filter: blur(1px); }
  60%  { clip-path: inset(0 0 0 0); opacity: 1; filter: blur(0); }
  100% { clip-path: inset(0 0 0 0); opacity: 1; }
}
.trace-in { animation: trace-in 800ms cubic-bezier(0.16,1,0.3,1) both; }
```

**Sidebar collapse:** `transition: width 0.22s cubic-bezier(0.16,1,0.3,1)`
**No bounces, no springs with overshoot, no confetti, no scale > 1.02.**

---

## STEP 8 — UTILITY CLASSES (from colors_and_type.css)

```
.glass-blur          — liquid glass surface
.glass-blur--strong  — strong glass (modals, palettes)
.bg-blueprint        — 48px neon hairline grid background
.micro-label         — 10px mono uppercase 0.18em tracking
.micro-label--neon   — + neon color + glow
.neon-text           — color:#00ffc3 + glow
.neon-glow           — box-shadow neon md
.hair-border         — 0.5px solid rgba(224,224,224,0.08)
.neon-border         — 0.5px solid rgba(0,255,195,0.35)
.trace-in            — entry trace animation
.scanline            — animated neon scanline (data widgets)
.texture-check       — subtle noise overlay ::after
.term-cursor         — blinking ▌ cursor via ::after
```

---

## STEP 9 — SCROLLBAR

```css
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(224,224,224,0.08); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: rgba(224,224,224,0.14); }
```

---

## STEP 10 — GLOBAL BASE

```css
html, body {
  background: #050505;
  color: #e0e0e0;
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
::selection { background: #00ffc3; color: #050505; }
:focus-visible { outline: 2px solid #00ffc3; outline-offset: 2px; border-radius: 2px; }
```

---

## STEP 11 — ICONS

Primary: **Lucide React** — `strokeWidth={1.5}`, default size 16px inline / 20px buttons / 24px nav. Color: `currentColor`; active: `#00ffc3`.

Custom Blueprint SVGs in `assets/icons/`: gavel-blueprint · seal-blueprint · writ-blueprint · chain-of-custody. Use at 20-24px with `color:#e0e0e0` (chrome) or `color:#00ffc3` (neon active state).

**No emoji. Ever.**

---

## STEP 12 — COPY / VOICE RULES

- Sentence case for UI labels. UPPERCASE for micro-labels and chips.
- Second-person for actions: "You have 3 motions pending."
- Third-person for events: "The court filed an objection at 14:32."
- Timestamps: `2026-04-24 · 14:32 PDT` — monospace, never "today at 2pm"
- No exclamation points. No "Hey!" No emoji.
- Legal terms used precisely — motion, brief, affidavit, deposition, discovery.
- Urgency via Crimson + position, not punctuation.

---

## QUICK COMPONENT CHECKLIST

When building any new component, verify:
- [ ] Background is one of the 6 `--midnight-*` levels (never flat black #000)
- [ ] All borders are `0.5px solid rgba(...)` — never `1px`
- [ ] Neon (#00ffc3) used on at most ONE primary CTA per screen
- [ ] Case names / matter titles use Fraunces italic
- [ ] IDs, timestamps, chips use JetBrains Mono
- [ ] Hover: no lift > 1px, no scale > 1.005 for cards
- [ ] All transitions use `cubic-bezier(0.16,1,0.3,1)`, max 400ms
- [ ] Corner radius max 16px (no rounded-full on rectangles)
- [ ] Scrollbar: 3px, transparent track
- [ ] No emoji anywhere in the UI

---

*Lex Protocol — LexAgent Design System v1.0.0 · 2026-04-24*
