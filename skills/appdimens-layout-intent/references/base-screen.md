# Base screen profile — the denominator of every conversion

Every number in a design or in existing code was chosen **while looking at one screen**: the Figma frame, the Claude Design canvas, the Compose `@Preview`, the developer's emulator. AppDimens then multiplies each value by a factor computed from the **screen it runs on**. To keep a value looking right, you must know the screen it was chosen on — not just the device name, but every property the chosen strategy reads.

## 1. The library's base rule (never forget it)

- Reference canvas **300 × 533** (aspect 1.78). On it every token equals its number (`16.sdp == 16`) — except `fluid` (×0.8 at ≤ 320 wide) and `density` (dpi ÷ 160). So `design-at-300` with fluid still divides by 0.8.
- Scaled tokens: `value × axis ÷ 300`. `sdp/ssp` read the **smallest side**, `wdp/wsp` the **width**, `hdp/hsp` the **height**. All three divide by **300**: `hdp` is *not* divided by 533 (verified in `appdimens-dynamic` `DimenMetrics.screenHeightFactor`), so `1.hdp ≈ 3 dp` on a 914-tall phone.
- `sp` kinds (`ssp`, `assp`…) also multiply by the user's **font scale**; `em` kinds (`sem`) don't.
- Values follow the **window**, not the physical display: split screen, freeform/desktop windows, foldables and rotation change them. The `i` suffix returns the **unscaled base value** while in multi-window (`16.sdpi` → 16 dp); only `appdimens-games` freezes the full-screen metrics instead.

## 2. The profile (what to identify)

| Property | Why it matters | Example |
|---|---|---|
| **Logical size** W × H (dp / pt / CSS px) | Every axis-based strategy reads it | Medium Phone 411 × 914 dp |
| **Resolution** (physical px) and **density** (dpi, @2x/@3x, devicePixelRatio) | Designs drawn in px must be divided by density first; the `density` strategy and `Px` tokens read it; `units` (mm/cm/in) depend on dpi | 1080 × 2400 px at 420 dpi (2.625) = 411 × 914 dp |
| **Orientation** | Which side is "smallest"; inverters (`sdpLw`, `hdpLw`…) swap axes by orientation | Landscape tablet 1280 × 800 → smallest 800 |
| **Aspect ratio** (longer ÷ shorter) | The `a` suffix (`sdpa`), `fill`, `fit`, `diagonal`, `perimeter` read it | 914 / 411 = 2.22 (tall phone) vs 1.78 reference |
| **Window vs screen** | Values follow the window; a design for a resizable desktop/web window has no fixed size | WPF window 1280 × 800 |
| **Runtime height (system bars / insets)** | The height the library reads may differ from the frame height → matters for `hdp`/`hsp`, the `a` suffix and fit/fill/diagonal/perimeter. Pass it with `--runtime-height` / `baseScreen.runtimeHeight` | see the table below |
| **Font scale** | `ssp` multiplies by it; designs are normally at 1.0 | Designer previewed at 115 % → divide text by 1.15 |
| **UI mode / form factor** | Facilitators and builders branch on TV, car, watch, fold state | `sdpMode(…, TELEVISION)` |

`node <package>/tools/appdimens-kit/cli.mjs devices` lists common screens with logical size and density.

What each library reads at runtime (so you know which height is the base for height-driven values):

| Library | Width / smallest | Height | Note |
|---|---|---|---|
| appdimens-dynamic / kmp (Android) | `Configuration.screenWidthDp` / `smallestScreenWidthDp` | `Configuration.screenHeightDp` | Apps targeting SDK ≤ 34 usually get a height without system bars; 35+ (edge-to-edge) includes them. Verify on the target device. |
| appdimens-sdps / ssps (XML) | resource bucket `values-swN` / `-wN` | bucket `values-hN` | Factor = **floor bucket ÷ 300** (914 → h900 → ×3.00). Use `normalize --xml`. |
| appdimens-ios | full window (safe areas added back; keyboard never rescales) | full window | — |
| appdimens-flutter | `MediaQuery.size` | `MediaQuery.size` | — |
| appdimens-react-native | `Dimensions.get('window')` | same | — |
| webdimens | `innerWidth` | `documentElement.clientHeight` | Mobile URL bar is excluded. |

## 3. What each strategy reads (so you know which properties matter)

