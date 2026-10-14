---
name: appdimens-layout-intent
description: Use before writing, converting, reviewing or editing any UI sizing in a project that uses (or should use) AppDimens on any platform — Android Compose/Views/XML, Kotlin Multiplatform, iOS/macOS SwiftUI/UIKit, Flutter, React Native, Web (webdimens), .NET MAUI/WPF/WinForms/WinUI or Android games. Trigger on sdp/ssp/asdp/assp/hdp/wdp/sem, "@dimen/_16sdp", "{sdp:16}", "16sdp", responsive layout, tablets/foldables/TV/desktop sizing, or converting a Figma / Claude Design / screenshot into UI. It turns every element into an explicit layout intent (role, sizing, overflow, scale policy, adaptation) and only then picks platform, library, unit and strategy.
---

# AppDimens — layout intent first

AppDimens gives every platform the same vocabulary (`sdp`, `ssp`, `asdp`…), but the vocabulary only answers *how much* a value grows. This skill answers the question that comes first: **what is this element supposed to do when the screen changes?** Decide the intent, then the unit falls out of a table.

```
input (design, screenshot, spec or existing code)
  → 1. platform + library        (references/platform-router.md)
  → 2. project contract          (appdimens.config.json)
  → 3. intent per element        (references/intent-model.md)
  → 4. scale policy → token      (references/decision-table.md)
  → 5. platform skill writes code (appdimens-<platform>)
  → 6. validate                  (appdimens-kit lint)
```

Paths below: `<package>` is the root of this kit (two folders above this file: the Claude Code plugin root, or `.appdimens/` when installed with `scripts/install.mjs`).

## Step 1 — platform and library

Detect it from the repository (build files), never from the design: run `node <package>/tools/appdimens-kit/cli.mjs detect .` and use [references/platform-router.md](references/platform-router.md). One project may have several targets (e.g. Android Compose + Web). If nothing is detectable and the user did not say, ask — this is the one question you may never guess.

## Step 2 — the project contract (`appdimens.config.json`)

Look for `appdimens.config.json` at the repo root (schema: `schemas/appdimens.config.schema.json` in this package). It holds the decisions that are made **once per project**, so you never re-ask them:

| Field | Why it matters |
|---|---|
| `targets[]` | platform, library, version, source paths |
| `formFactors` | `phone` only → `scaled`; anything bigger in the list → `auto` by default |
| `strategy.layout` / `strategy.text` | project-wide default policy (overrides the table defaults) |
| `design.frameWidth` + `design.normalization` | how a design value becomes a base value (Step 4) |
| `breakpoints` | the only breakpoints you may use; never invent others |

If the file is missing and the task is more than a one-line fix, propose one (fill what you detected, ask only for what you could not) and write it after the user confirms.

## Step 3 — intent per element

For every node you are about to implement, decide the intent along five axes — `role`, `sizing`, `overflow`, `scale`, `adapt` — following [references/intent-model.md](references/intent-model.md). Use, in priority order:

1. **Explicit annotations** — layer names such as `Products [grid] [fill]`, a design-spec table, code comments `// ad:fixed hairline`.
2. **Structure** — Auto Layout direction/wrap/fill/hug, repeated siblings, scroll containers, existing native components in code.
3. **Heuristics** — scored, each with evidence (see the model).

Confidence rules: **≥ 0.8** apply and record the evidence; **0.5–0.8** apply and list it under "needs review"; **< 0.5** ask, batching all low-confidence questions into one message.

## Step 4 — scale policy → token

Look up each property in [references/decision-table.md](references/decision-table.md). For normalization numbers run `node <this-package>/tools/appdimens-kit/cli.mjs normalize --frame <w> --policy <scaled|auto|fluid> <values…>` instead of doing the math. Key rules that are easy to get wrong:

