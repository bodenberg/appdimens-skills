---
name: appdimens-android-xml
description: Implement layout intent in Android XML layouts with appdimens-sdps (@dimen/_16sdp, _48hdp, _100wdp) and appdimens-ssps (@dimen/_14ssp, _14hsp, _14wsp). Use when editing res/layout/*.xml, styles/themes or dimens.xml in an AppDimens project, migrating dp/sp literals in XML, or mixing XML Views with Compose. Scaled strategy only — for auto/fluid/percent in Android code use appdimens-android.
---

# Android XML — `appdimens-sdps` + `appdimens-ssps` 3.2.0

Decide intent first with `appdimens-layout-intent`. Pre-generated `@dimen` resources; nothing is computed at runtime; no setup.

## Install

```kotlin
dependencies {
    implementation("io.github.bodenberg:appdimens-sdps:3.2.0")   // _Nsdp, _Nhdp, _Nwdp  (N = -300…600 without 0 — use 0dp; negatives: _minus8sdp)
    implementation("io.github.bodenberg:appdimens-ssps:3.2.0")   // _Nssp, _Nhsp, _Nwsp  (N = 1…600)
}
```

Ship as AAB so Play strips unused resources. Both libraries also expose Compose (`com.appdimens.sdps.compose.sdp`, `com.appdimens.ssps.compose.ssp`) and code APIs (`com.appdimens.sdps.code.DimenSdp`), but in a Compose-first module prefer `appdimens-dynamic`.

## Policy support

| Policy | XML |
|---|---|
| scaled | `@dimen/_16sdp`, `@dimen/_16ssp` |
| width / height | `@dimen/_100wdp`, `@dimen/_48hdp`, `@dimen/_14wsp`, `@dimen/_14hsp` |
| fixed | plain `1dp` + `<!-- ad:fixed hairline -->` |
| adaptive / bounded / fraction / others | **not available in XML.** Use `appdimens-android` code APIs (`16.asdp(ctx)`, px) from the View/Fragment, or resource qualifiers (`values-sw600dp/dimens.xml`) pointing at different `_Nsdp` values for an `adapt` rule |

**Integers only, bucketed.** XML offers only the scaled strategy, resource names are integers, and Android resolves them through discrete folders (`values-swN` / `-hN` / `-wN`, mostly 15 dp steps plus common device widths): the factor is the **floor bucket ÷ 300** (a 914-tall base reads `values-h900dp`, ×3.00). Always convert with `--xml`, which rounds to integers and uses the bucket:

```bash
node <package>/tools/appdimens-kit/cli.mjs normalize --device medium-phone --xml 16 24      # → @dimen/_12sdp, _18sdp
node <package>/tools/appdimens-kit/cli.mjs normalize --device medium-phone --xml --axis h 220  # → @dimen/_73hdp (bucket h900)
```

Mixed Compose + XML apps: keep `dimens.xml` as the single source and read it from Compose with `dimensionResource(R.dimen.space_md)`, so both render identical values.

## Theme the values once

```xml
<!-- res/values/dimens.xml -->
<resources>
    <dimen name="space_md">@dimen/_16sdp</dimen>
    <dimen name="radius_md">@dimen/_12sdp</dimen>
    <dimen name="text_body">@dimen/_16ssp</dimen>
</resources>
<!-- res/values-sw600dp/dimens.xml: adapt rule "sw600 → space_md 24" -->
<resources>
    <dimen name="space_md">@dimen/_24sdp</dimen>
</resources>
```

## Intent → XML Views

| Intent | XML |
|---|---|
| `stack-v` / `stack-h` | `LinearLayout` with `android:orientation`, or `ConstraintLayout` chains; gaps via `android:layout_marginTop="@dimen/_8sdp"` or a divider drawable |
| `overlay` | `FrameLayout` / `ConstraintLayout` with constraints (not absolute offsets) |
| `list` / `grid` / `carousel` | `RecyclerView` + `LinearLayoutManager` / `GridLayoutManager(spanCount from adapt)` / `LinearLayoutManager(HORIZONTAL)` + `PagerSnapHelper`; item spacing via `ItemDecoration` using `resources.getDimensionPixelSize(R.dimen._8sdp)` |
| `card` | `MaterialCardView app:cardCornerRadius="@dimen/_12sdp" app:contentPadding="@dimen/_16sdp"` |
| `sizing: fill` | `match_parent`, or `0dp` + constraints / `layout_weight` |
| `sizing: hug` | `wrap_content` |
| `sizing: ratio` | `ConstraintLayout` + `app:layout_constraintDimensionRatio="4:3"` |
| `overflow: scroll-v` | `NestedScrollView` (single child) or `RecyclerView` |
| `truncate` | `android:maxLines="2" android:ellipsize="end"` |
| `fit-text` | `app:autoSizeTextType="uniform"` with `autoSizeMinTextSize="@dimen/_12ssp"` / `autoSizeMaxTextSize="@dimen/_28ssp"` |
| `divider` | `android:layout_height="1dp"` `<!-- ad:fixed hairline -->` |
| touch target | visual size from a token (`@dimen/_35sdp`) + hit area via `android:minHeight="48dp"` on the clickable parent or `TouchDelegate`; Material buttons already enforce 48dp |

## Custom strategies

Full decision flow, cross-platform syntax table, rules and kit checks: `appdimens-custom-strategies`.

XML resources are pre-computed for the **scaled** strategy only: `@dimen/_16sdp` cannot follow a project-defined strategy (`custom:<id>`). Keep XML on scaled. Screens that need the custom strategy set values from code with `appdimens-dynamic-custom` (`16.cdp(context, Brand)` → px), or move to Compose.

## Lint (what `appdimens-kit lint` flags here)

- `android:padding*|layout_margin*|layout_width|layout_height|textSize|…="16dp"` / `"14sp"` literals above 2 → `@dimen/_16sdp` / `@dimen/_14ssp`. `0dp`, `match_parent`, `wrap_content` are fine.
- Out-of-range resources (`_700sdp`, `_0ssp`) and decimal names (`_13.5sdp`), which don't exist.

## Verify

`./gradlew :app:assembleDebug` and the layout preview at `sw300`, the design width and `sw600`.
