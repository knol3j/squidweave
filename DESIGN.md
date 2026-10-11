# SquidWeave — DESIGN.md

Design system of record. Changes need explicit user sign-off.

## Product & audience
- **What:** SquidWeave — a marketing command center (campaigns, CRM, funnels, analytics) for **solo marketers and freelancers**.
- **Who:** Indie operators who move fast and need to *trust* their numbers.
- **One line:** *Your numbers, clearly.* A precise, trustworthy instrument — not a gamified console.

## Personality & dials
- **Personality:** Precise & trustworthy — calm, data-first, serious. Confidence comes from clarity, not decoration.
- **ENERGY:** 2 (restrained; one strong accent, not many)
- **RHYTHM:** 3 (consistent, predictable spacing)
- **MOTION:** 2 (purposeful only: loading, toasts, state changes)

## Color
- **Canvas:** light neutral (`--background`, `--card`) — calm and legible.
- **Accent (ONE):** precise teal `--primary: 174 72% 40%` — used for primary actions, active nav, key figures.
- **Neutrals:** slate scale for text/borders (`--foreground`, `--muted-foreground`, `--border`).
- **Status only:** green (success/up), red (error/down), amber (warning). Never decorative.
- **Ban:** per-card gradients, multi-color stat cards, glow, gradient text.

## Typography
- **Family:** Inter (already loaded).
- **Scale:** text-sm body, text-2xl/3xl for key figures, `tabular-nums` for all numbers.
- **Weight:** 400 body, 500/600 for labels and headings. No 800/900 display weight.

## Components
- **Cards:** flat, `bg-card` + 1px `border`, radius `--radius`. No shadow stacks, no gradient fills.
- **Buttons:** primary = accent fill; secondary = outline/ghost. One primary per view.
- **Data:** figures large + tabular, labels small + muted. Deltas only when a real series exists.
- **Empty/loading/error:** always present and honest — never fabricate data to fill a screen.

## Motion
- 150–200ms ease-out for hovers, toasts, sheet/dialog entrances. Nothing looping or attention-seeking.

## Hard bans (antislop)
- Fake metrics, invented testimonials, "Lorem", placeholder counts.
- Emoji as icons; lucide only.
- Gradient CTA buttons, gradient section backgrounds, neon glow.
- Gamified framing ("Commander", "mission control" as literal copy).