| Strategy (prefix) | Reads | Factor on the base screen | Notes |
|---|---|---|---|
| scaled (`sdp`, `hdp`, `wdp`) | one axis | `axis / 300` | default |
| auto (`a`) | one axis | `axis/300` up to 480, then `1.6 + 0.4·ln(1 + (axis−480)/300)` | phone + tablet/TV |
| percent (`p`) | one axis | same as scaled; `spaceW/H/Sw(p)` = **p % of the axis** (literal) | use `--space` |
| power (`pw`) | one axis | `(axis/300)^0.75` | softer growth |
| fluid (`f`) | one axis | `0.8 … 1.2` linear between 320 and 768, clamped | bounded text |
| interpolated (`i`) | one axis | `0.5 + 0.5·axis/300` | half of scaled growth |
| logarithmic (`log`) | one axis | `1 ± 0.4·ln(axis/300)` | TV / dashboards |
| diagonal (`dg`) | both sides (the `hdp`/`wdp` variants of dg/pr/ft/fl/d equal `sdp`) | `√(w² + h²) / 611.63` | rotation-invariant |
| perimeter (`pr`) | both sides | `(w + h) / 833` | rotation-invariant |
| fill (`fl`) | both sides | `max(short/300, long/533)` | cover |
| fit (`ft`) | both sides | `min(short/300, long/533)` | contain |
| density (`d`) | dpi | `dpi / 160` | ignores screen size |
| `a` suffix | aspect ratio | scaled: `1 + (axis−300)(1/300 + 0.00267·ln(ρ/1.78))`; others: × `(1 + 0.00267·ln(ρ/1.78))` | tall/wide screens |

The CLI implements all of these: `normalize --strategy <name> [--axis s|h|w] [--aspect] [--text] [--density] [--dpi]`.

## 4. Features that are not normalized the same way

| Feature | What the base screen means for it |
|---|---|
| **resize** (`autoResizeTextSp`, `AutoResizeText`, `autoResizeText(el)`, `DimenResize`) | Not a scale curve. It picks the largest size in `[min, max]` that fits the **container**. Take `min`/`max` from the design's intent ("title between 12 and 28, max 2 lines") as final sp/dp sizes. If the container itself scales, size the container with the normal strategy and let resize fit inside it. Percent bounds (`resizePercentSw/W/H`, inner-box percent) are relative and need no conversion. |
| **units** (`mm`, `cm`, `inch`) | Physical sizes: the base screen's logical size is irrelevant, its **dpi** is not (accuracy depends on the OS-reported dpi; the web defaults to 96 ppi unless calibrated). Use only for real-world sizes; never normalize them. |
| **Px tokens** (`sdpPx`, `16sdpPx`) | Device pixels = dp × density at runtime. Only for canvas/native interop. |
| **Fixed values** (hairlines, elevation, platform chrome, minimum touch targets) | Never normalized, never scaled. |
| **Inverters / facilitators / builders** (`sdpLw`, `sdpQualifier`, `scaledDp().screen(…)`) | Each branch value is a normal token: normalize it against the base screen of the frame it came from (phone value against the phone frame, tablet value against the tablet frame). |
| **Existing tablet overrides** (`values-sw600dp`, `if (isTablet)`) | They were written because plain dp did not grow; after migrating, the strategy grows too. Run `cli.mjs compare` per value: `delete-override` (the strategy already produces it, avoid double scaling) or `keep-as-adapt` with the printed base. |

## 5. Identify the profile (per source)

| Source | Where the profile is | Watch out |
|---|---|---|
| **Figma** | Frame size + name + preset (`Android Compact` 412×917, `iPhone 16` 393×852, `Desktop` 1440×1024), prototype device setting | Frames drawn in **physical px** (1080×2400, 1170×2532): ask the density. A frame that is a component (not a screen) is not the base. Status bar inside the frame → check the height for `hdp`. |
| **Claude Design** | The device frame / viewport the screens were made in: phone mock wrapper size, root `max-width`, `<meta name="viewport">`, the canvas preset, the size in the brief | CSS px = dp/pt at 1×. Responsive web screens: the mobile layout is the base, larger layouts are `adapt`. |
| **Screenshot / image** | image px ÷ export scale (@2x/@3x, 2.625…) | Ask when the scale is unknown. |
| **Existing Android** | `@Preview(device = Devices.PHONE)` (411×891), `"id:medium_phone"` (411×914), `"spec:width=…dp,height=…dp,dpi=…"`, `@Preview(widthDp, heightDp, fontScale)` | `values-sw600dp` folders are `adapt` overrides, not the base. Tuned on a physical device not in the catalog: `adb shell wm size` and `wm density` → width_px ÷ (density ÷ 160). |
| **Existing Apple** | `.previewDevice("iPhone 15")`, `.previewLayout(.fixed(width:height:))`, scheme simulator | Dynamic Type size used in previews (= font scale). |
| **Existing Flutter** | `flutter_screenutil` `designSize`, test `setSurfaceSize` / `physicalSize` + `devicePixelRatio` | A project migrating from another scaling library already declares its base. |
| **Existing React Native** | `react-native-size-matters` `guidelineBaseWidth` (350), `BASE_WIDTH` constants, Storybook viewport | Same. |
| **Existing web** | design width in tokens/comments, Playwright `viewport`, mobile-first breakpoint | Desktop-only products: the desktop window is the base. |
| **New screens from a brief** | `appdimens.config.json`, else the platform default below | Say which one you used. |