- **Hairlines, borders, dividers, elevation, focus rings → fixed** (`1.dp`, `1pt`, `1px`). Never `1.sdp`.
- **Text → the `sp` kind** of the layout strategy (`ssp`, `assp`, `fssp`), which respects the user's font scale. `sem` only when text must ignore it (a fixed badge) — say why.
- **Touch targets never drop below the platform minimum** (48 dp Android, 44 pt Apple, 24 CSS px web) — clamp with a fixed minimum.
- **Fill / hug / weight are layout primitives, not numbers.** A container that fills its parent gets `fillMaxWidth` / `.frame(maxWidth: .infinity)` / `Expanded` / `flex: 1`, never `300.wdp`.
- **Images keep their ratio:** width fills, height comes from `aspectRatio`. Not `hdp`.
- **Platform chrome stays native** (status/nav bars, default app bars, system controls with their own metrics).
- **Design value ≠ base value.** A design drawn on a frame wider than 300 must be normalized per `design.normalization` (see the table, section "From design value to base value").

## Step 5 — implement through the platform skill

Load the matching skill — `appdimens-android`, `appdimens-android-xml`, `appdimens-kmp`, `appdimens-apple`, `appdimens-flutter`, `appdimens-react-native`, `appdimens-web`, `appdimens-dotnet`, `appdimens-games`. It maps intent to native layout primitives and gives exact install lines, setup, imports and token syntax. If the project also has the library's own upstream skill (shipped in each AppDimens repo under `skills/`), it is the authority on API details; this package is the authority on intent.

## Step 6 — validate

Run `node <this-package>/tools/appdimens-kit/cli.mjs lint <changed files>` (the Claude Code plugin runs it automatically after each edit). Fix errors. A warning on a value whose fixed intent is real is silenced with an inline marker that states the reason: `// ad:fixed hairline`, `<!-- ad:fixed -->`, `/* ad:fixed */`, `# ad:fixed`.

## Output contract

Before code for a screen or component, print an **intent sheet** — it is the reviewable contract:

```
Target: android-compose · appdimens-dynamic 3.2.0 · strategy auto (formFactors: phone, tablet)
Design: frame 360 → normalization reference-300 (×0.833, rounded to 0.5)

| Node             | Role    | Sizing W/H   | Overflow | Scale                | Tokens                         | Conf |
|------------------|---------|--------------|----------|----------------------|--------------------------------|------|
| Home             | screen  | fill / fill  | scroll-v | —                    | —                              | 0.95 |
| Home/Products    | grid    | fill / hug   | none     | spacing adaptive     | gap 12.asdp; cols 2 → 3 @sw600 | 0.82 |
| ProductCard      | card    | fill / hug   | none     | spacing adaptive     | pad 12.asdp, radius 8.asdp     | 0.90 |
| ProductCard/Img  | media   | fill / ratio | clip     | —                    | aspectRatio 4:3                | 0.90 |
| ProductCard/Line | divider | fill / fixed | none     | fixed                | 1.dp  (ad:fixed hairline)      | 1.00 |
Needs review: Products grid (inferred from 4 repeated siblings + wrap).
```

Then the code, then the lint result. Never state that output "matches the design" on sizes you did not normalize or verify.

## Never

- Treat design values as final tokens without checking the frame width and normalization.
- Use absolute positioning unless the intent is `overlay` (badge, FAB, floating label) — and say so.
- Invent breakpoints, strategies, tokens or suffixes. The real strategy prefixes are: `''` scaled, `a` auto, `p` percent, `pw` power, `f` fluid, `i` interpolated, `log` logarithmic, `dg` diagonal, `pr` perimeter, `ft` fit, `fl` fill, `d` density (+ resize and units APIs).
- Generate obsolete names: `balanced(…)`, `.balanced().dp`, `defaultScaling`, `.fxdp`, `.dydp`, `fx`, `dy`, `AppDimens.fixed(…)`, `densdp`, `fillsdp`, `fitsdp`. Map BALANCED → auto, DEFAULT/FIXED → scaled, PERCENTAGE/DYNAMIC → percent.
- Recommend the `i` / `ia` (ignore multi-window) suffixes unless the user asks about split-screen behaviour (exception: game HUDs, see `appdimens-games`).
- Mix several strategies inside one component without a stated reason.
