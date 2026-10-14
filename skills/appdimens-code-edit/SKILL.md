---
name: appdimens-code-edit
description: Use when editing, refactoring, reviewing or migrating existing UI code in a project that uses or adopts AppDimens — converting dp/sp/pt/px/@dimen literals to AppDimens tokens, upgrading old AppDimens APIs (balanced, fxdp, dydp, defaultScaling), changing a strategy (sdp → asdp), adding tablet/foldable support, or fixing "looks wrong on tablet/TV" bugs. Recovers each element's intent from the code first and preserves it, so fixed values stay fixed and scaled values stay scaled.
---

# Editing existing code without breaking intent (edit mode)

Code already encodes intent, just implicitly. Read it out first, change it second. Model and tables: `appdimens-layout-intent`.

## 1. Recover intent from code

| In the code | Intent it already states |
|---|---|
| `LazyColumn`, `List`, `ListView.builder`, `FlatList`, `RecyclerView` | `list` (keep it lazy) |
| `LazyVerticalGrid`, `LazyVGrid`, `GridView`, `numColumns`, CSS grid | `grid` |
| `fillMaxWidth`, `weight`, `.frame(maxWidth: .infinity)`, `Expanded`, `flex: 1`, `match_parent`/`0dp` + constraints | `sizing: fill` — no number needed |
| `wrapContentHeight`, `wrap_content`, intrinsic size | `sizing: hug` |
| `aspectRatio(…)` | `ratio` — keep it |
| `1.dp`, `0.5.dp`, `Dp.Hairline`, `StyleSheet.hairlineWidth`, `1px` border | `fixed` hairline — **do not convert** |
| `elevation`, shadow values | `fixed` |
| `sizeIn(min = 48.dp)`, `minHeight: 44`, `minimumInteractiveComponentSize()` | fixed **minimum** — keep it; scale the visual size separately |
| Material/Cupertino/Fluent component default sizes (TopAppBar, NavigationBar, TabView) | `platform` — don't override |
| Literal spacing/radius/icon/control sizes (`16.dp`, `padding(16)`, `EdgeInsets.all(16)`, `padding: 16`, `16px`, `@dimen/spacing_16`) | designed sizes → candidates for the layout policy |
| Literal font sizes (`16.sp`, `.system(size: 16)`, `fontSize: 16`) | text → candidates for the text policy |
| Existing AppDimens tokens | the policy already chosen — preserve unless the task is to change it |
| `// ad:fixed …` markers | an explicit fixed decision — never touch |

When code and design disagree, ask; don't silently pick one.

## 2. Plan the change, then show it

For anything beyond a few lines, print a migration table before editing:

```
| File:line                 | Before            | Intent        | After                 |
|---------------------------|-------------------|---------------|-----------------------|
| HomeScreen.kt:42          | padding(16.dp)    | spacing       | padding(16.asdp)      |
| HomeScreen.kt:57          | height(1.dp)      | divider fixed | unchanged (ad:fixed)  |
| ProductCard.kt:20         | fontSize = 14.sp  | body text     | fontSize = 14.assp    |
| ProductCard.kt:31         | size(48.dp)       | touch min     | unchanged + note      |
```

Scope: list the files/screens first. A full-app migration goes screen by screen, with a check after each.

## 3. Migration rules

1. **Same number, new unit, as the default migration.** `16.dp` → `16.sdp` keeps the base value. On a 300-wide device nothing changes. On larger ones the value grows, which is the point. If the team wants today's look on today's reference device, that is a `match-frame` normalization: compute it with `tools/appdimens-kit/cli.mjs normalize` and make it an explicit decision.
2. **Hairlines, elevation, minimum touch targets and platform chrome stay as they are.**
3. **Tokens live in one place.** If the project has a spacing/typography theme (`Dimens.kt`, `Spacing.swift`, `theme.ts`, `dimens.xml`), migrate the theme, not the call sites.
4. **Install what you use.** A new strategy needs its module/package/import (`appdimens-dynamic-auto`, `appdimens_auto`, `appdimens-react-native/auto`…). See the platform skill.
5. **One strategy per screen.** When moving to `auto` for tablet support, move the whole screen (layout and text together).
6. **Upgrade obsolete APIs** with the hub mapping: `balanced`/BALANCED → auto (`asdp`), DEFAULT/FIXED/`fxdp` → scaled (`sdp`), PERCENTAGE/DYNAMIC/`dydp` → percent (`psdp`). Flutter 2.x `fx/dy` → see `appdimens-flutter`'s MIGRATION link.
7. **Don't widen the change.** Converting units is not the moment to restructure layouts. If you find an absolute-positioned layout that should be a list, report it as a follow-up.

## 4. Validate

- `node <package>/tools/appdimens-kit/cli.mjs lint <changed files>`, with zero errors.
- Build, plus the project's tests/previews. Check at 300, the main phone width and 600+ when tablets are in `formFactors`.
- Report what changed, what was deliberately left fixed (with reasons), and what you could not verify.
