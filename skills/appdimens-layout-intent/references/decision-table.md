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
| 1 | Hairline, border ≤ 2, divider thickness, focus ring, outline | `fixed` | `1.dp` + `// ad:fixed hairline` | Scaling makes them blurry or heavy. |
| 2 | Elevation, shadow blur/offset | `fixed` | `4.dp` | Platform elevation systems expect fixed values. |
| 3 | Platform chrome (status/nav bar, default TopAppBar/NavigationBar/TabBar heights, system sheet grabbers) | `platform` | no token | Scale the *content* inside if needed, not the chrome. |
| 4 | Container width/height that follows its parent | layout primitive | `fillMaxWidth()` / `weight(1f)` / `wrapContentHeight()` | Never a number. |
| 5 | Max readable content width on large screens | `fixed` or `adaptive` cap | `widthIn(max = 600.dp)` `// ad:fixed max-content-width` | A constraint, not a visual size. |
| 6 | Literal share of the window (`fraction` sizing) | `fraction` | `50.spaceW`, `40.spaceH` (percent module) | Not `wdp`: `wdp` is proportional growth, not a share. |
| 7 | Media (image/video/map) | `ratio` | width fill + `aspectRatio(4f/3f)` | Height never `hdp`. |
| 8 | Full-bleed hero/banner height | `height` or `fraction` | `220.hdp` or `35.spaceH` | Only when the design says it tracks screen height. |
| 9 | Touch target (button, icon-button, chip, list row tap area) | `L`, clamped | `Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)` + `height(48.asdp)` | Min: 48 dp Android · 44 pt Apple · 24 CSS px web (44 recommended) · 40 epx Windows. The minimum is a fixed value by design. |
| 10 | Control height (button, input, chip) | `L` | `48.sdp` / `48.asdp` | Prefer hug + vertical padding when the design system does. |
| 11 | Spacing: padding, margin, gap, spacer | `L` | `16.sdp` / `16.asdp` | Prefer the parent's gap over spacer elements. |
| 12 | Corner radius | `L` | `12.sdp` / `12.asdp` | Pill shapes: use the shape (`CircleShape`, `Capsule`), not a number. |
| 13 | Icon, avatar, thumbnail | `L` | `24.sdp` / `24.asdp` | Icons inside platform chrome follow rule 3. |
| 14 | Body/heading/caption text | `T` | `16.ssp` / `16.assp` / `16.fssp` | `sp` kind respects the user's font scale. Never a `*Px` value for font size. |
| 15 | Text that must not follow the user's font scale (badge counter in a fixed circle, game score) | `T` with `em` kind | `10.sem` + reason | Rare. Consider `fit-text` instead. |
| 16 | Text that must fit a box (`overflow: fit-text`) | resize | `autoResizeTextSp(…)` / `AutoResizeText` / `autoResizeText(el, {min,max})` | A fit-to-container problem, not a scale strategy. |
| 17 | Line height, letter spacing | follow the text token | `lineHeight = 24.ssp` | Same policy as the font size, or a ratio (`1.5em`). |
| 18 | Vertical rhythm explicitly tied to screen height (onboarding, splash) | `height` | `48.hdp` | Only with evidence; default spacing is rule 11. |
| 19 | Width-driven columns/panels explicitly tied to screen width | `width` | `120.wdp` | Prefer `fill` + `weight` when it just shares space. |
| 20 | Grid column count / pane count | `adapt` | breakpoints (`sw600` → 3 cols) | Counts never scale; they switch. |
| 21 | Real-world size (ruler, card preview at 85.6 mm) | `physical` | `85.6.mm` (units module) | |
| 22 | Canvas / game world / board that must stay fully visible | `fit` | `ftsdp` | |
| 23 | Background art that must cover | `fill` | `flsdp` | |
| 24 | TV-first or dashboard UI where linear growth is too strong | `damped` | `logsdp` / `pwsdp` | Needs a visual reason; ask before using. |
| 25 | Anything else with a designed numeric size | `L` | `N.sdp` / `N.asdp` | |

## From design value to base value

AppDimens' reference screen is **300 wide** (`16.sdp == 16` only at 300). A designer's frame is usually wider (360, 375, 390, 393, 412, 430). The project picks one rule once, in `design.normalization`:

| `normalization` | Base value | Result on a device as wide as the frame | Use when |
|---|---|---|---|
| `design-at-300` | design value as-is | — designers draw on a 300-wide frame | New design systems. Cleanest numbers. |
| `match-frame` | `design ÷ factor(policy, frameWidth)`, rounded to `design.rounding` (default 0.5) | ≈ the design value (pixel fidelity at the frame width) | Teams that compare the build against the design on the reference device. |
| `as-is` | design value as-is | design × factor (16 → 19.2 on 360 with `sdp`) | The AppDimens default ("write 16, it grows comfortably"). Say it out loud, because the build will look larger than the design on the frame-width device. |

Factor by policy and smallest side `d` (portrait phone frames: `d` = frame width; landscape/desktop frames: `d` = frame height):

| d | scaled `d/300` | adaptive (auto) | bounded (fluid) |
|---|---|---|---|
| 300 | 1.000 | 1.000 | 0.800 |
| 320 | 1.067 | 1.067 | 0.800 |
| 360 | 1.200 | 1.200 | 0.836 |
| 375 | 1.250 | 1.250 | 0.849 |
| 390 | 1.300 | 1.300 | 0.863 |
| 393 | 1.310 | 1.310 | 0.865 |
| 412 | 1.373 | 1.373 | 0.882 |
| 430 | 1.433 | 1.433 | 0.898 |
| 600 | 2.000 | 1.735 | 1.050 |
| 768 | 2.560 | 1.869 | 1.200 |
| 900 | 3.000 | 1.950 | 1.200 |
| 1080 | 3.600 | 2.039 | 1.200 |

Formulas: scaled `d/300`; auto `d/300` up to 480, then `1.6 + 0.4·ln(1 + (d−480)/300)`; fluid `clamp(0.8 + 0.4·(d−320)/448, 0.8, 1.2)`.

**Do not do this arithmetic by hand.** Run `node <package>/tools/appdimens-kit/cli.mjs normalize --frame 360 --policy auto 16 12 24` and paste its output into the intent sheet.

Rules:
- Fixed-policy values (rule 1–3, minimum touch targets) are **never** normalized.
- Several frames for the same screen (Mobile 360, Tablet 768): normalize from the smallest; the others become `adapt` overrides or confirm the chosen policy (compare `design_tablet ÷ design_mobile` against the factor ratio; if the designer kept 16 → 16, the intent is `bounded`/`fixed`, not `scaled`).
- Web desktop frames (1440×900): the smallest side is 900, so every policy grows a lot. Design the mobile frame as the base and express the desktop frame as `adapt` overrides (`@w840`, `@w1200`), or use `bounded`/`fixed` for desktop-only products.
