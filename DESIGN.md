# TourneyPal Design System

This document is the source of truth for TourneyPal UI and brand consistency.

## Brand

- Product name: `TourneyPal`
- Voice: energetic, competitive, clear, community-focused
- Visual style: dark-mode-first, high-contrast, geometric, minimal clutter

## Core Design Tokens

Use these tokens from `tailwind.config.ts` and avoid ad-hoc color values.

- `volt`: `#D4FF00` (primary action/highlight)
- `volt-hover`: `#BCE600`
- `cyan-accent`: `#00E5FF` (secondary accent)
- `dark-bg`: `#0B0E14` (main background)
- `card-bg`: `#151A23` (surface background)
- `border-dark`: `#222A38`
- `text-muted`: `#94A3B8`
- `success`: `#10B981`
- `warning`: `#F59E0B`
- `error`: `#EF4444`

## Typography

- Heading/display: `font-display` (Space Grotesk)
- Body/UI/data: `font-sans` (Inter)
- Use `tabular-nums` for live scores and stats to prevent layout shifting.

## Components and Usage Rules

- Buttons:
  - Primary: `.btn.btn-primary`
  - Secondary/neutral: `.btn.btn-ghost`
  - Danger: `.btn.btn-danger`
- Inputs: `.input`
- Labels: `.label`
- Standard panel container: `.card`
- Sticky translucent bars (top nav, overlays): `.glass-panel`
- Live/final/upcoming chip: `StatusBadge` component
- Match preview rows/cards: `MatchCard` component

## Layout Principles

- Prefer card-based sections with clear hierarchy.
- Keep primary actions near the top of each screen.
- Use spacing generously; avoid dense text blocks.
- On mobile, stack vertically and preserve tap targets.

## Accessibility Baselines

- Meet WCAG AA contrast minimum for body text and controls.
- Never use color alone to communicate status; include text labels.
- Keep focus styles visible on interactive elements.
- Use semantic headings (`h1`, `h2`, etc.) in page structure.

## Implementation Guidance

- Always consume palette/typography from Tailwind tokens.
- Reuse existing UI components before introducing new variants.
- If a new variant is needed, update this file and add a reusable component.
- Avoid introducing one-off CSS unless it is a broadly reusable utility.

## Definition of Done (Design Consistency)

Before merging UI changes, verify:

- Branding says `TourneyPal` only.
- Colors match system tokens.
- Typography uses `font-display` and `font-sans` appropriately.
- Buttons/inputs/cards use shared classes/components.
- Status visuals follow `StatusBadge` patterns.
- New screens are visually aligned with the homepage and nav style.