`node <package>/tools/appdimens-kit/cli.mjs detect <app folder>` reports the platform targets **and** the base-screen evidence: Figma JSON frames, Claude Design device frames, "designed at W×H" comments, fixed `meta viewport`, preview devices, `designSize`, test viewports. Run it on the app/design folder, not on a parent folder full of unrelated files.

**A design frame always wins over a platform default**: a web target implemented from a 412-wide Android frame uses 412, not the web default 390.

Platform defaults when nothing tells you (always confirm):

| Platform | Default base screen |
|---|---|
| Android | Medium Phone 411 × 914 dp, 420 dpi, portrait, font scale 1 |
| Apple | iPhone 15/16 393 × 852 pt, @3x, portrait, default Dynamic Type |
| Flutter / RN / KMP shared UI | the design's frame; else Android or iOS default of the primary market |
| Web | 390 × 844 mobile (desktop-only: 1440 × 1024) |
| .NET desktop | the design window; else 1280 × 800 at 100 % scaling |
| Games | the design canvas (often 1920 × 1080 landscape) |

## 6. When to ask (same rule as the core skill, Step 3)

1. The config has `baseScreen` → use it, never ask.
2. One unambiguous source (single frame/preset, ≥ 80 % of previews, `designSize`, or the platform default in create mode) → use it and write `Base screen: … (assumed, unconfirmed)` in the intent sheet; offer to record it.
3. Otherwise ask before converting (conflicting sizes, px frame without density, batch migration without evidence, a base that contradicts existing theme tokens, height-driven values with unclear system bars). One message, at most 5 questions.

Example of the one-line statement (case 2) or question (case 3):

> Base screen: **Medium Phone 411 × 914 dp, 420 dpi, portrait, font scale 1** (from `@Preview(device = "id:medium_phone")` in 14 of 16 screens). `scaled` → ×1.37 for `sdp`, ×3.05 for `hdp` (`auto`: ×1.37 / ×1.96), so `16.dp` → `11.5.sdp`.

Mixed evidence (14 screens previewed on 411, 2 on 360): the app still gets **one** base; report the shift for the other screens (360-previewed screens will look ≈ 12 % larger on their own preview device). Shared UI with Android and iOS frames: one canonical frame, the other only checked.

Recording: `appdimens.config.json → design.baseScreen` (or `targets[].baseScreen` for targets with separate UI code), including `runtimeHeight` when it differs from the frame.

## 7. Normalization rule (`design.normalization`)

| Value | Meaning | Use when |
|---|---|---|
| `match-base` (**default**) | `base = (value ÷ density) ÷ factor(strategy, base screen)`. Theme tokens exact (`--theme`, 0.01, named by the design value); one-off values rounded to `design.rounding` (0.5); **Android XML / SDPS .NET: integers, XML via `--xml` (bucket factor)** | The build must look like the design / like today **on the base screen**, and grow from there. |
| `design-at-300` | Values are already relative to the 300 reference | Design systems defined for AppDimens (frames 300 wide). |
| `as-is` | Same number (`16.dp` → `16.sdp`) | The team knowingly accepts everything ~20–47 % larger on phones. Say the % out loud. |

`as-is` effect on the same screen (scaled): 360 → +20 %, 393 → +31 %, 411 → +37 %, 440 → +47 %.

## 8. Check on the base screen first

After implementing, check at the base screen: values must match the source within the rounding. The minimum evidence is the CLI's "resolves to on base screen" column; previews/screenshots on the base screen are better (Compose `@Preview(device = …)`, SwiftUI pinned configuration, Flutter widget tests with `AppDimensScope.withMetrics`, Playwright for web). If you could not render, say "not visually verified". Then 300 (reference), then the large form factors in `formFactors`. The intent sheet header always shows the profile:

```
Target: android-compose · appdimens-dynamic 3.2.0 · strategy auto
Base screen: Medium Phone 411×914 dp · 420 dpi · portrait · font 1.0 (confirmed) · match-base
Factors (from cli normalize): asdp ×1.370 · ahdp ×1.958 (hdp tokens only for screen-height intent)
```

Multi-frame designs (phone + tablet): the phone frame is the base; the tablet frame tells you the intent (values grew → `scaled`/`adaptive`; values stayed → `bounded`/`fixed`). Compare `tablet ÷ phone` with each strategy's factor ratio (`normalize` on both frames) and turn real differences into `adapt` rules.
