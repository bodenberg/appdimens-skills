# Decision table — intent → scale policy → token

Read top to bottom; the first matching row wins. `L` = the project's layout policy, `T` = its text policy (from `appdimens.config.json → strategy`, otherwise from the defaults below).

## Project defaults (when the config does not set them)

| `formFactors` | `L` (layout) | `T` (text) |
|---|---|---|
| `phone` only | `scaled` → `sdp` | `scaled` → `ssp` |
| `phone` + any of `tablet`, `foldable`, `tv`, `desktop`, `web` | `adaptive` → `asdp` | `adaptive` → `assp` |
| desktop windows only (WPF/WinForms/WinUI, desktop web app) | `adaptive` → `asdp` | `bounded` → `fssp` (when line length / min-max matters) or `assp` |
| game | see `appdimens-games` cheat-sheet | |

Keep one layout policy per screen. A different policy for one element needs a reason in the intent sheet.

## Property rules

| # | Property / role | Policy | Token (Compose syntax; platform skills translate) | Notes |
|---|---|---|---|---|
| 1 | Hairline, border ≤ 2, divider thickness, focus ring, outline | `fixed` | `1.dp` + `// ad:fixed hairline` | Scaling makes them blurry or heavy. Figma strokes are **inside** by default and don't add size: on the web use `box-shadow: inset 0 0 0 1px` (or account for `border` in the box size). |
| 2 | Elevation, shadow blur/offset | `fixed` | `4.dp` | Platform elevation systems expect fixed values. |
| 3 | Platform chrome (status/nav bar, default TopAppBar/NavigationBar/TabBar heights, system sheet grabbers) | `platform` | no token | Scale the *content* inside if needed, not the chrome. |
| 4 | Container width/height that follows its parent | layout primitive | `fillMaxWidth()` / `weight(1f)` / `wrapContentHeight()` | Never a number. |
| 5 | Max readable content width on large screens | `fixed` or `adaptive` cap | `widthIn(max = 600.dp)` `// ad:fixed max-content-width` | A constraint, not a visual size. |
| 6 | Literal share of the window (`fraction` sizing) | `fraction` | `50.spaceW`, `40.spaceH` (percent module) | Not `wdp`: `wdp` is proportional growth, not a share. |
| 7 | Media (image/video/map) | `ratio` | width fill + `aspectRatio(4f/3f)` | Height never `hdp`. |
| 8 | Full-bleed hero/banner height | `height` or `fraction` | `72.hdp` (220 on a 914-tall base) or `24.spaceH` | Only when the design says it tracks screen height. Always `normalize --axis h`. |
| 9 | Touch target (button, icon-button, chip, list row tap area) | visual: `L`; hit area: fixed platform minimum | visual `size(35.asdp)` (48 on a 411 base) + hit area `Modifier.minimumInteractiveComponentSize()` | Never clamp the visual. Hit-area APIs: Compose `minimumInteractiveComponentSize()` (48 dp) · SwiftUI `.contentShape(Rectangle())` + outer `.frame(minWidth: 44, minHeight: 44)` · RN `hitSlop` · web padding / `::before` (24 CSS px WCAG minimum, 44 recommended) · Windows 40 epx. |
| 10 | Control height (button, input, chip) | `L` | `48.sdp` / `48.asdp` | Prefer hug + vertical padding when the design system does. |
| 11 | Spacing: padding, margin, gap, spacer | `L` | `16.sdp` / `16.asdp` | Prefer the parent's gap over spacer elements. |
| 12 | Corner radius | `L` | `12.sdp` / `12.asdp` | Pill shapes: use the shape (`CircleShape`, `Capsule`), not a number. |
| 13 | Icon, avatar, thumbnail | `L` | `24.sdp` / `24.asdp` | Icons inside platform chrome follow rule 3. |
| 14 | Body/heading/caption text | `T` | `16.ssp` / `16.assp` / `16.fssp` | `sp` kind respects the user's font scale. Never a `*Px` value for font size. |
| 15 | Text that must not follow the user's font scale (badge counter in a fixed circle, game score) | `T` with `em` kind | `10.sem` + reason | Rare. Consider `fit-text` instead. |
| 16 | Text that must fit a box (`overflow: fit-text`) | resize | `autoResizeTextSp(…)` / `AutoResizeText` / `autoResizeText(el, {min,max})` | A fit-to-container problem, not a scale strategy. |
| 17 | Line height, letter spacing | follow the text token | `lineHeight = 24.ssp` | Same policy as the font size, or a ratio (`1.5em`). |
| 18 | Vertical rhythm explicitly tied to screen height (onboarding, splash) | `height` | `16.hdp` (48 on a 914-tall base) | Only with evidence; default spacing is rule 11. `hdp` grows with height ÷ 300. |
| 19 | Width-driven columns/panels explicitly tied to screen width | `width` | `120.wdp` | Prefer `fill` + `weight` when it just shares space. |
| 20 | Grid column count / pane count | `adapt` | breakpoints (`sw600` → 3 cols), or an auto-fill grid whose **min item width = the item width on the base frame, normalized** (`(412 − 32 − 12) ÷ 2 = 184` → `134asdp`), so the base screen shows exactly the designed columns | Counts never scale; they switch. Don't invent a different min width. |
| 20b | Pinned bars (bottom nav, FAB, sticky footer) | layout primitive | the bar uses its token height; the scrolling content gets bottom padding = bar height token + safe-area inset (`env(safe-area-inset-bottom)`, `WindowInsets`, `SafeAreaView`) | Otherwise the last items hide behind the bar. |
| 20c | Fixed-width container on large screens (tablet card `max-width: 440px`, centered sheet, dialog) | the container's own intent decides | either scale the container **with the same strategy** as its content (proportions preserved), or keep it fixed and use `bounded` (fluid, ≤ 1.2×) / fixed values inside | Never a fixed container with fully scaling content: at 768 the content grows ~1.5× inside the same 440 px and stops fitting. If `formFactors` excludes desktop but the page can still be opened wide (web), cap the content column at the size it reaches on the largest supported form factor (`max-width`, `ad:fixed max-content-width`). |
| 21 | Real-world size (ruler, card preview at 85.6 mm) | `physical` | `85.6.mm` (units module) | |
| 22 | Canvas / game world / board that must stay fully visible | `fit` | `ftsdp` | |
| 23 | Background art that must cover | `fill` | `flsdp` | |
| 24 | TV-first or dashboard UI where linear growth is too strong | `logarithmic` (or `power` for softer) | `logsdp` / `pwsdp` | Needs a visual reason; ask before using. |
| 25 | Anything else with a designed numeric size | `L` | `N.sdp` / `N.asdp` | |

