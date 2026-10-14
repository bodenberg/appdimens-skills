---
name: appdimens-games
description: Implement layout intent for Android games with appdimens-games — HUD, menus, gameplay objects, backgrounds, boards and world/viewport scaling in Kotlin/Java (48.sdp(context) → px), Compose HUDs, C/C++/NDK, OpenGL ES, Vulkan, DirectX and Unity/C#. Use when sizing game UI or world elements, wiring GameScreen updates, choosing fit/fill/auto per element, or using the native (C++/C99/JNI) and C# kernels.
---

# Games — `appdimens-games` 3.2.0

Same vocabulary as `appdimens-dynamic`; code APIs return **px**, Compose returns `Dp`/`TextUnit`. Decide intent first with `appdimens-layout-intent`; in games the role axis gains `hud` and `world`. Upstream skill: `bodenberg/appdimens-games/skills/SKILL.md` (+ `reference.md`).

## Install

```kotlin
implementation(platform("io.github.bodenberg:appdimens-games-bom:3.2.0"))
implementation("io.github.bodenberg:appdimens-games")           // core (scaled)
implementation("io.github.bodenberg:appdimens-games-native")    // C/C++/JNI, optional
// strategy satellites: appdimens-games-auto, -fit, -fill, -fluid, -logarithmic, -units …
```

## Wire-up

- `GameScreen.updateFromContext(context)` on every surface/window resize (Activity and Surface callbacks).
- Compose HUD: wrap in `AppDimensProvider { }`.
- Native: `updateMetrics(Metrics::make(wDp, hDp, swDp, dpi, fontScale))` from surface callbacks; read `metrics()` (live) or `invariantMetrics()` (frozen fullscreen).
- Hot paths must not allocate: cache a `GameMetrics` and use `GameMath.calculate…Dp(base, metrics)` or the extension fast lanes.

## Element → policy (games cheat-sheet)

| Element (intent) | Policy | Token |
|---|---|---|
| HUD, buttons, menus (`hud`) | scaled | `48.sdp(ctx)` · `16.ssp(ctx)` |
| HUD that must not shrink in split-screen | scaled, invariant | `48.sdpi(ctx)` (the `i` suffix is appropriate here) |
| Gameplay objects (`world`, sprites relative to screen) | adaptive ⭐ | `64f.asdp(ctx)` |
| Background, parallax (must cover) | fill | `flsdp` · world: `WorldScale.fillPx(metrics, designW, designH)` |
| Board/map that must stay fully visible | fit | `ftsdp` · world: `WorldScale.fitPx(...)` with `ViewportMode.FIT_ALL` |
| Score/dialog text | bounded | `16f.fsdp(ctx)` / `fssp` |
| TV / very large screens | logarithmic | `logsdp` |
| Physical touch-target size | physical | `2f.cmPx(ctx)` (units) |
| Pixel-perfect sprites | fixed | raw value `// ad:fixed pixel-art` |

World layer: `WorldScale.fitPx/fillPx` equal the factors of `ViewportMode.FIT_ALL` / `CROP`; use them together with `ViewportTransform` so sprites land inside the letterbox. Native `render::viewportRect / vkViewport / dxViewport / glRect` produce field-compatible viewport structs.

## Native and C#

- C++20 header-only: `appdimens::games::{Constants, Metrics, math, render}` (`math::scaledDp`, `autoDp`, `fitDp`, `fillDp`, `toPx`, …).
- C99 single header `appdimens_games_c.h`: `adg_make`, `adg_scaled`, `adg_auto`, `adg_fit`, `adg_fill`, `adg_to_px`.
- JNI: `com.appdimens.games.jni.NativeBridge`.
- Unity/C#: `AppDimensGames.Screen.Update(wDp, hDp, dpi)`, `MathKernels.Scaled/Auto/Fit/Fill/ToPx`, `World.ViewportRect(mode, w, h, dw, dh)`.

## Never

- Invent stems; they are identical to `appdimens-dynamic`.
- Use deprecated 2.x names (`com.appdimens.games.compat.GamesCompat`) in new code.
- "Fix" the family constants (300 / 533 / 611.6305 / 833 / 1.78).

## Verify

`./gradlew testDebugUnitTest`; run at 300-wide, phone, tablet and landscape; check letterbox bounds for fit and that fill covers with no gaps.
