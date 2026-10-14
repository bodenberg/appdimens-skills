---
name: appdimens-design-to-code
description: Use when implementing UI from a Figma file/frame/link (Dev Mode, exports or the Figma MCP server), a screenshot, a mockup image or a written spec, with AppDimens on any platform. Identifies and confirms the base screen the design was drawn on (frame size, px vs dp/pt, density, orientation), reads structure without modifying the design, infers layout intent per node, converts values with the right strategy, and hands off to the platform skill. For Claude Design screens use appdimens-claude-design.
---

# Figma / screenshot / spec → AppDimens code

Follow `appdimens-layout-intent` (steps 1–7). This skill is the procedure for a design file or image.

## 1. Inputs (ask only for what is missing)

| Input | Where | If missing |
|---|---|---|
| Target platform + library | repo (`cli.mjs detect .`) | ask |
| `appdimens.config.json` | repo root | propose one after step 2 |
| **Base screen profile** | the frame (step 2) | ask — never assume 300 |
| Tokens / variables | Figma variables & styles, a tokens JSON, the code theme | use raw values and flag them |
| Component mapping | design-system names ↔ code components | match by name; flag unknowns |
| Extra frames (tablet/desktop) | sibling frames of the same screen | `adapt` evidence |

With the Figma MCP server, pull structured data (layout mode, sizing, constraints, variables, component names) instead of screenshots. A screenshot alone lowers every confidence by 0.2.

## 2. Identify and confirm the base screen

From `../appdimens-layout-intent/references/base-screen.md`:

1. **Frame size and preset.** `Android Compact` 412×917, `iPhone 16` 393×852, `Desktop` 1440×1024… (`cli.mjs devices`). The base is the **screen frame**, not a component frame.
2. **Units.** Figma at 1× is in logical units (dp/pt/CSS px). A portrait frame ≥ 640 wide (1080×2400, 1170×2532) is **physical px**: ask the density (Android 420 dpi = 2.625, iOS @3x = 3) and divide.
3. **Orientation, aspect ratio, status bar.** Landscape frames: the smallest side is the height. If the frame includes the status/navigation bar, `hdp` values should be measured against the content height the app gets.
4. **Font scale.** Normally 1.0; if the designer previewed large text, divide text values by it.
5. **Confirm** in one line (frame name, logical size, density, factor for the chosen strategy, one example conversion) and record it in `design.baseScreen`.

Exported image only: image px ÷ export scale = logical size. Unknown scale → ask.

## 3. Read structure, not appearance

Walk the tree top-down and record per node: Auto Layout direction, wrap, gap, padding, sizing (fill/hug/fixed), constraints, absolute children, component instance, text style, bound variables, repeated siblings. Never modify the source. Drop decorative single-child groups.

## 4. Infer intent

Axes and heuristics in `../appdimens-layout-intent/references/intent-model.md`. Layer-name annotations (`[grid]`, `[fill]`, `[fixed-scale]`, `[fit-text]`, `[sw600:cols=3]`) win. All nodes below 0.5 go to the user in one message, each with your best guess.

## 5. Choose strategy, then convert every value

- Strategy per property: decision table (defaults from `formFactors`, or the user's choice: power, fluid, logarithmic, fit, fill…).
- Text that must fit a box → **resize** (min/max are final sizes, not normalized). Physical sizes → **units**.
- Convert with the CLI, per axis:

```bash
node <package>/tools/appdimens-kit/cli.mjs normalize --device figma-android-compact --strategy auto 4 8 12 16 24 32
node <package>/tools/appdimens-kit/cli.mjs normalize --device figma-android-compact --strategy auto --text 12 14 16 20 24
node <package>/tools/appdimens-kit/cli.mjs normalize --device figma-android-compact --axis h 220
```

Tokens bound to variables are converted once, in the theme. Fixed values are never converted.

## 6. Intent sheet, then code

Print the intent sheet (base screen in the header, source value → token per row). Then load the platform skill: theme/tokens first, components next, screens last; roles become native primitives (lazy lists, grids, pagers), design-system components stay design-system components.

## 7. Validate

`cli.mjs lint` on the changed files. Check on the **base screen first** (must match the design within rounding), then 300, then large form factors. Report which screens you checked and how.

## Never

- Convert before the base screen is confirmed.
- Treat resolution (physical px) as dp/pt.
- Copy absolute x/y positions.
- Hardcode a value bound to a variable/token.
- Invent breakpoints.
- Claim pixel-match when `normalization` is `as-is`.
