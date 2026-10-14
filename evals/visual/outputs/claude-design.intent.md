# Intent sheet: Profile (Claude Design → web)

```
Target: web · webdimens 3.2.1 · strategy auto (formFactors: phone, tablet) · <style data-webdimens> form
Base screen: Claude Design iPhone 14 device frame 390×844 CSS px · app area 390×797 (minus 47px fake status bar;
             home indicator is an absolute overlay) · portrait · 1× logical · font scale 1.0
             (assumed, unconfirmed) · match-base
Factors (from cli normalize): asdp ×1.300 · assp ×1.300 (no hdp/wdp tokens used, so the runtime height does not matter)
```

## Base screen: decision and how it was determined

- `appdimens.config.json` has no `baseScreen` → Step 3 rule 1 does not apply.
- Rule 2: one unambiguous source. The export has one phone wrapper `.phone-frame { width:390px; height:844px }`, its comment says "iPhone 14 frame", and `cli detect inputs/claude-design` reports `390×844 ×1 (100 %) (html-device-frame) → dominant: use it as "assumed, unconfirmed"`. It matches the catalog's `iphone-14` / `web-mobile` (390×844).
- Prototype chrome removed: `.status-bar` (47px), `.home-indicator`, the `#E5E7EB` page background and the frame itself. App height is 844 − 47 = 797 (passed as `--runtime-height 797`). Only the smallest side (390) is read by `auto`, so this has no effect on the values.
- No `transform: scale` on the canvas. rem = 16px (the root font-size is unchanged).
- Proposed config entry (not written, since the base is unconfirmed): `"design": { "normalization": "match-base", "baseScreen": { "width": 390, "height": 844, "runtimeHeight": 797, "orientation": "portrait", "fontScale": 1, "source": "Claude Design iPhone 14 frame" } }`.

## Strategy

`formFactors` = phone + tablet → decision-table default: layout `adaptive` → `asdp`, text `adaptive` → `assp`. Hairlines and focus rings are fixed. Theme scale (spacing, radius, type) is written once as exact `--theme` tokens in CSS custom properties. The one-off sizes (avatar, icon, button height) use the 0.5 rounding. Font sizes are exact.

## Nodes → tokens

| Node (data-k) | Role | Sizing W/H | Overflow | Scale | Source → token | Conf |
|---|---|---|---|---|---|---|
| main.screen | screen / stack-v | fill / hug | scroll-v (page) | spacing adaptive | px-4 16 → `var(--space-16)`=12.31asdp; pt-2 8 → 6.15asdp; gap-4 16 → 12.31asdp; safe-area insets fixed | 0.90 |
| header | card / stack-v centred | fill / hug | none | adaptive | p-4 16 → 12.31asdp; rounded-2xl 16 → `--radius-16` 12.31asdp; border 1px → 1px ad:fixed hairline | 0.95 |
| avatar | media (avatar) | fixed / fixed | clip | adaptive | 80 → 61.5asdp (79.95 on base); rounded-full → 50% shape | 0.95 |
| name | text (h1) | hug / hug | none | adaptive text | clamp(20px,5vw,24px) → 5vw of the 390 frame = 19.5 → clamped 20 → 15.38assp; line-height 1.3; weight 700; mt-6 24 → 18.46asdp | 0.80 |
| email | text | hug / hug | none | adaptive text | text-sm 14 → 10.77assp, lh 20/14 = 1.4286; mt-1 4 → 3.08asdp; #6B7280 | 0.95 |
| stats | grid (3 cols, `.map()`) | fill / hug | none | adaptive | repeat(3,1fr), count fixed; p-4 16 → 12.31asdp; r 16 → 12.31asdp; border fixed | 0.95 |
| statvalue | text | hug / hug | none | adaptive text | text-lg 18 → 13.85assp, lh 28/18 = 1.5556; 700. Labels: 14 → 10.77assp | 0.95 |
| list | list (`<ul>`, `.map()`) | fill / hug | none | adaptive | r 16 → 12.31asdp; border fixed | 0.95 |
| row | stack-h (tap target) | fill / hug | none | adaptive | p-4 16 → 12.31asdp; border-bottom 1px #F3F4F6 → ad:fixed hairline; row ≈ 57px tall (above the 44px minimum, no extra hit area needed) | 0.90 |
| (row content) | stack-h | hug / hug | none | adaptive | gap-3 12 → `--space-12` 9.23asdp | 0.95 |
| rowicon | icon | fixed / fixed | none | adaptive | 24 → 18.5asdp (24.05); radius 6 → `--radius-6` 4.62asdp | 0.95 |
| rowlabel | text | hug / hug | none | adaptive text | text-base 16 → 12.31assp, lh 24/16 = 1.5 | 0.95 |
| chevron › | icon-text | hug | none | adaptive text | inherits body 16 → 12.31assp, line-height normal (same as the prototype) | 0.90 |
| button | button | fill / fixed | none | adaptive | h-12 48 → 37asdp (48.1); rounded-xl 12 → 9.23asdp; text 16 → 12.31assp lh 1.5; 600; focus ring 2px fixed | 0.95 |
| status bar, home indicator, phone frame | platform chrome (prototype) | — | — | — | removed | 1.00 |

