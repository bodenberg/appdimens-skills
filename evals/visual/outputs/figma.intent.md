# Intent sheet — Home (Figma "Shop App — Mobile")

```
Target: web · webdimens 3.2.1 · strategy auto (formFactors: phone, tablet) · text assp
Base screen: Figma "Home — Android Compact" 412×917 CSS px · portrait · font 1.0 (assumed, unconfirmed) · match-base
Factors (from cli normalize): asdp ×1.3733 · assp ×1.3733 (no hdp/wdp values used)
Form: <style data-webdimens> (single-file page, no build) + runtime ../node_modules/webdimens/dist/webdimens.global.js
```

## Base screen decision

- `appdimens.config.json` has no `baseScreen` → Step 3 rule 1 does not apply.
- `cli detect inputs/figma` found exactly one piece of evidence: the Figma frame 412×917 (100 %, "dominant ≥ 80 %"). The frame is named "Android Compact" and matches the catalog preset `figma-android-compact` (412×917, logical units).
- 412 < 640 wide and portrait → logical units (CSS px at 1×), not physical px; no density needed.
- One unambiguous source → Step 3 rule 2: use it, mark **assumed, unconfirmed**, proceed. A design frame wins over the web default 390×844 (base-screen.md §5).
- Height-driven values: none (no `hdp`, no fit/fill), so the status bar / runtime height question does not arise.
- Offer: record `"design": { "baseScreen": { "device": "figma-android-compact", "width": 412, "height": 917, "orientation": "portrait", "fontScale": 1 } }` in `appdimens.config.json` (not written — no user to confirm).

## Strategy

- `formFactors` = phone + tablet → decision-table defaults: layout `adaptive` → `asdp`, text `adaptive` → `assp`. One strategy for the whole screen.
- Normalization `match-base`: layout one-off values rounded to 0.5 (`design.rounding` default); font sizes exact (`--text`, 0.01). No Figma variables are bound, so no theme tokens (`--theme`) were generated; values are used at the call site.
- Fixed (never normalized): 1 px strokes (inside strokes → `box-shadow: inset`, so they add no size, as in Figma), 2 px focus ring, 44 px chip hit area, pill radius (shape).
- Line heights: unitless ratios of the font size.

## Nodes → tokens

| Node | Role | Sizing W/H | Overflow | Scale | Source → token | Conf |
|---|---|---|---|---|---|---|
| Home — Android Compact (1:2) | screen `<main>` | fill / fill | scroll-v | spacing auto | pad 24/16/0 → `17.5asdp 11.5asdp`; gap 16 → `11.5asdp`; bottom pad = nav `46.5asdp` + `env(safe-area-inset-bottom)` (rule 20b) | 0.95 |
| Header (1:3) | stack-h `<header>` | fill / hug | none | — | space-between, center (no gap in design; `11.5asdp` min gap added) | 0.90 |
| Header/Title "Discover" | text `<h1>` | hug / hug | none | text auto | 24 → `17.48assp`, lh 32/24 = 1.3333, 700, #111827 | 0.95 |
| Header/Avatar | media (ellipse) | fixed / fixed | — | auto | 40 → `29asdp`, radius 50 %, #C7D2FE | 0.90 |
| Input/Search (1:6) | input `<input type=search>` in `<form role=search>` | fill / fixed | none | auto | h 48 → `35asdp`; pad-x 16 → `11.5asdp`; r 12 → `8.5asdp`; text 16 → `11.65assp`, lh 1.5; bg #F3F4F6; placeholder #6B7280 | 0.95 |
| Chips (1:8) | stack-h, wrap (`role=group`) | fill / hug | wrap | auto | gap 8/8 → `6asdp` | 0.90 |
| Chip / Chip/Selected | chip `<button aria-pressed>` | hug / hug | none | auto; hit area fixed | pad 8/16 → `6asdp 11.5asdp`; r 999 → pill (`999px`, ad:fixed); text 14 → `10.19assp`, lh 20/14 = 1.4286; selected bg #111827, text #FFF, 600; others stroke 1 #E5E7EB (fixed); hit area `::before` min 44 px | 0.90 |
| Section title "Popular now" (1:9) | text `<h2>` in `<section>` | hug / hug | none | text auto | 18 → `13.11assp`, lh 24/18 = 1.3333, 600, #111827 | 0.95 |
| Products (1:10) | grid `<ul>` | fill / hug | wrap | auto | gap 12 → `8.5asdp`; `repeat(auto-fill, minmax(min(134asdp,100%), 1fr))` — min item = (412 − 32 − 12) ÷ 2 = 184 → `134asdp` (rule 20) | 0.80 |
| Card/Product | card `<article>` | fill / hug | none | auto | pad 12 → `8.5asdp`; gap 8 → `6asdp`; r 12 → `8.5asdp`; stroke 1 #E5E7EB (fixed, inset) | 0.90 |
| Card/Image | media | fill / ratio | clip | — | `aspect-ratio: 4/3`; r 8 → `6asdp`; linear gradient (top→bottom) per card | 0.90 |
| Card/Title | text `<h3>` | fill / hug | truncate (2 lines) | text auto | 16 → `11.65assp`, lh 22/16 = 1.375, 500, `-webkit-line-clamp: 2` | 0.95 |
| Card/Price | text `<p>` | fill / hug | none | text auto | 14 → `10.19assp`, lh 1.4286, 700 | 0.95 |
| Navigation/Bottom (1:11) | nav `<nav>` (pinned overlay, `position: fixed`) | fill / fixed | none | auto | h 64 → `46.5asdp` (+ safe-area padding); top stroke 1 #E5E7EB (fixed); bg #FFF | 0.85 |
| Nav/Tab ×4 | stack-v link | fill (equal share) / fill | none | auto | gap 4 → `3asdp`; label 12 → `8.74assp`, lh 16/12 = 1.3333 | 0.75 |
| Nav/Tab/Icon | icon (inline SVG) | fixed / fixed | — | auto | 24 → `17.5asdp` | 0.90 |

