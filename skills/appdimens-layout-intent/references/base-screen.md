# Base screen profile — the denominator of every conversion

Every number in a design or in existing code was chosen **while looking at one screen**: the Figma frame, the Claude Design canvas, the Compose `@Preview`, the developer's emulator. AppDimens then multiplies each value by a factor computed from the **screen it runs on**. To keep a value looking right, you must know the screen it was chosen on — not just the device name, but every property the chosen strategy reads.

## 1. The library's base rule (never forget it)

- Reference canvas **300 × 533** (aspect 1.78). On it every token equals its number: `16.sdp == 16`.
- Scaled tokens: `value × axis ÷ 300`. `sdp/ssp` read the **smallest side**, `wdp/wsp` the **width**, `hdp/hsp` the **height**. All three divide by **300**: `hdp` is *not* divided by 533 (verified in `appdimens-dynamic` `DimenMetrics.screenHeightFactor`), so `1.hdp ≈ 3 dp` on a 914-tall phone.
- `sp` kinds (`ssp`, `assp`…) also multiply by the user's **font scale**; `em` kinds (`sem`) don't.
- Values follow the **window**, not the physical display: split screen, freeform/desktop windows, foldables and rotation change them (the `i` suffix pins the full-screen value).

## 2. The profile (what to identify)

| Property | Why it matters | Example |
|---|---|---|
| **Logical size** W × H (dp / pt / CSS px) | Every axis-based strategy reads it | Medium Phone 411 × 914 dp |
| **Resolution** (physical px) and **density** (dpi, @2x/@3x, devicePixelRatio) | Designs drawn in px must be divided by density first; the `density` strategy and `Px` tokens read it; `units` (mm/cm/in) depend on dpi | 1080 × 2400 px at 420 dpi (2.625) = 411 × 914 dp |
| **Orientation** | Which side is "smallest"; inverters (`sdpLw`, `hdpLw`…) swap axes by orientation | Landscape tablet 1280 × 800 → smallest 800 |
| **Aspect ratio** (longer ÷ shorter) | The `a` suffix (`sdpa`), `fill`, `fit`, `diagonal`, `perimeter` read it | 914 / 411 = 2.22 (tall phone) vs 1.78 reference |
| **Window vs screen** | Values follow the window; a design for a resizable desktop/web window has no fixed size | WPF window 1280 × 800 |
| **System bars / insets** | The height the platform reports may exclude status/navigation bars while the design frame includes them → matters for `hdp` | Frame 917 tall vs window ≈ 870 |
| **Font scale** | `ssp` multiplies by it; designs are normally at 1.0 | Designer previewed at 115 % → divide text by 1.15 |
| **UI mode / form factor** | Facilitators and builders branch on TV, car, watch, fold state | `sdpMode(…, TELEVISION)` |

`node <package>/tools/appdimens-kit/cli.mjs devices` lists common screens with logical size and density.

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
| diagonal (`dg`) | both sides | `√(w² + h²) / 611.63` | rotation-invariant |
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

## 5. Identify the profile (per source)

