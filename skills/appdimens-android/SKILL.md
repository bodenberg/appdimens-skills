---
name: appdimens-android
description: Implement layout intent on Android with appdimens-dynamic — Jetpack Compose (16.sdp, 16.ssp, 16.asdp) and Kotlin/Java Views code (DimenSdp.sdp(context, 16) → px). Use when writing or editing Android Compose/Views UI in an AppDimens project, adding the appdimens-dynamic dependency or a strategy module (auto, fluid, percent…), or mapping a design's lists/grids/carousels/cards to Compose. For XML @dimen layouts use appdimens-android-xml; for KMP use appdimens-kmp.
---

# Android (Compose / Views) — `appdimens-dynamic` 3.2.0

Decide intent first with `appdimens-layout-intent`. This skill maps it to Android code. Upstream skill (API authority): `bodenberg/appdimens-dynamic/skills/SKILL.md`.

## Install

```kotlin
dependencies {
    implementation(platform("io.github.bodenberg:appdimens-dynamic-bom:3.2.0"))
    implementation("io.github.bodenberg:appdimens-dynamic")          // scaled: sdp hdp wdp ssp sem + core
    implementation("io.github.bodenberg:appdimens-dynamic-auto")     // only if you use asdp / assp
    // other satellites on demand: -percent -power -fluid -interpolated -logarithmic
    // -diagonal -perimeter -fit -fill -density -resize -units
}
```

The library declares Compose as `compileOnly`: the app's own Compose BOM is the runtime. Add a satellite **in the same change** that first uses one of its tokens.

## Setup

- Plain tokens need no setup.
- Wrap the root in `AppDimensProvider { … }` only for facilitators that read UI mode or fold state (`sdpMode`, `sdpScreen`, `sspScreen`).

## Imports and tokens

| Policy | Compose import | Compose token | Views/code (returns **px**) |
|---|---|---|---|
| scaled | `com.appdimens.dynamic.compose.*` | `16.sdp` `48.hdp` `100.wdp` `16.ssp` `16.sem` | `DimenSdp.sdp(ctx, 16)`, `DimenSsp.ssp(ctx, 16)` (`com.appdimens.dynamic.code.*`) |
| adaptive | `com.appdimens.dynamic.compose.auto.asdp` / `.assp` | `16.asdp` `16.assp` | `16.asdp(ctx)` (`com.appdimens.dynamic.code.auto.*`) |
| bounded | `com.appdimens.dynamic.compose.fluid.*` | `16.fsdp` `16.fssp` | `16.fssp(ctx)` |
| fraction | `com.appdimens.dynamic.compose.percent.*` | `50.spaceW` `40.spaceH` `psdp` | `50.spaceW(ctx)` |
| fit / fill / damped | `compose.fit` / `compose.fill` / `compose.logarithmic` / `compose.power` | `ftsdp` `flsdp` `logsdp` `pwsdp` | same names with `(ctx)` |
| physical | `com.appdimens.dynamic.compose.mm` / `.cm` / `.inch` (module `-units`) | `10f.mm.dp` (`.mm` returns a dp-equivalent `Float`; add `.dp`) | `DimenPhysicalUnits` |
| fit-text | `com.appdimens.dynamic.compose.resize.autoResizeTextSp` | inside `BoxWithConstraints` | `code.resize.DimenResize` |

Strategies do not cross-import. Never mix `compose.auto` and `compose.fluid` tokens in one component without a reason.

## Intent → Compose

