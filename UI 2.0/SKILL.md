---
name: lexagent-design
description: Use this skill to generate well-branded interfaces and assets for LexAgent / Lex Protocol — the AI-powered legal research platform (Harvey AI competitor). Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping or production work.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. Use `colors_and_type.css` and `components.css` for all styling — do not invent new colors or type styles. Reference `ui_kits/app/` for component patterns.

If working on production code, read the token definitions in `colors_and_type.css` and the Tailwind preset in `tailwind.preset.js`, then use them to produce Next.js + Tailwind components that match the Lex Protocol / Midnight Court design system exactly.

Key rules to follow:
- **Dark mode only.** Background: `--midnight-court` (#050505). No light mode ever.
- **Neon is precious.** `--verdict-neon` (#00ffc3) on ONE primary action per screen. Focus rings, selected states only.
- **Hairlines.** All borders are `0.5px solid rgba(...)`. Never 1px colored borders for structure.
- **Typography.** Fraunces (serif display) + Inter (sans body) + JetBrains Mono (data). If a number might be copy-pasted, it's mono.
- **Micro-labels.** CASE IDs, timestamps, and status labels use `font-mono 10px uppercase tracking-[0.18em]`.
- **No emoji.** Ever. Use Lucide icons at 1.5px stroke.
- **No bouncy motion.** `cubic-bezier(0.16, 1, 0.3, 1)` for all primary transitions. Max 400ms for interactive feedback.
- **Cards always carry** a micro-label eyebrow (e.g. `CASE ID · 4492-X`) in uppercase mono.
- **Copy tone.** Senior partner voice — precise, dry, no exclamation points. Second-person for actions. ISO timestamps only.

If the user invokes this skill without other guidance, ask what they want to build or design (mock, prototype, production component, slide, etc.), ask a few focused questions, then act as an expert designer / frontend architect producing HTML artifacts or production-ready Next.js + Tailwind code.
