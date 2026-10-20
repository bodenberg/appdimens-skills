# Platform router — which AppDimens library, which skill

Versions current as of AppDimens 3.2.0 (Web `webdimens` 3.2.1, .NET 3.6.1). Each library README is the final word on its install line.

## Detect from the repository

| Evidence in the repo | Target id | Library | Skill |
|---|---|---|---|
| `build.gradle(.kts)` with `com.android.application/library` + Compose (`buildFeatures { compose = true }`, `androidx.compose`) | `android-compose` | `appdimens-dynamic` | `appdimens-android` |
| Android module with Kotlin/Java Views, no Compose | `android-views` | `appdimens-dynamic` (code API, returns px) | `appdimens-android` |
| `res/layout/*.xml` layouts, `@dimen/` usage | `android-xml` | `appdimens-sdps` + `appdimens-ssps` | `appdimens-android-xml` |
| `kotlin("multiplatform")` / `commonMain` source sets | `kmp` | `appdimens-kmp` | `appdimens-kmp` |
| `Package.swift`, `*.xcodeproj`, `*.swift` with SwiftUI/UIKit/AppKit | `apple` | `appdimens-ios` (product `AppDimensDynamic`) | `appdimens-apple` |
| `pubspec.yaml` with `flutter:` | `flutter` | `appdimens_flutter` (+ `appdimens_<strategy>` / `appdimens_bom`) | `appdimens-flutter` |
| `package.json` with `react-native` or `expo` | `react-native` | `appdimens-react-native` | `appdimens-react-native` |
| `package.json` with react/vue/svelte/angular/next/nuxt/vite, or plain HTML/CSS | `web` | `webdimens` | `appdimens-web` |
| `*.csproj` with `<UseMaui>true</UseMaui>` | `dotnet-maui` | `Bodenberg.AppDimens.Maui.Sdps` or `AppDimens.Net.Maui` + `AppDimens.Net.Sdk` | `appdimens-dotnet` |
| `*.csproj` with `<UseWPF>` / `<UseWindowsForms>` / WindowsAppSDK | `dotnet-desktop` | `Bodenberg.AppDimens.Sdps.Wpf/.WinForms/.WinUI` or `AppDimens.Net.Wpf/.WinForms/.WinUI` | `appdimens-dotnet` |
| `*.csproj` targeting `net*-android` | `dotnet-android` | `Bodenberg.AppDimens.Sdps` / `.Ssps` / `.Dynamic` | `appdimens-dotnet` |
| Game loop / `SurfaceView` / `GLSurfaceView` / NDK `CMakeLists.txt` / Vulkan / Unity C# | `games` | `appdimens-games` (+ `appdimens-games-native`) | `appdimens-games` |

Tie-breakers:
- Android Compose + XML in the same app is common: Compose screens → `appdimens-dynamic`, XML layouts → `appdimens-sdps`/`ssps`. Both libraries share the same numbers.
- KMP project that only targets Android → still `appdimens-kmp` if the UI lives in `commonMain`.
- React Native Web → `appdimens-react-native` (it supports RN Web); plain web → `webdimens`.
- .NET: short `{sdp:16}` markup and Android SDP parity → the **SDPS** family; strategies (`FSdp`, `ASdp`, `SpaceW`…) → the **AppDimens.Net** family. Don't mix them in one project.

## Token syntax at a glance

