---
name: appdimens-code-edit
description: Use when applying AppDimens to existing screens or editing/refactoring/reviewing UI in an AppDimens project — converting dp/sp/pt/px/@dimen literals to AppDimens tokens, migrating from another scaling library (flutter_screenutil, react-native-size-matters…), upgrading old AppDimens APIs (balanced, fxdp, dydp), changing strategy (sdp → asdp), adding tablet/foldable support or fixing "looks wrong on tablet/TV". Finds the base screen the existing screens were built and previewed on, recovers each element's intent from the code, and converts values so they keep their look on that screen.
---

# Applying AppDimens to existing screens (edit mode)

Existing screens were tuned **on some screen**: the developer's emulator, the `@Preview` device, the design frame they were built from. Converting `16.dp` to `16.sdp` changes the look on that very screen by 20–47 %. So: find the base, recover intent, then convert. Model and tables: `appdimens-layout-intent`.

## 1. Find the base screen of the existing screens

```bash
node <package>/tools/appdimens-kit/cli.mjs detect .
```

It reports preview devices (`@Preview(device = …)`, `widthDp`, `.previewDevice("iPhone 15")`), declared design sizes (`flutter_screenutil` `designSize`, `guidelineBaseWidth`, `BASE_WIDTH`) and test viewports. Then:

- One dominant size → propose it. Several → ask which screens use which, or confirm the dominant one.
- Migrating **from another scaling library**: its declared base is the base (e.g. `designSize: Size(375, 812)`), and its calls (`16.w`, `scale(16)`) are already relative to it: convert them from that base, not from the raw number.
- Nothing found → ask: "Which device were these screens built and checked on?" (offer the platform default from `references/base-screen.md`).
- Confirm the full profile (size, density, orientation, font scale) and record it in `design.baseScreen`.

## 2. Recover intent from the code

| In the code | Intent it already states |
|---|---|
| `LazyColumn`, `List`, `ListView.builder`, `FlatList`, `RecyclerView` | `list` (keep it lazy) |
| `LazyVerticalGrid`, `LazyVGrid`, `GridView`, `numColumns`, CSS grid | `grid` |
| `fillMaxWidth`, `weight`, `.frame(maxWidth: .infinity)`, `Expanded`, `flex: 1`, `match_parent`/`0dp` | `fill` — no number |
| `wrapContentHeight`, `wrap_content`, intrinsic size | `hug` |
| `aspectRatio(…)` | `ratio` — keep |
| `1.dp`, `0.5.dp`, `Dp.Hairline`, `StyleSheet.hairlineWidth`, `1px` border | fixed hairline — **do not convert** |
| elevation / shadows | fixed |
| `sizeIn(min = 48.dp)`, `minHeight: 44`, `minimumInteractiveComponentSize()` | fixed minimum — keep; scale the visual size separately |
| Material/Cupertino/Fluent component defaults | `platform` — don't override |
| `values-sw600dp/dimens.xml`, `if (isTablet)`, size-class branches | existing `adapt` rules → facilitators / builders / qualifiers, normalized against the tablet base |
| literal spacing/radius/icon/control sizes | designed sizes → layout strategy |
| literal font sizes | text → `sp` kind |
| `autoSizeText`, `AutoSizeText`, `adjustsFontSizeToFitWidth` | `fit-text` → AppDimens **resize** |
| mm/inch conversions | **units** |
| existing AppDimens tokens / `// ad:fixed …` | decisions already made — preserve unless the task is to change them |

When code and design disagree, ask.

## 3. Plan the conversion, show it, then edit

Compute base values with the CLI against the confirmed base screen and strategy, per axis:

```bash
node <package>/tools/appdimens-kit/cli.mjs normalize --device medium-phone --strategy auto 4 8 12 16 24 48
node <package>/tools/appdimens-kit/cli.mjs normalize --device medium-phone --strategy auto --text 12 14 16 20
node <package>/tools/appdimens-kit/cli.mjs normalize --device medium-phone --axis h 220   # only for height-driven values
```

Print the migration table before editing:

```
Base screen: Medium Phone 411×914 dp · auto · match-base (asdp ×1.37)
| File:line          | Before           | Intent        | After                 | On base screen |
|--------------------|------------------|---------------|-----------------------|----------------|
| HomeScreen.kt:42   | padding(16.dp)   | spacing       | padding(11.5.asdp)    | 15.8 dp        |
| HomeScreen.kt:57   | height(1.dp)     | divider fixed | unchanged (ad:fixed)  | 1 dp           |
| ProductCard.kt:20  | fontSize = 14.sp | body text     | fontSize = 10.assp    | 13.7 sp        |
| ProductCard.kt:31  | size(48.dp)      | touch min     | unchanged + note      | 48 dp          |
```

Scope: list the files/screens first; full migrations go screen by screen with a check after each.

## 4. Rules

1. **Default `match-base`**: values keep their look on the base screen. `as-is` (same number) only when the team asks for it, stating the growth (+37 % on a 411 phone).
2. Hairlines, elevation, minimum touch targets and platform chrome stay as they are.
3. **Theme first**: if spacing/typography live in a theme (`Dimens.kt`, `Spacing.swift`, `theme.ts`, `dimens.xml`), convert there.
4. **Install what you use**: a new strategy needs its module/package/import (platform skill).
5. **One strategy per screen**; when moving to `auto` for tablets, move layout and text together.
6. **Obsolete APIs**: BALANCED/`balanced` → auto, DEFAULT/FIXED/`fxdp` → scaled, PERCENTAGE/DYNAMIC/`dydp` → percent.
7. **Don't widen the change**: report layouts that should be restructured (absolute positions that are really lists) as follow-ups.

## 5. Validate

- `cli.mjs lint` with zero errors.
- Build + previews/screenshots on the **base screen first**: before vs after must match within rounding. Then 300 and 600+ when tablets are in `formFactors`.
- Report what changed, what stayed fixed (and why), and what you could not verify.
