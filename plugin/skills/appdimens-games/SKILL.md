---
name: appdimens-games
description: Implement layout intent for games on any engine and platform with appdimens-games 3.3 — Unity (AppDimensScreen, AppDimensCanvasScaler, AppDimensSafeArea, AppDimensCamera), Unreal Engine 5 (AppDimensDPIScalingRule, UAppDimensLibrary), Godot 4 (AppDimens autoload, AppDimensGames), custom C/C++ engines (games.h, C ABI), .NET engines and Android (48.sdp(context), NDK). Covers HUD/menus/world sizing, viewports (fit/fill/expand/integer), OpenGL/Vulkan/D3D11/D3D12/Metal/WebGPU viewports and projections, FOV per aspect, FSR/DLSS/XeSS/MetalFX/TSR render size, safe areas, Steam Deck/Proton, LOD.
---

# Games — `appdimens-games` 3.3.0

Decide intent first with `appdimens-layout-intent`; in games the role axis gains `hud` and `world`. Base screen = the
**reference resolution** the HUD is authored at (default 1920×1080). Upstream skill: `bodenberg/appdimens-games/skills/SKILL.md`.

## Repository layout (appdimens-games)

One folder per platform: `android/` (Gradle: Kotlin, Compose, Java, NDK — `cd android && ./gradlew …`),
`native/` (C/C++ SDK for every OS), `engines/{unity,unreal,godot}`, `dotnet/` (.NET package + C# drop-in),
`tools/` (formula oracle, engine sync), `DOCUMENTATION/`.

## Pick the binding

| Engine / stack | Wire-up |
|---|---|
| Unity 2019.4+ (all platforms) | UPM `…/appdimens-games.git?path=/engines/unity/com.bodenberg.appdimens.games`; `AppDimensScreen` is automatic; code: `320f.ASdp()`, `24f.FTSdp()`; add `AppDimensCanvasScaler` to Canvases, `AppDimensSafeArea` to the HUD root, `AppDimensCamera` to cameras |
| Unreal Engine 5 | plugin `engines/unreal/AppDimens`; *User Interface ▸ DPI Scale Rule = Custom → AppDimensDPIScalingRule*; Blueprint `Sdp/ASdp/FTSdp/LOGSsp` (+ `ResolveToken`), `HorizontalFovForAspect`, `ApplyUpscalerPreset` |
| Godot 4 | addon `engines/godot/addons/appdimens` (autoload `AppDimens`): `AppDimens.asdp(v)` — every family token (`sdpPh`, `logssp`, `ftsdpa` …), `apply_ui_scale()`, `AppDimensGames.configure_3d_scaling(...)` |
| C / C++ engines (SDL, GLFW, raylib, bgfx, Vulkan/D3D/Metal renderers) | `native/include/appdimens/games.h`: `adg_surface_default` + `adg_metrics_from_surface` on swapchain resize; C ABI `adg_publish_px` + `adg_live_*` across threads; C++ tokens `appdimens::asdp(64)` / `64_asdp` (`tokens.hpp`) |
| .NET (MonoGame, FNA, Stride, Godot .NET) | `dotnet/AppDimens.Games`: `GameDimens.Publish(new Surface(w, h))`, `64f.ASdp()` (every token as an extension, AppDimens.Net casing), `Live.Current.Resolve("hdpLw", v)` |
| Android (Compose/Kotlin/Java/NDK) | `implementation(platform("io.github.bodenberg:appdimens-games-bom:3.3.0"))` + `appdimens-games`; `GameScreen.updateFromContext(context)` on resize; code returns px (`48.sdp(context)`) |

## Element → policy (REFERENCE mode: values are px at the reference; plain tokens return final px)

| Element | Token / API |
|---|---|
| HUD, menus, buttons | `asdp` (calm on 4K/ultrawide/TV) — `sdp` for phone-only games |
| crosshair, minimap, cards that must never overflow | `ftsdp` |
| backgrounds that must cover | `flsdp` / `ADG_VIEW_FILL` |
| text | `assp` × accessibility text scale; ≥ `adg_min_text_px(TV|HANDHELD|DESKTOP, h)` |
| pixel art | `ADG_VIEW_INTEGER` viewport + `adg_pixel_snap` |
| 2D world framing | `ADG_VIEW_EXPAND` (wider screens see more) or `FIT` (board) |
| 3D camera | `ADG_FOV_HYBRID`; FPS: Hor+ with `max_hfov` cap; `adg_sensitivity_scale` for ADS/FOV slider |
| upscaling | snapshot from the **display** size; `adg_upscale_render_size`, `adg_upscale_mip_bias`, `adg_upscale_jitter`; HUD at display resolution |
| safe area / TV / ultrawide | `adg_safe_rect(w, h, insets, 0.05 on TV)` + `adg_hud_band(…, 16/9)` |
| open world LOD | `adg_lod_distance(size, target_px, vfov, h)` |

## Rules

- Never hand-roll Y flips or depth ranges: `adg_gl_viewport` / `adg_native_viewport` (VkViewport, D3D11/12, WebGPU) /
  `adg_metal_viewport`, `adg_ortho(api…)`, `adg_perspective(api…, reverse_z)`.
- Don't add `Px` tokens in REFERENCE mode (density = reference/300 would be applied twice).
- Steam Deck/Proton: `adg_platform()` flags; REFERENCE mode is DPI-independent, so Wine's 96 DPI doesn't matter.
- Validate at the reference (identity), 720p, 4K, 21:9/32:9, 16:10 (Deck) and a portrait phone.

## Custom strategies (`appdimens-games-custom`)

Full decision flow, cross-platform syntax table, rules and kit checks: `appdimens-custom-strategies`.

Only when `appdimens.config.json` declares `customStrategies` (or the user asks for their own strategy). Use the declared ids, never invent one; see the decision table → *Project-defined strategies*. Free-form formulas (`"type": "expression"`, `"formula"`) live in the JSON file.

Simplest strategy, when the user just wants to write the math: one typed line, autocompleted, typos fail to compile:

```kotlin
val Product = CustomScaleStrategy { (width / 360f).coerceIn(0.85f, 1.8f) }   // factor: once per window
val Hud = scalingFormula { base * pow(sw / 360f, 0.8f) }                      // final value (base = the value passed)
val px = 64.cdp(Product)
```

Unity/C#: `CustomGames.CustomScaleStrategy(s => s.Clamp(s.Width / 360f, 0.85f, 1.8f))`, `CustomGames.Formula(s => s.Base * s.Pow(s.Sw / 360f, 0.8f))` (PascalCase members), `64f.Cdp("base * (sw / 360)")`. Scope names match the text language: `base` (formula only) `sw width height shortSide longSide diagonal perimeter aspectRatio ratio density fontScale device`, flags `phone tablet desktop tv watch car vr landscape portrait multiWindow`, math `pow sqrt ln log10 exp abs round min max clamp lerp smoothstep`. For JSON or remote config, the same formula as text: `{"id": "hud", "formula": "base * pow(sw / 360, 0.8)"}` (shaped `base * (…)` it costs one multiply). Check numbers with `appdimens-kit custom explain --formula "<text>" --devices …`.

Kotlin: `64f.cdp(Hud)` → px from the live `GameScreen` (`cdpDp`, `cdpi` = resize-invariant, `csp`). Compose HUD: `import com.appdimens.games.compose.custom.*` → `64.cdp(Hud)`, `18.csp(Hud)`. C# (Unity/Godot): add `AppDimensGamesCustom.cs` + `AppDimensGamesCustom.Engine.cs`, then `CustomKernels.Cdp(64f, hud)` and `CustomKernels.Csp(18f, hud)` (final size). `CustomPresets.GAME_HUD` / `GameHud` is the usual parent. HUD only: world and gameplay sizes stay on `GameWorld` / fit / fill.