## User-chosen strategies and special features

The defaults above are a starting point. When the user or the config picks another strategy, keep the same property rules (fixed stays fixed, text uses the `sp` kind) and change only the prefix and the factor:

| Strategy | Pick it when | Base value from the base screen |
|---|---|---|
| `scaled` / `auto` | default phone-only / phone + bigger screens | `normalize --strategy scaled|auto` |
| `power` | linear growth feels too big on large phones/tablets | `--strategy power` |
| `fluid` | text/spacing must stay within 0.8×–1.2× | `--strategy fluid` |
| `interpolated` | half of scaled growth | `--strategy interpolated` |
| `logarithmic` | TV, dashboards, dense desktop UIs | `--strategy logarithmic` |
| `diagonal` / `perimeter` | size must not change with rotation | `--strategy diagonal|perimeter` (reads both sides) |
| `fit` / `fill` | contain / cover (boards, canvases, hero art) | `--strategy fit|fill` (reads both sides) |
| `density` | pixel-density alignment (games, AR) | `--strategy density --dpi <dpi>` |
| `percent` | literal share of the window | `--space w|h|sw` → `50.spaceW` |
| `a` suffix | very tall/wide screens need correction | add `--aspect` |
| **resize** | text/box must fit a container | not normalized: `min`/`max` are final sizes from the design intent |
| **units** | real-world size (mm/cm/in) | not normalized: physical; accuracy depends on reported dpi |

Rules: one strategy per screen; every non-scaled strategy needs its module/package/import (except web, where tokens self-register); the `hdp`/`wdp` variants of the single-axis strategies (scaled, auto, percent, power, fluid, interpolated, logarithmic) read that axis of the base screen (`--axis h|w`); diagonal, perimeter, fit, fill and density read the whole screen, so their `hdp`/`wdp` variants equal `sdp`.

## From design value to base value

AppDimens' reference is **300 wide**; design frames and preview devices are usually 360–440. Converting is therefore never "same number": it depends on the **base screen profile** and the strategy. The full procedure (profile, identification per source, validation, normalization rules `match-base` / `design-at-300` / `as-is`) is in [base-screen.md](base-screen.md). In short:

```
base = (value ÷ density) ÷ factor(strategy, base screen [, axis, aspect])
```

```bash
node <package>/tools/appdimens-kit/cli.mjs normalize --device medium-phone --strategy auto 16 12 24
```

Token columns in the tables above show syntax. Real base values come from `normalize` against the base screen (e.g. a 220 dp hero on a 914-tall Medium Phone is `72.hdp`, not `220.hdp`, which would be ≈ 670 dp there).

Additional rules:
- Fixed-policy values (rules 1–3 and touch minimums) are never normalized.
- Several frames for the same screen (Mobile 360, Tablet 768): normalize from the base (mobile) frame; the others become `adapt` overrides or confirm the strategy (if the designer kept 16 → 16, the intent is `bounded`/`fixed`, not `scaled`).
- Web desktop frames (1440×900): the smallest side is 900, so scaled (×3.0), auto (×1.95) and power (×2.28) grow a lot (fluid caps at ×1.2, logarithmic ≈ ×1.44). Use the mobile frame as the base and express desktop as `adapt` overrides (`@w840`, `@w1200`), or use `bounded`/`fixed` for desktop-only products.
