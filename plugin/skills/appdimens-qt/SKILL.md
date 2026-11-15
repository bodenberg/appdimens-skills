---
name: appdimens-qt
description: Implement layout intent in Qt 5.12+/Qt 6 apps with appdimens-qt — QML/Qt Quick (width: 120 * AppDimens.sdp, font.pixelSize: 14 * AppDimens.ssp, DimensScope per window) and Widgets (AppDimens::Scope, bindStyleSheet with 16sdp tokens, px("8sdp"), 16_sdp literals) on Windows, macOS, Linux, Android, iOS and embedded eglfs. Use when sizing Qt UI, fixing HiDPI/multi-monitor sizes, or porting dp/sp layouts to Qt.
---

# Qt — `appdimens-qt` 3.2.0

Decide intent first with `appdimens-layout-intent`. Upstream skill: `bodenberg/appdimens-qt/skills/appdimens-qt/SKILL.md`.

## Install / wire-up

- CMake: `add_subdirectory(appdimens-qt)` → `target_link_libraries(app PRIVATE AppDimens::Qt)`; qmake: `include(appdimens-qt/appdimens-qt.pri)`.
- QML: call `AppDimens::Scope::registerQmlTypes()` before loading QML; `import AppDimens 1.0`.
- One scope per top-level window when the app has several windows: QML `DimensScope { target: win }`, Widgets `new AppDimens::Scope(&window, &window)`.

## Tokens

| Intent | QML | Widgets / C++ |
|---|---|---|
| spacing, sizes (phone-first) | `16 * AppDimens.sdp` | `scope->px("16sdp")` |
| desktop/tablet/TV sizes | `16 * AppDimens.asdp` | `scope->dimen("16asdp")` |
| text | `font.pixelSize: 14 * AppDimens.ssp` / `assp` | style sheet `font-size: 14ssp` |
| must never overflow | `120 * AppDimens.ftsdp` | `resolve("ftsdp", 120)` |
| rotation inverters | `AppDimens.sdpPh`, `AppDimens.hdpLw` | `resolve("hdpLw", 50)` |

Factor properties are reactive (NOTIFY); `AppDimens.dimen("16sdp")` is a function — add `AppDimens.revision` to the binding if you need it reactive.

## Rules

- Values are **logical px**: never multiply by `devicePixelRatio` (use `Px` tokens only for QImage/OpenGL buffers).
- Widgets: `bindStyleSheet(widget, "QPushButton { padding: 8sdp; font-size: 14ssp; }")` re-applies on every change; re-layout margins in `changed()`.
- Validate at 300 × 533 (identity), maximized 1080p, 4K @ 150 %, and after moving the window to another monitor.

## Custom strategies

Only when `appdimens.config.json` declares `customStrategies` (or the user asks for their own rule); never invent ids.
`#define ADC_IMPLEMENTATION` + `#include "appdimens/appdimens_custom.h"` → `adc_load_json(text, err, n)`, `adc_dp(adc_get("id"), &scope->metrics(), 16)`. Full flow: `appdimens-custom-strategies`.