| Intent | Compose |
|---|---|
| `screen` + `scroll-v` (static content) | `Scaffold { Column(Modifier.verticalScroll(rememberScrollState())) }` |
| `stack-v` / `stack-h` with gap | `Column(verticalArrangement = Arrangement.spacedBy(12.sdp))` / `Row(horizontalArrangement = Arrangement.spacedBy(8.sdp))` |
| `overlay` | `Box { …; Badge(Modifier.align(Alignment.TopEnd)) }` |
| `list` | `LazyColumn(contentPadding = PaddingValues(16.sdp), verticalArrangement = Arrangement.spacedBy(8.sdp))` |
| `grid` | `LazyVerticalGrid(GridCells.Adaptive(minSize = 160.sdp))` (or `GridCells.Fixed(n)` from `adapt`) |
| `carousel` | `LazyRow(contentPadding = PaddingValues(horizontal = 16.sdp))` or `HorizontalPager` for paged |
| `card` | Material 3 `Card(shape = RoundedCornerShape(12.sdp))` + inner `Modifier.padding(16.sdp)` |
| `button` / `input` / `nav` | Material 3 components; scale content (padding, text), keep component defaults for chrome |
| `sizing: fill` / `hug` | `Modifier.fillMaxWidth()` / `weight(1f)` · default wrap |
| `sizing: ratio` | `Modifier.fillMaxWidth().aspectRatio(4f / 3f)` |
| `sizing: clamp` | `Modifier.widthIn(min = 280.dp, max = 600.dp)` `// ad:fixed clamp` |
| `overflow: truncate` | `Text(maxLines = 2, overflow = TextOverflow.Ellipsis)` |
| `divider` | `HorizontalDivider(thickness = 1.dp)` `// ad:fixed hairline` |
| touch target | visual size as a token (`Modifier.size(35.asdp)` for 48 on a 411 base) + hit area `Modifier.minimumInteractiveComponentSize()` (Material components already do it) — never clamp the visual |
| `adapt` (value at breakpoint) | `16.sdpQualifier(24, DpQualifier.SMALL_WIDTH, 600)` or `16.scaledDp().screen(DpQualifier.SMALL_WIDTH, 600, 24).sdp` |
| `adapt` (structure at breakpoint) | `currentWindowAdaptiveInfo().windowSizeClass` or `LocalConfiguration.current.smallestScreenWidthDp >= 600` → different composable |

Theme first: put tokens in one object (`object Spacing { val md get() = 16.sdp }` is not allowed because `sdp` is `@Composable` — use `val Spacing.md: Dp @Composable get() = 16.sdp`, or pass base numbers and convert at call sites).

## Views / Kotlin / Java

Values are **px**: `view.setPadding(px, px, px, px)`, `textView.setTextSize(TypedValue.COMPLEX_UNIT_PX, DimenSsp.ssp(ctx, 16))`. Don't pass a px value to an API that expects dp. XML layouts belong to `appdimens-android-xml`.

## Custom strategies (`appdimens-dynamic-custom`, unreleased)

Only when `appdimens.config.json` declares `customStrategies` (or the user asks for their own strategy). Use the declared ids, never invent one; see the decision table → *Project-defined strategies*. Free-form formulas (`"type": "expression"`, `"formula"`) live in the JSON file.

```kotlin
implementation("io.github.bodenberg:appdimens-dynamic-custom")
import com.appdimens.dynamic.custom.*            // ScalingStrategies, scalingStrategy { }, CustomPresets
import com.appdimens.dynamic.compose.custom.*    // cdp / csp / ProvideScalingStrategy

ScalingStrategies.loadAsset(context, "appdimens-strategies.json")   // once (Application)
val Brand = ScalingStrategies.getOrThrow("brand")
Modifier.padding(16.cdp(Brand)); Text(fontSize = 14.csp(Brand))      // or ProvideScalingStrategy(Brand) { 16.cdp }
```

Views / Kotlin code: `16.cdp(context, Brand)` returns **px** (`code.custom`), and `14.cspUnits(context, Brand)` is for `setTextSize(COMPLEX_UNIT_SP, …)`.

## Lint (what `appdimens-kit lint` flags here)

- `N.dp` with N > 2 and `N.sp` literals in Compose files → use the policy token, or mark `// ad:fixed <reason>`.
- Strategy token without its import or Gradle module (`.asdp` without `compose.auto`).
- Obsolete names (`balanced`, `fxdp`, `dydp`, `defaultScaling`, `densdp`, `fillsdp`, `fitsdp`).

## Verify

`./gradlew :app:compileDebugKotlin` (or the module's build) and Compose previews on the **base screen first** (e.g. `@Preview(device = "id:medium_phone")` or `"spec:width=412dp,height=917dp"` for a Figma Android Compact frame), then `@Preview(widthDp = 300)` and `@Preview(device = Devices.TABLET)` when tablets are in scope. On the base screen the result must match the source within rounding.