| Meaning | Compose · KMP · Apple · Flutter | Android code / Games | React Native | Web | Android XML | .NET MAUI (SDPS) | AppDimens.Net (C#) |
|---|---|---|---|---|---|---|---|
| spacing 16 | `16.sdp` | `DimenSdp.sdp(ctx, 16)` / `16.sdp(ctx)` → px | `sdp(16)` | `p:16sdp` / `padding: 16sdp` (PostCSS) / `sdp(16)` | `@dimen/_16sdp` | `{sdp:16}` / `16.Sdp()` | `16.Sdp()` |
| width-axis 100 | `100.wdp` | `DimenSdp.wdp(ctx, 100)` | `wdp(100)` | `w:100wdp` | `@dimen/_100wdp` | `{wdp:100}` | `100.Wdp()` |
| height-axis 48 | `48.hdp` | `DimenSdp.hdp(ctx, 48)` | `hdp(48)` | `h:48hdp` | `@dimen/_48hdp` | `{hdp:48}` | `48.Hdp()` |
| text 16 | `16.ssp` | `DimenSsp.ssp(ctx, 16)` | `ssp(16)` | `fs:16ssp` | `@dimen/_16ssp` | `{ssp:16}` | `16.Ssp()` |
| text, no font scale | `16.sem` | — | `sem(16)` | `fs:16sem` | — | `{sem:16}` | `16.Sem()` |
| auto spacing | `16.asdp` | `16.asdp(ctx)` | `asdp(16)` from `/auto` | `p:16asdp` | — (XML is scaled only) | — (use AppDimens.Net) | `16.ASdp()` |
| fluid text | `16.fssp` | `16.fssp(ctx)` | `fssp(16)` from `/fluid` | `fs:16fssp` | — | — | — (strategies are dp-only; text uses `Ssp`) |
| custom strategy *(unreleased modules)* | `16.cdp(Brand)` · text `16.csp(Brand)` (Flutter: `16.cdpWith(brand)`) | `16.cdp(ctx, Brand)` → px · C# `CustomKernels.Cdp(16f, hud)` | `cdp(16, brand)` from `/custom` | `padding: 16cdp-brand` (PostCSS) / `brand.css(16)` / `cdp(16, 'brand')` | — (XML is scaled only) | — (use AppDimens.Net) | `16.Cdp(brand)` |
| % of width | `50.spaceW` | `50.spaceW(ctx)` | `spaceW(50)` from `/percent` | `spaceW(50)` | — | — | `50.SpaceWDp(ctx)` |

## One-time setup per platform

| Target | Setup |
|---|---|
| android-compose / kmp | none for plain tokens; `AppDimensProvider { }` at the root only for facilitators (`sdpMode`, `sdpScreen`, ui-mode / fold) |
| android-xml | none |
| apple (SwiftUI) | `ContentView().appDimens()` once at the `WindowGroup` root |
| apple (UIKit/AppKit) | `AppDimens.startAutomaticUpdates()` once |
| flutter | `AppDimensApp(child: MaterialApp(...))` (or `AppDimensScopeBinder` in `MaterialApp.builder`) |
| react-native | none; components subscribe with `createDimenStyles` / `useDimenMetrics()` |
| web | `import { install } from 'webdimens'; install();` (CDN script installs itself) |
| dotnet-maui (SDPS) | `builder.UseAppDimensSdps()` + `AppDimensSdpsWindow.Attach(window)` |
| dotnet (AppDimens.Net) | `AppDimensMaui.AttachWindow(window)` / `AppDimensWpf.Initialize(this)` / `AppDimensWinForms.Initialize(this)` / `AppDimensWinUI.Initialize(window)` |
| games | `GameScreen.updateFromContext(context)` on every surface resize; `AppDimensProvider { }` for Compose HUDs |

## Upstream skills (authoritative for API details)

| Library | Skill in its repo |
|---|---|
| hub | `bodenberg/appdimens` → `skills/SKILL.md` |
| appdimens-dynamic | `skills/SKILL.md`, `skills/library-map.md`, `skills/reference.md` |
| appdimens-kmp | `skills/SKILL.md` |
| appdimens-ios | `skills/appdimens-ios/SKILL.md` |
| appdimens-flutter | `skills/SKILL.md` |
| appdimens-react-native | `skills/SKILL.md` |
| appdimens-web | `skills/SKILL.md`, `skills/reference.md` |
| appdimens-net-binding | `skills/appdimens-sdps-net`, `skills/appdimens-net`, `skills/appdimens-android-sdps-ssps`, `skills/appdimens-android-dynamic` |
| appdimens-games | `skills/SKILL.md`, `skills/reference.md` |
| appdimens-sdps / appdimens-ssps | `LLMS.txt` + README (no dedicated skill; covered by the hub skill) |