Measured with Playwright (Chromium) via `data-k`: on 412×917 every value matches the design within rounding (title 24.01 px / 32 lh, avatar 39.8, search 380.4×48.1 r 11.67, chip 36.5 h, card 184.4 wide / 12 pad / 160×120 image, nav 63.8, icon 24). 300×533: everything equals the base numbers, 2 columns, no horizontal scroll. 768×1024 and 1024×768 (smallest side 768): ×1.87 (auto damping), 2 resp. 3 columns from the same auto-fill rule, no horizontal scroll.

## Needs review

- **Base screen** 412×917 is assumed (single frame), not confirmed.
- **Products grid** (0.80): Figma says wrap + fill children with no explicit card width; 2 columns on the base frame inferred from the 4 repeated instances and the frame width. Column count on tablets comes from the auto-fill min width (no breakpoints in the config, none invented).
- **Nav tabs** (0.75): the export collapses the 4 tabs into one summarised node (`count: 4`); equal-width distribution, icon glyphs (Home/Search/Cart/Profile) and the active state are my guesses; no icon or label colours in the export → inherit #111827.
- **Missing text colours**: unselected chips, card title/price and nav labels have no fill in the export → #111827 (the colour used by the other dark texts). Figma's default would be black #000000.
- **Gradient direction**: `GRADIENT_LINEAR` without handle positions → top-to-bottom assumed.
- **Header gap**: not in the design (space-between only); a `11.5asdp` minimum gap was added so the title never touches the avatar at narrow widths.
- **Large screens**: no `max-width` cap was added (phone + tablet only). On a desktop window the auto curve still grows ≈ 2×; if desktop matters, add `max-width` (ad:fixed) or `@w840` overrides.
- **Inter** is referenced but not bundled (self-contained page) → falls back to Arial where Inter is not installed.

## CLI commands run

```bash
node /home/user/appdimens-skills/tools/appdimens-kit/cli.mjs detect inputs/figma
node /home/user/appdimens-skills/tools/appdimens-kit/cli.mjs devices
node /home/user/appdimens-skills/tools/appdimens-kit/cli.mjs normalize --device figma-android-compact --strategy auto 4 8 12 16 24 40 48 64 184
node /home/user/appdimens-skills/tools/appdimens-kit/cli.mjs normalize --device figma-android-compact --strategy auto --text 12 14 16 18 24
node /home/user/appdimens-skills/tools/appdimens-kit/cli.mjs lint --force --config inputs/figma/appdimens.config.json outputs/figma.html
#   → 0 error(s), 0 warning(s) in 1 file(s).
```

Conversions used (base 412, factor 1.3733): 4 → 3asdp · 8 → 6asdp · 12 → 8.5asdp · 16 → 11.5asdp · 24 → 17.5asdp · 40 → 29asdp · 48 → 35asdp · 64 → 46.5asdp · 184 → 134asdp · text 12 → 8.74assp · 14 → 10.19assp · 16 → 11.65assp · 18 → 13.11assp · 24 → 17.48assp.

## Questions I would have asked a user (none blocked the work)

1. Is the 412×917 "Android Compact" frame the canonical base for the web build? May I record it in `appdimens.config.json → design.baseScreen`?
2. Should the grid switch to 3 columns at a tablet breakpoint (e.g. `sw600`), or is the auto-fill behaviour (2 cols at 768, 3 at 1024) fine?
3. Which nav tab is active, and what are the icon/label colours (active/inactive)?
4. Should the page cap its content width on desktop windows?
