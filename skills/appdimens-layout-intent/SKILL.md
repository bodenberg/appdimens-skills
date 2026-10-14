---
name: appdimens-layout-intent
description: Use before writing, converting, reviewing or editing UI sizes in a project that depends on AppDimens (appdimens-*, webdimens, Bodenberg.AppDimens.*, AppDimens.Net), or when the user names AppDimens — Android Compose/Views/XML, KMP, iOS/macOS, Flutter, React Native, web, .NET or Android games. Trigger on sdp/ssp/asdp/assp/hdp/wdp/sem, "@dimen/_16sdp", "{sdp:16}", "16sdp", and on implementing Figma or Claude Design screens, applying AppDimens to existing screens, creating screens, or tablet/foldable/TV sizing in such a project. It fixes the base screen the values were chosen on, turns every element into an explicit layout intent, and only then picks library, strategy and token.
---

# AppDimens — base screen and layout intent first

AppDimens gives every platform the same vocabulary (`sdp`, `ssp`, `asdp`…), but a token only answers *how much a value grows from the 300-wide reference*. Two questions come first:

1. **On which screen was this value chosen?** (the base screen: size, resolution, density, orientation, aspect, font scale)
2. **What is this element supposed to do when the screen changes?** (the intent)

Answer both, then the token falls out of a table and a calculation.

```
source (Figma · Claude Design · existing screens · brief)
  → 1. platform + library          references/platform-router.md   ·  cli detect
  → 2. project contract            appdimens.config.json
  → 3. base screen profile          references/base-screen.md       ·  cli detect / devices  → CONFIRM
  → 4. intent per element           references/intent-model.md
  → 5. strategy + token per value   references/decision-table.md    ·  cli normalize
  → 6. platform skill writes code   appdimens-<platform>
  → 7. validate                     cli lint · check on the base screen, 300, large screens
```

Paths: `<package>` is the root of this kit — the plugin root when installed as a Claude Code plugin, otherwise `.appdimens/` at the repository root.

## Which workflow skill

| The user wants to… | Skill |
|---|---|
| Implement screens from **Figma**, a screenshot or a spec | `appdimens-design-to-code` |
| Implement or create the project from **Claude Design** screens | `appdimens-claude-design` |
| Apply AppDimens to **existing screens** (migrate, refactor, fix tablet/TV) | `appdimens-code-edit` |
| Create **new screens** directly with AppDimens (no design file) | `appdimens-new-screen` |

All of them follow the steps below.

## Step 1 — platform and library

Detect from the repository, never from the design: `node <package>/tools/appdimens-kit/cli.mjs detect .`, then [references/platform-router.md](references/platform-router.md). One project may have several targets. If nothing is detectable and the user did not say, ask.

## Step 2 — project contract (`appdimens.config.json`)

Root of the repo; schema `schemas/appdimens.config.schema.json`. It stores decisions made **once**: targets, `formFactors`, default strategies, the **base screen** and normalization rule, allowed breakpoints, token file locations. Missing → propose one with what you detected, ask only for the rest, write it after confirmation.

## Step 3 — base screen profile (one rule for when to ask)

Follow [references/base-screen.md](references/base-screen.md): logical size, resolution/density, orientation, aspect ratio, window vs screen, runtime height (system bars) and font scale of the screen the values were chosen on. Then apply **this rule literally**:

1. `appdimens.config.json` has `baseScreen` (for this target) → use it. Don't ask.
2. Otherwise exactly one unambiguous source — a single design frame/preset, one size in ≥ 80 % of the previews (`cli.mjs detect`), a `designSize`/base constant, or the platform default in create mode → use it, write `Base screen: … (assumed, unconfirmed)` in the intent sheet, proceed, and offer to record it.
3. Otherwise ask, before converting — conflicting sizes, a physical-px frame without density, a batch migration with no evidence, a base that contradicts the existing theme tokens, or height-driven values (`hdp`, fit/fill) with unclear system bars.

Edits that only reuse or adjust existing AppDimens tokens never ask. **Shared UI code (Flutter, KMP, RN, web) has exactly one base screen**: the frame the designer treats as canonical (ask if unclear); other frames (e.g. iOS 393 next to Android 412) are only checked (≈ ±5 % expected) and real differences become `adapt` rules. `targets[].baseScreen` is only for targets with separate UI code.

Base rule to keep in mind: tokens are `value × axis ÷ 300`; `sdp` reads the smallest side, `wdp` the width, `hdp` the **height ÷ 300** (not 533); `ssp` × the user's font scale. `16.dp` → `16.sdp` (same number) grows 20–47 % on today's phones; `match-base` keeps the look.

## Step 4 — intent per element

Five axes — `role`, `sizing`, `overflow`, `scale`, `adapt` — per [references/intent-model.md](references/intent-model.md). Explicit structure (Auto Layout, DOM flex/grid, lazy/list primitives in code, layer tags) **starts at 0.9**; heuristics only score what structure leaves ambiguous (list vs stack, carousel, overlay). **≥ 0.8** apply; **0.5–0.8** apply and list under "needs review"; **< 0.5** ask — at most **5** questions in one message, ordered by how many values each decision affects; the rest keep their best guess under "needs review".

## Step 5 — strategy and token per value

