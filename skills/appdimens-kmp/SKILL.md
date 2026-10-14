---
name: appdimens-kmp
description: Implement layout intent in Kotlin Multiplatform / Compose Multiplatform with appdimens-kmp (Android, iOS, JVM desktop, macOS, Linux, Windows, JS, Wasm) — 16.sdp, 16.ssp, 16.asdp from commonMain. Use when a KMP project uses or adopts AppDimens, when adding appdimens-kmp or a strategy module, or when mapping a design to Compose Multiplatform UI.
---

# Kotlin Multiplatform — `appdimens-kmp` 3.2.0

Same vocabulary and math as `appdimens-dynamic`; packages are `com.appdimens.kmp.*`. Decide intent first with `appdimens-layout-intent`; the Compose mapping table in `appdimens-android` applies unchanged to Compose Multiplatform (use the multiplatform equivalents of Material 3 components). Upstream skill: `bodenberg/appdimens-kmp/skills/SKILL.md`.

## Install (`commonMain`)

```kotlin
commonMain.dependencies {
    implementation(project.dependencies.platform("io.github.bodenberg:appdimens-kmp-bom:3.2.0"))
    implementation("io.github.bodenberg:appdimens-kmp")        // scaled + core
    implementation("io.github.bodenberg:appdimens-kmp-auto")   // asdp / assp, only if used
    // -percent -power -fluid -interpolated -logarithmic -diagonal -perimeter -fit -fill -density -resize -units
}
```

## Imports and tokens

| Policy | Import | Token |
|---|---|---|
| scaled | `com.appdimens.kmp.compose.*` | `16.sdp` `48.hdp` `100.wdp` `16.ssp` `16.sem` |
| adaptive | `com.appdimens.kmp.compose.auto.asdp` / `.assp` | `16.asdp` `16.assp` |
| bounded | `com.appdimens.kmp.compose.fluid.*` | `16.fsdp` `16.fssp` |
| fraction | `com.appdimens.kmp.compose.percent.*` | `50.spaceW` |
| fit-text | `com.appdimens.kmp.compose.resize.*` | `autoResizeTextSp(…)` in `BoxWithConstraints` |
| non-Compose code | `com.appdimens.kmp.code.*` | needs an `AppDimensContext` |

## Platform notes

- Compose: no setup for plain tokens; `AppDimensProvider { }` for facilitators (`sdpMode`, `sdpScreen`).
- The window adapter is per platform: Android `Context`, JVM AWT window, iOS `UIScreen`, macOS `NSScreen`, JS/Wasm browser viewport. **Linux/MinGW have no windowing API**: build an `AppDimensContext` from a `ScreenConfiguration` or use the `DimenMetrics` overloads.
- Desktop and web targets are large, resizable windows. If they are in `formFactors`, use the adaptive policy (`asdp`/`assp`) or bounded text (`fssp`), and constrain content with `widthIn(max = …)` `// ad:fixed max-content-width`.
- Keep UI tokens in `commonMain`. Platform source sets should only adapt chrome.

## Verify

`./gradlew :composeApp:compileKotlinJvm` (or the relevant target), plus previews/desktop window at 300, the design width and ≥ 600.
