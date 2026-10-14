---
name: appdimens-flutter
description: Implement layout intent in Flutter (Android, iOS, web, desktop) with appdimens_flutter — 16.sdp, 16.ssp, EdgeInsets.all(16.sdp), AppDimensApp — and the strategy packages (appdimens_auto, appdimens_fluid, appdimens_percent… or appdimens_bom). Use when writing or editing Flutter widgets in an AppDimens project, adding the package, or mapping a design to Column/Row/ListView/GridView.
---

# Flutter — `appdimens_flutter` 3.2.0

Decide intent first with `appdimens-layout-intent`. Upstream skill: `bodenberg/appdimens-flutter/skills/SKILL.md`.

## Install

```bash
flutter pub add appdimens_flutter          # scaled + core
flutter pub add appdimens_auto             # only if you use asdp / assp
# or everything: flutter pub add appdimens_bom
```

Satellites: `appdimens_auto`, `appdimens_fluid`, `appdimens_percent`, `appdimens_power`, `appdimens_interpolated`, `appdimens_logarithmic`, `appdimens_diagonal`, `appdimens_perimeter`, `appdimens_fit`, `appdimens_fill`, `appdimens_density`, `appdimens_resize`, `appdimens_units`. Import: `package:appdimens_<name>/appdimens_<name>.dart`.

## Setup

Wrap once: `runApp(AppDimensApp(child: MaterialApp(...)))`, or `AppDimensScopeBinder` inside `MaterialApp.builder`. Without a provider the getters resolve against the 300×533 baseline (`16.sdp == 16`): good for tests, wrong at runtime. Code that runs before the first frame or in isolates uses the explicit-context API (`16.sdpOf(context)`).

## Imports and tokens

| Policy | Import | Token |
|---|---|---|
| scaled | `package:appdimens_flutter/appdimens.dart` | `16.sdp` `48.hdp` `100.wdp` `16.ssp` `16.sem` |
| adaptive | `package:appdimens_auto/appdimens_auto.dart` | `16.asdp` `16.assp` |
| bounded | `package:appdimens_fluid/appdimens_fluid.dart` | `16.fsdp` `16.fssp` |
| fraction | `package:appdimens_percent/appdimens_percent.dart` | `50.spaceW` `50.psdp` |
| fit-text | `package:appdimens_resize/appdimens_resize.dart` | `AutoResizeText`, `AutoResizeSquare` |

## Intent → widgets

| Intent | Flutter |
|---|---|
| `screen` + `scroll-v` | `Scaffold(body: SingleChildScrollView(padding: EdgeInsets.all(16.sdp), child: Column(...)))` |
| `stack-v` / `stack-h` with gap | `Column(spacing: 12.sdp)` / `Row(spacing: 8.sdp)` (Flutter ≥ 3.27), or `SizedBox(height: 12.sdp)` separators |
| `overlay` | `Stack` + `Positioned`/`Align` (only for true overlays) |
| `list` | `ListView.separated(padding: EdgeInsets.all(16.sdp), separatorBuilder: (_, __) => SizedBox(height: 8.sdp), …)` |
| `grid` | `GridView.builder(gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 200.sdp, mainAxisSpacing: 12.sdp, crossAxisSpacing: 12.sdp))` |
| `carousel` | `ListView.builder(scrollDirection: Axis.horizontal)` or `PageView` / `CarouselView` for paged |
| `card` | `Card(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12.sdp)), child: Padding(padding: EdgeInsets.all(16.sdp), …))` |
| `sizing: fill` / `hug` | `Expanded` / `Flexible` / `double.infinity` width · default |
| `sizing: ratio` | `AspectRatio(aspectRatio: 4 / 3, child: …)` |
| `sizing: clamp` | `ConstrainedBox(constraints: BoxConstraints(minWidth: 280, maxWidth: 600))` `// ad:fixed clamp` |
| `truncate` | `Text(maxLines: 2, overflow: TextOverflow.ellipsis)` |
| `divider` | `Divider(thickness: 1, height: 1)` `// ad:fixed hairline` |
| touch minimum | Material's `minimumSize: Size(48, 48)` / `kMinInteractiveDimension` `// ad:fixed touch-min` |
| `adapt` | `LayoutBuilder` / `MediaQuery.sizeOf(context).shortestSide >= 600` for structure; facilitators `.sdpQualifier`, `.sdpScreen` for values |

Typography: put sizes in `ThemeData.textTheme` built inside the provider (`TextStyle(fontSize: 16.ssp)`), so the theme is rebuilt when the snapshot changes.

## Lint (what `appdimens-kit lint` flags here)

- `EdgeInsets.all(16)`, `EdgeInsets.symmetric(horizontal: 16)`, `SizedBox(height: 16)`, `BorderRadius.circular(12)`, `fontSize: 16` numeric literals > 2 → tokens.
- Strategy token without its package import (`.asdp` without `appdimens_auto`).
- Deprecated 2.x `fx` / `dy` APIs (see upstream MIGRATION.md).

## Verify

`flutter analyze` and widget tests with `AppDimensScope.withMetrics(DimenMetrics.from(cfg), () { … })` at 300, the design width and 600+.