## Validation

- `cli lint --force --config …`: 0 errors, 0 warnings.
- Playwright (chromium headless), `getBoundingClientRect` on every `data-k`:
  - **Base 390×797** vs the prototype app area: every box matches to within 0.1px. Examples: header 358×188 vs 358×187.9, avatar 80 vs 79.9, button 48 vs 48.1, name 20px vs 19.994px.
  - **300×533** (reference): 16 → 12.31px, avatar 61.5px, no horizontal scroll.
  - **768×1024** and **1024×768** (smallest side 768): ×1.87. Padding 23px, text 16 → 23px, avatar 115px. No horizontal scroll. Cards stretch the full window width (see needs review).

## Needs review

1. **Name `clamp(20px, 5vw, 24px)`**: resolved on the base frame (20) and the bounds were dropped, because the design has no frame at another size. `auto` now governs growth: 28.7px at 768, so the upper bound of 24 is not kept. (0.8)
2. **Large screens (768/1024)**: the design has only a phone frame, so no content-width cap or breakpoint was invented. All cards stretch to the full width, which is noticeably wide at 1024. Candidate fix: a `max-width` cap with `margin-inline: auto` (rule 5), if the user gives a value.
3. Base screen is **assumed, unconfirmed** (390×844 iPhone 14 frame).
4. The row is made focusable (`tabindex`) for the keyboard. The prototype has no hover/pressed states, so none were added.

## Questions I would have asked a user (none blocking, so I proceeded)

1. Confirm the base screen is 390×844 (iPhone 14), and may I record it in `appdimens.config.json → design.baseScreen`?
2. On tablet/desktop widths, should the profile column be capped (e.g. a max-width centred column), or fill the window as now?
3. Should the name keep the 20–24px bounds of the `clamp()` (for example via `fssp` bounded text), or grow with `auto` like the rest of the text?

## Exact CLI commands run

```bash
K=/home/user/appdimens-skills/tools/appdimens-kit/cli.mjs
node $K detect inputs/claude-design
node $K devices
node $K normalize --frame 390 --height 844 --runtime-height 797 --strategy auto --theme 4 8 12 16 24 6 48 80
node $K normalize --frame 390 --height 844 --runtime-height 797 --strategy auto --text 14 16 18 20
node $K normalize --frame 390 --height 844 --runtime-height 797 --strategy auto 80 24 48 6
node $K normalize --frame 390 --height 844 --runtime-height 797 --strategy auto --theme 12 16
node $K lint --force --config inputs/claude-design/appdimens.config.json outputs/claude-design.html   # 0 errors, 0 warnings (run twice)
```

The CLI prints tokens in Compose syntax (`12.31.asdp`). In web CSS they are written as `12.31asdp`.
