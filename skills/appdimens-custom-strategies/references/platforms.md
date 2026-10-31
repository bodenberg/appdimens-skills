# Custom strategies — per-platform details

Install, imports, default / scope, debug output and error types of every custom module. All modules are **unreleased** (on each library's main / feature branch). Each library's own guides are the authority on details; their paths are listed per platform.

## Android — `appdimens-dynamic-custom` (Compose, Views, Java)

```kotlin
implementation("io.github.bodenberg:appdimens-dynamic-custom")
import com.appdimens.dynamic.custom.*            // CustomScaleStrategy, scalingFormula, scalingStrategy, ScalingStrategies, CustomPresets
import com.appdimens.dynamic.compose.custom.*    // 16.cdp(s): Dp · 14.csp(s): TextUnit · cdpPx / cspPx · ProvideScalingStrategy
import com.appdimens.dynamic.code.custom.*       // 16.cdp(context, s): px · cdpDp · csp · cspUnits · DimenCustom (Java)
```

- Default / scope: `ScalingStrategies.default = Brand` · `ProvideScalingStrategy(Brand) { … }`.
- Load: `ScalingStrategies.loadAsset(context, "appdimens-strategies.json")` (or `loadJson(text)`) once, in `Application`; `ScalingStrategies.getOrThrow("brand")`.
- Debug: `Brand.explainCurrent()` (Compose), `Brand.explain(context)` (Views).
- Errors: `IllegalArgumentException` (formula, JSON path, bounds, unknown id); a non-finite factor throws when the window resolves.
- Docs: `appdimens-dynamic/DOCUMENTATION/custom/`.

## KMP — `appdimens-kmp-custom`

```kotlin
implementation("io.github.bodenberg:appdimens-kmp-custom")      // commonMain
import com.appdimens.kmp.custom.*            // strategies
import com.appdimens.kmp.compose.custom.*    // 16.cdp(s): Dp · 14.csp(s): TextUnit · ProvideScalingStrategy
import com.appdimens.kmp.code.custom.*       // 16.cdp(appContext, s): px · cdpDp · csp · cspUnits
```

- Same DSL and one-liners as Android. Load with `ScalingStrategies.loadJson(text)` (read the file from your resources).
- Debug: `explainCurrent()` (Compose), `explain(context)` with an `AppDimensContext`.
- Device class: from the UI mode; desktop targets map to `desktop`.
- Docs: `appdimens-kmp/DOCUMENTATION/custom/`.

## Games — `appdimens-games-custom` (Kotlin) and the C# port (Unity, Godot)

```kotlin
implementation("io.github.bodenberg:appdimens-games-custom")
import com.appdimens.games.custom.*             // strategies
import com.appdimens.games.code.custom.*        // 64.cdp(s): px from the live GameScreen · cdpDp · cdpi · csp · cspDp
import com.appdimens.games.compose.custom.*     // Compose HUD: 64.cdp(s), 18.csp(s)
```

```csharp
// copy csharp/AppDimensGames/AppDimensGamesCustom.cs + AppDimensGamesCustom.Engine.cs
using AppDimensGames.Custom;
var hud = CustomGames.Formula(s => s.Base * s.Pow(s.Sw / 360f, 0.8f));
float px = 64f.Cdp(hud);                      // CustomKernels.Cdp(64f, hud); CdpPx, Cdpi (resize-invariant), Csp (final size)
ScalingStrategies.LoadJson(json); var brand = ScalingStrategies.Require("brand");
```

- `CustomPresets.GAME_HUD` / `CustomPresets.GameHud` is the usual parent. HUD only: world and gameplay sizes stay on `GameWorld` / fit / fill.
- Debug: `strategy.explain()` (Kotlin code), `explainCurrent()` (Compose), `CustomKernels.Explain(s)` (C#).
- Errors: Kotlin `IllegalArgumentException`; C# `ArgumentException` / `KeyNotFoundException` / `InvalidOperationException` (same engine as .NET).
- Docs: `appdimens-games/DOCUMENTATION/strategies/custom/`.

## .NET — `AppDimens.Net.Custom` (MAUI, WPF, WinForms, WinUI, any host)

```csharp
// dotnet add package AppDimens.Net.Custom   (included in AppDimens.Net.Sdk)
using AppDimens.Net.Custom;
public static readonly ScalingStrategy Product = CustomScaleStrategy.Create(s => s.Clamp(s.Width / 360f, 0.85f, 1.8f));
float pad = 16.Cdp(Product);                 // dp · CdpPx px · Csp sp units · CspDp / CspPx final size
float px2 = 16.CdpPx(Product, ctx);          // explicit IAppDimensContext (secondary window, tests)
```

- Needs the ambient window (MAUI `AppDimensMaui.AttachWindow`, `AppDimensWpf.Initialize`, `AppDimensWinForms.Initialize`, `AppDimensWinUI.Initialize`, `AppDimensHost.Activate`), or pass a context.
- Default / scope: `ScalingStrategies.Default = brand` · `using (CustomDimens.Use(brand)) { … }` (async flow).
- Load: `ScalingStrategies.LoadJson(text)` / `CustomExtensions.LoadFile(path)`; `ScalingStrategies.Require("brand")`.
- Device class: UI mode, then Windows/macOS/Linux → `desktop`, then `sw ≥ 600`; override `CustomDimens.DeviceClassResolver`.
- Overloads: `int` receivers have every form; some `float` + strategy forms need the context (`16f.CdpPx(s, ctx)`).
- Debug: `s.ExplainCurrent()` / `s.ExplainCurrent(ctx)`; `s.Explain(new ScreenSnapshot(800, 1280))` without a window.
- Errors: `ArgumentException` (formula position, JSON path, bounds), `KeyNotFoundException` (unknown id / `default`), `InvalidOperationException` (non-finite factor, `ToJson()` of a code lambda).
- Docs: `appdimens-net-binding/docs/AppDimens.Net.Custom/`.

## Apple — `AppDimensCustom` (SwiftUI, UIKit, AppKit)

```swift
.product(name: "AppDimensCustom", package: "appdimens-ios")
import AppDimensCustom
let product = CustomScaleStrategy { s in s.clamp(s.width / 360, 0.85, 1.8) }
let brand = try ScalingStrategy.define("brand", curve: .power(0.8), minFactor: 0.85, maxFactor: 1.6)
Text("Hi").font(.system(size: 14.csp(brand))).padding(16.cdp(brand))   // CGFloat; csp = final point size
```

- Scope: `.scalingStrategy(brand)` on a view, `@CustomDimension(16)` / `@CustomDimension(text: 14)` inside; default `ScalingStrategies.defaultStrategy`.
- Load: `try ScalingStrategies.load(resource: "appdimens-strategies")` (or `load(json:)` / `load(data:)`); `try ScalingStrategies.require("brand")`.
- Text formulas `throw`: `try scalingFormula("…")`, `try 16.cdp("…")`.
- Errors: `ScalingStrategyError` (with `description`). A non-finite factor **falls back to 1** (no throw).
- Debug: `brand.explain()`.
- Docs: `appdimens-ios/Documentation/strategies/custom/`.

## Flutter — `appdimens_custom`

```dart
import 'package:appdimens_custom/appdimens_custom.dart';
final product = customScaleStrategy((s) => s.clamp(s.width / 360, 0.85, 1.8));
final hud = scalingFormulaOf((s) => s.base * s.pow(s.sw / 360, 0.8));   // text: scalingFormula('…')
SizedBox(width: 48.cdpWith(product));                                    // cspWith, cdpPxWith; 16.cdpFormula('…')
```

- Dart has no overloading: `cdpWith` / `cspWith` take a strategy, `cdpFormula` takes text, `scalingFormulaOf` takes a code formula.
- Scope: `ScalingStrategyScope(strategy: brand, child: …)` then `context.cdp(16)` / `context.csp(14)`; default `ScalingStrategies.defaultStrategy = brand`.
- Load: `ScalingStrategies.loadJson(await rootBundle.loadString('assets/appdimens-strategies.json'))`; `ScalingStrategies.getOrThrow('brand')`.
- Errors: `FormatException` (formula, JSON), `ArgumentError` (bounds, unknown id), `StateError` (non-finite factor, encoding a code lambda).
- Debug: `brand.explain()`, `context.explainScaling()`.
- Docs: `appdimens-flutter/DOCUMENTATION/custom/`.

## Web — `webdimens/custom`

```ts
import { cdp, csp, customScaleStrategy, scalingFormula, defineScalingStrategy, loadScalingStrategies, requireScalingStrategy } from 'webdimens/custom';
const product = customScaleStrategy(({ width, clamp }) => clamp(width / 360, 0.85, 1.8));
el.style.padding = product.css(16);          // "calc(16 * var(--cdp-…))", responsive and SSR-safe
cdp(16, product);                            // number (CSS px) for canvas / JS layout
```

- CSS (PostCSS plugin or `dimens()`): `padding: 16cdp-brand; font-size: 14csp-brand;`. Value-dependent strategies (`valueClamp`, `formula`) produce px literals instead of a `var()`.
- Default / scope: `setDefaultScalingStrategy(brand)`; React `ScalingStrategyProvider` + `useScalingStrategy()`, Vue `useScalingStrategy`, Svelte `scalingStrategy()`, Angular `injectScalingStrategy()`.
- Load: `loadScalingStrategies(json)` (registers ids, publishes `--cdp-<id>` / `--csp-<id>`); `requireScalingStrategy('brand')`.
- Device class: UI mode, a fine pointer → `desktop`, else `sw ≥ 600` → tablet.
- Errors: `TypeError` (JSON types, unknown id), `RangeError` (bounds, non-finite factor), `SyntaxError` (formula).
- Debug: `brand.explain()`.
- Docs: `appdimens-web/docs/custom/` (also `docs/pt-BR/custom/`).

## React Native — `appdimens-react-native/custom`

```tsx
import {cdp, csp, customScaleStrategy, scalingFormula, loadCustomStrategies, requireCustomStrategy, useCustomStrategy, CustomStrategyProvider} from 'appdimens-react-native/custom';
const hud = scalingFormula(({base, sw, pow}) => base * pow(sw / 360, 0.8));
<Text style={{fontSize: csp(18, hud)}}>Score</Text>
```

- `csp` is for `fontSize` (RN applies the font scale, the policy is pre-compensated); never a `Px` value there.
- Full config: `defineCustomStrategy({ id: 'brand', … })`. Default: `setDefaultCustomStrategy(brand)`; subtree: `<CustomStrategyProvider>`; `useCustomStrategy(brand)` re-renders on window changes (`s.dp(16)`, `s.sp(14)`).
- Load: `loadCustomStrategies(require('./appdimens-strategies.json'))`; `requireCustomStrategy('brand')`.
- Device class: UI mode, `Platform.isTV` → `tv`, macOS / Windows → `desktop`, else `sw ≥ 600`.
- Errors: `TypeError`, `RangeError`, `SyntaxError` (as web). Debug: `brand.explain()`.
- Docs: `appdimens-react-native/docs/custom/`.

## Not supported

- Android XML resources (`@dimen/_16sdp`, `appdimens-sdps` / `-ssps`): scaled only. Set custom values from code (`16.cdp(context, Brand)` → px) or move the screen to Compose.
- SDPS .NET packages (`Bodenberg.AppDimens.*Sdps*`): no custom strategies; use the AppDimens.Net family.