| Source | Where the profile is | Watch out |
|---|---|---|
| **Figma** | Frame size + name + preset (`Android Compact` 412×917, `iPhone 16` 393×852, `Desktop` 1440×1024), prototype device setting | Frames drawn in **physical px** (1080×2400, 1170×2532): ask the density. A frame that is a component (not a screen) is not the base. Status bar inside the frame → check the height for `hdp`. |
| **Claude Design** | The device frame / viewport the screens were made in: phone mock wrapper size, root `max-width`, `<meta name="viewport">`, the canvas preset, the size in the brief | CSS px = dp/pt at 1×. Responsive web screens: the mobile layout is the base, larger layouts are `adapt`. |
| **Screenshot / image** | image px ÷ export scale (@2x/@3x, 2.625…) | Ask when the scale is unknown. |
| **Existing Android** | `@Preview(device = Devices.PHONE)` (411×891), `"id:medium_phone"` (411×914), `"spec:width=…dp,height=…dp,dpi=…"`, `@Preview(widthDp, heightDp, fontScale)` | `values-sw600dp` folders are `adapt` overrides, not the base. |
| **Existing Apple** | `.previewDevice("iPhone 15")`, `.previewLayout(.fixed(width:height:))`, scheme simulator | Dynamic Type size used in previews (= font scale). |
| **Existing Flutter** | `flutter_screenutil` `designSize`, test `setSurfaceSize` / `physicalSize` + `devicePixelRatio` | A project migrating from another scaling library already declares its base. |
| **Existing React Native** | `react-native-size-matters` `guidelineBaseWidth` (350), `BASE_WIDTH` constants, Storybook viewport | Same. |
| **Existing web** | design width in tokens/comments, Playwright `viewport`, mobile-first breakpoint | Desktop-only products: the desktop window is the base. |
| **New screens from a brief** | `appdimens.config.json`, else the platform default below | Say which one you used. |

`node <package>/tools/appdimens-kit/cli.mjs detect .` reports the platform targets **and** the base-screen evidence found in code (preview devices, design sizes, test viewports).

Platform defaults when nothing tells you (always confirm):

| Platform | Default base screen |
|---|---|
| Android | Medium Phone 411 × 914 dp, 420 dpi, portrait, font scale 1 |
| Apple | iPhone 15/16 393 × 852 pt, @3x, portrait, default Dynamic Type |
| Flutter / RN / KMP shared UI | the design's frame; else Android or iOS default of the primary market |
| Web | 390 × 844 mobile (desktop-only: 1440 × 1024) |
| .NET desktop | the design window; else 1280 × 800 at 100 % scaling |
| Games | the design canvas (often 1920 × 1080 landscape) |

## 6. Validate before converting

State the profile in one line and get a yes when it was not explicit in the config:

> Base screen: **Medium Phone 411 × 914 dp, 420 dpi, portrait, font scale 1** (from `@Preview(device = "id:medium_phone")` in 14 of 16 screens). With `scaled` that is ×1.37 for `sdp` and ×3.05 for `hdp`, so `16.dp` → `11.5.sdp`. OK?

Record it in `appdimens.config.json → design.baseScreen` (and per target in `targets[].baseScreen` when Android and iOS designs use different frames) so it is never asked again.

## 7. Normalization rule (`design.normalization`)

| Value | Meaning | Use when |
|---|---|---|
| `match-base` (**default**) | `base = (value ÷ density) ÷ factor(strategy, base screen)`, rounded to `design.rounding` (0.5; **1 for Android XML**) | The build must look like the design / like today **on the base screen**, and grow from there. |
| `design-at-300` | Values are already relative to the 300 reference | Design systems defined for AppDimens (frames 300 wide). |
| `as-is` | Same number (`16.dp` → `16.sdp`) | The team knowingly accepts everything ~20–47 % larger on phones. Say the % out loud. |

`as-is` effect on the same screen (scaled): 360 → +20 %, 393 → +31 %, 411 → +37 %, 440 → +47 %.

## 8. Check on the base screen first

After implementing, check at the base screen: values must match the source within the rounding. Then 300 (reference), then the large form factors in `formFactors`. The intent sheet header always shows the profile:

```
Target: android-compose · appdimens-dynamic 3.2.0 · strategy auto
Base screen: Medium Phone 411×914 dp · 420 dpi · portrait · font 1.0 (confirmed) · match-base
Factors: asdp ×1.37 · ahdp ×3.05 (hdp tokens only for screen-height intent)
```

Multi-frame designs (phone + tablet): the phone frame is the base; the tablet frame tells you the intent (values grew → `scaled`/`adaptive`; values stayed → `bounded`/`fixed`). Compare `tablet ÷ phone` with each strategy's factor ratio (`normalize` on both frames) and turn real differences into `adapt` rules.