[references/decision-table.md](references/decision-table.md) gives the strategy per property; the default strategy comes from `formFactors` (phone only → `scaled`; bigger screens → `auto`) unless the user or config chose another one (`power`, `fluid`, `logarithmic`, `fit`, `fill`, `diagonal`, `perimeter`, `interpolated`, `density`, `percent`). Special features: **resize** for fit-to-container text/boxes, **units** for physical sizes. Then compute every base value — never by hand:

```bash
node <package>/tools/appdimens-kit/cli.mjs normalize --device medium-phone --strategy auto 16 12 24
node <package>/tools/appdimens-kit/cli.mjs normalize --device medium-phone --axis h 220          # hdp
node <package>/tools/appdimens-kit/cli.mjs normalize --frame 1080 --height 2400 --density 2.625 48  # px design
node <package>/tools/appdimens-kit/cli.mjs normalize --device medium-phone --space w 205          # 50.spaceW
```

Rules that are easy to get wrong:
- Hairlines, borders, elevation, shadows and platform chrome stay **fixed** (never normalized).
- Touch targets: the **visual** size is a normal token (48 on the base → `35.asdp`); the **hit area** is expanded separately with the platform API (`minimumInteractiveComponentSize`, `contentShape` + `frame(minWidth: 44)`, `hitSlop`). Never clamp the visual.
- Text uses the `sp` kind (`ssp`, `assp`, `fssp`); `sem` only with a reason. Line height is a ratio of the font size, not a separately rounded token. Body text on tablets with large font scale: prefer `fssp` (auto × font scale 2 reaches ≈ 3.8×).
- Fill/hug/weight are layout primitives, not numbers; images keep `aspectRatio` (not `hdp`); `hdp` only for values that must follow screen height.
- **Precision:** theme tokens are exact (`--theme`, 0.01) and named by the design value (`space16 = 11.68.asdp`), so sums and the base stay maintainable; one-off call-site values use `design.rounding` (0.5). Android XML and SDPS .NET are integer-only (`--xml`). Mixed Compose + XML apps: `dimens.xml` is the single source and Compose reads it with `dimensionResource`.

## Step 6 — implement through the platform skill

`appdimens-android`, `appdimens-android-xml`, `appdimens-kmp`, `appdimens-apple`, `appdimens-flutter`, `appdimens-react-native`, `appdimens-web`, `appdimens-dotnet`, `appdimens-games`: install lines, setup, imports, token syntax, intent → native primitives. The library's own upstream skill (in its repo under `skills/`) is the authority on API details; this package is the authority on base screen and intent.

## Step 7 — validate

- `node <package>/tools/appdimens-kit/cli.mjs lint <changed files>` (the Claude Code plugin runs it after each edit). Deliberate fixed values carry a reason: `// ad:fixed hairline`.
- Check on the **base screen first** (must match the source within rounding), then 300, then the large form factors. Say which you checked and how.

## Output contract

Before code, print the **intent sheet** with the base screen in the header:

```
Target: android-compose · appdimens-dynamic 3.2.0 · strategy auto (formFactors: phone, tablet)
Base screen: Figma "Android Compact" 412×917 dp · portrait · font 1.0 (confirmed) · match-base · asdp ×1.373

| Node             | Role    | Sizing W/H   | Overflow | Scale          | Source → token                   | Conf |
|------------------|---------|--------------|----------|----------------|----------------------------------|------|
| Home             | screen  | fill / fill  | scroll-v | —              | —                                | 0.95 |
| Home/Products    | grid    | fill / hug   | none     | spacing auto   | gap 12 → 9.asdp; cols 2→3 @sw600 | 0.82 |
| ProductCard      | card    | fill / hug   | none     | spacing auto   | pad 16 → 11.5.asdp, r 12 → 9     | 0.90 |
| ProductCard/Img  | media   | fill / ratio | clip     | —              | aspectRatio 4:3                  | 0.90 |
| ProductCard/Line | divider | fill / fixed | none     | fixed          | 1 → 1.dp (ad:fixed hairline)     | 1.00 |
| Title            | text    | fill / hug   | fit-text | resize         | 12…28 sp, 2 lines                | 0.85 |
Needs review: Products grid (inferred from 4 repeated siblings + wrap).
```

Then the code, then the lint result and what was checked on which screen.

## Never

- Convert values before the base screen is determined by the Step 3 rule.
- Treat physical px (resolution) as dp/pt.
- Use absolute positioning unless the intent is `overlay`.
- Invent breakpoints, strategies, tokens or suffixes. Real prefixes: `''` scaled, `a` auto, `p` percent, `pw` power, `f` fluid, `i` interpolated, `log` logarithmic, `dg` diagonal, `pr` perimeter, `ft` fit, `fl` fill, `d` density (+ resize and units APIs).
- Generate obsolete names: `balanced(…)`, `.balanced().dp`, `defaultScaling`, `.fxdp`, `.dydp`, `fx`, `dy`, `AppDimens.fixed(…)`, `densdp`, `fillsdp`, `fitsdp` (BALANCED → auto, DEFAULT/FIXED → scaled, PERCENTAGE/DYNAMIC → percent).
- Recommend `i` / `ia` (ignore multi-window) unless asked about split-screen (exception: game HUDs).
- Mix several strategies inside one component without a stated reason.
