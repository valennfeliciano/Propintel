# PropIntel — Design System

A restrained "underwriting terminal": calm light surface, tinted neutrals, one
working accent, monospace for every figure so numbers read like a spreadsheet,
not marketing. The data is the design.

## Theme
Light. Scene: an investor at a desk in daylight, scanning numbers across many
listings, comparing figures. Daylight + dense data + long sessions → a calm,
low-glare light surface beats a moody dark dashboard. Semantic color does the
signaling, not the chrome.

## Color (OKLCH, neutrals tinted toward the brand hue ~165)
- Canvas: `oklch(0.985 0.004 165)` (near-white, faint green tint) — never #fff.
- Surface: `oklch(0.995 0.003 165)` on cards/panels.
- Ink: `oklch(0.22 0.02 165)` primary, `oklch(0.55 0.015 165)` muted — never #000.
- Accent (value / money / good): emerald `oklch(0.62 0.13 162)`. Carries ≤10% of surface (Restrained strategy).
- Semantics: caution amber `oklch(0.72 0.13 75)`; risk/pass rose `oklch(0.62 0.16 18)`; neutral slate for "Pass".
- Use semantic color only on verdicts, deltas, and score states. Everything else is tinted neutral.

## Typography
- UI: Geist Sans. Figures, prices, scores, metrics: Geist Mono (the terminal tell).
- Scale ratio ≥1.25. Hero ~clamp(1.9rem, 4vw, 2.6rem)/bold; section labels ~11px uppercase tracked; body 14–15px; body measure ≤72ch.

## Elevation & shape
- Borders over shadows for structure; one soft shadow only on the floating slide-over and on card hover. Radius 12–16px on cards/panels, 8–10px on controls, full on pills.
- No nested cards. Most groupings use a divider or spacing, not a box.

## Motion
- Ease-out-expo/quint only, 200–320ms. Animate transform/opacity/width, never layout. No bounce.

## Bans (project-specific, on top of the skill's global bans)
- No gradient text, no side-stripe accent borders, no glassmorphism-by-default, no hero-metric-with-gradient template, no em dashes in copy.
- No "AI thinking" theater — the loading state names the work ("Analyzing"), the result shows the math.

## i18n
English / Spanish toggle. UI chrome, labels, methodology, and educational copy
are translated; scraped listing descriptions stay in their source language and
are labeled as such.
