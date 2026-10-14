---
name: appdimens-dotnet
description: Implement layout intent in .NET UI with appdimens-net-binding — .NET MAUI ({sdp:16}, {ssp:14}, 16.Sdp()), WPF, Windows Forms, WinUI 3 and .NET for Android — choosing between the SDPS family (Bodenberg.AppDimens.Maui.Sdps / .Sdps.Wpf / .WinForms / .WinUI, Android SDP parity) and the AppDimens.Net family (C# port of appdimens-kmp with strategies: ASdp, FSdp, SpaceWDp). Use when writing or editing XAML/C# UI in an AppDimens .NET project or installing these packages.
---

# .NET — `appdimens-net-binding` 3.6.1

Decide intent first with `appdimens-layout-intent`. Upstream skills (authoritative): `bodenberg/appdimens-net-binding/skills/` → `appdimens-sdps-net`, `appdimens-net`, `appdimens-android-sdps-ssps`, `appdimens-android-dynamic`.

## 1. Pick the family (one per project)

| Need | Family | Packages |
|---|---|---|
| Scaled only, short markup `{sdp:16}`, Android SDP parity | **SDPS** | `Bodenberg.AppDimens.Maui.Sdps` · `Bodenberg.AppDimens.Sdps.Wpf` / `.WinForms` / `.WinUI` |
| Strategies (auto, fluid, percent…) — desktop windows, foldables, tablets | **AppDimens.Net** | `AppDimens.Net.Sdk` (all strategies) + `AppDimens.Net.Maui` / `.Wpf` / `.WinForms` / `.WinUI` |
| .NET for Android with XML `@dimen/_16sdp` | Android bindings | `Bodenberg.AppDimens.Sdps` (sizes), `Bodenberg.AppDimens.Ssps` (text) |
| .NET for Android, code only, every strategy | Android binding | `Bodenberg.AppDimens.Dynamic` (`DimenSdp.Sdp(this, 16)` → px) |

Desktop windows are large and resizable, so with `formFactors` containing `desktop`, prefer **AppDimens.Net** with `ASdp` (layout) or `FSdp` (bounded).

## 2. Setup (required; without it metrics are zero or calls throw)

| Host | SDPS | AppDimens.Net |
|---|---|---|
| MAUI | `builder.UseAppDimensSdps()` in `MauiProgram.cs` + `AppDimensSdpsWindow.Attach(window)` in `CreateWindow` | `AppDimensMaui.AttachWindow(window)` in `App.CreateWindow`, before creating pages |
| WPF | `AppDimensWpf.Initialize(this)` **before** `InitializeComponent()` | same call, `AppDimens.Net.Wpf` |
| WinForms | `AppDimensWinForms.Initialize(this)` **after** `InitializeComponent()`; sizing inside `AppDimensWinForms.Apply(this, () => …)`; `AutoScaleMode = None` | same |
| WinUI 3 | `AppDimensWinUI.Initialize(window)` in `OnLaunched` before `Activate()` | same |
| other / tests | — | `AppDimensHost.Activate(new HostDimensScope { … })` / `FakeAppDimensContext` |

## 3. Tokens

| Policy | SDPS XAML | SDPS C# | AppDimens.Net C# | AppDimens.Net XAML |
|---|---|---|---|---|
| scaled | `{sdp:16}` `{hdp:48}` `{wdp:100}` `{ssp:14}` `{sem:12}` (MAUI; WPF `{sdps:Sdp 16}`, WinUI `{sdps:Sdp Value=16}`) | `16.Sdp()` `14.Ssp()` `120.SdpPx()` | `16.Sdp()` `48.Hdp()` `14.Ssp()` `12.Sem()` | MAUI `{ad:Sdp 16}` · WPF `{ad:Sdp 16}` (live) · WinUI `{ad:Sdp Value=16}` |
| adaptive | — | — | `16.ASdp()` (dp-only; text stays `Ssp`) | C# only |
| bounded | — | — | `24.FSdp()` | `{ad:Fsdp 24}` (MAUI) / `{ad:FSdp 24}` (WPF) |
| fraction | — | — | `50.SpaceWDp(ctx)` | `{ad:SpaceW 50}` (WPF) |
| px (WinForms, canvas) | — | `120.SdpPx()`, `14.SspPt()` | `DimenPx.ToPx(120.Sdp())`, `DimenPx.ToPt(14.Ssp())` | — |

Every XAML prefix needs its `xmlns` (put them in one merged `AppDimensImports.xaml`). MAUI XAML is evaluated at page build: for live updates on resize, set values in C# inside `RegisterConfigurationListener(...)` on the main thread. WPF markup is live.

**Precision:** SDPS markup and `R.Sdp(int)` take integers only (`normalize --rounding 1`); AppDimens.Net (`16.Sdp()` on `double`) accepts exact theme values (`--theme`).

## Intent → XAML

| Intent | MAUI | WPF / WinUI |
|---|---|---|
| `stack-v` / `stack-h` | `VerticalStackLayout Spacing="{sdp:12}"` / `HorizontalStackLayout` | `StackPanel` (+ margins) / WinUI `StackPanel Spacing` |
| `list` / `grid` / `carousel` | `CollectionView` + `LinearItemsLayout` / `GridItemsLayout Span` / `CarouselView` | `ListBox`/`ItemsRepeater` + `UniformGridLayout` / horizontal `ItemsRepeater` |
| `overlay` | `Grid` with overlapping children | `Grid` overlapping cells |
| `sizing: fill` / `hug` | `HorizontalOptions="Fill"`, `Grid` `*` columns / `Auto` | `HorizontalAlignment="Stretch"`, `*` / `Auto` |
| `sizing: ratio` | `AspectRatio` via `Image Aspect="AspectFit"` + measured height | `Viewbox` / `Image Stretch="Uniform"` |
| `divider` | `BoxView HeightRequest="1"` `<!-- ad:fixed hairline -->` | `Separator` / `Rectangle Height="1"` |
| touch target | visual size as a token + `MinimumHeightRequest="48"` on the tappable container `<!-- ad:fixed touch-min -->` | visual token + `MinHeight="40"` (Fluent) on the control |
| `adapt` | `{scaled:14, Tablet=18, Desktop=20}`, `{sdpQualifier:16, Qualified=20, QualifierType=SmallWidth, Threshold=600}` (SDPS), `VisualStateManager` adaptive triggers | `VisualStateManager` + `AdaptiveTrigger MinWindowWidth` |

## Lint (what `appdimens-kit lint` flags here)

- XAML `Padding|Margin|Spacing|FontSize|WidthRequest|HeightRequest|CornerRadius|Width|Height="16"` numeric literals > 2 → markup extensions.
- Mixing SDPS (`AppDimens.Maui`, `AppDimens.Sdps.*`) and AppDimens.Net (`AppDimens.Net.*`) namespaces in one file.

## Verify

`dotnet build`; run the window at a 300-wide size, the design width and a large/desktop size; check resize behaviour (MAUI: listener re-applies values).
