---
name: appdimens-react-native
description: Implement layout intent in React Native (iOS, Android, Expo, RN Web) with appdimens-react-native — sdp(16), ssp(16), createDimenStyles, useDimenMetrics, strategy sub-paths (appdimens-react-native/auto, /fluid, /percent, /resize). Use when writing or editing RN components/styles in an AppDimens project, installing the package, or mapping a design to View/FlatList/ScrollView.
---

# React Native — `appdimens-react-native` 3.2.0

Pure JS (no native module, no pods; works with Expo, New Architecture, Hermes, RN Web). Decide intent first with `appdimens-layout-intent`. Upstream skill: `bodenberg/appdimens-react-native/skills/SKILL.md`.

## Install

```bash
npm install appdimens-react-native
```

Strategies are sub-paths, so you only bundle what you import: `appdimens-react-native/auto`, `/fluid`, `/percent`, `/power`, `/interpolated`, `/logarithmic`, `/diagonal`, `/perimeter`, `/fit`, `/fill`, `/density`, `/resize`, `/units`.

## Reactivity (the RN-specific rule)

Values read the current window snapshot. A component re-renders on rotation/resize/font-scale only if it subscribes:

```tsx
import { createDimenStyles, sdp, ssp } from 'appdimens-react-native';

const useStyles = createDimenStyles(() => ({
  card: { padding: sdp(16), borderRadius: sdp(12), gap: sdp(8) },
  title: { fontSize: ssp(18), fontWeight: '700' },
}));

function Card() {
  const styles = useStyles();          // subscribes + returns the cached StyleSheet
  return <View style={styles.card}><Text style={styles.title}>Title</Text></View>;
}
```

Prefer `createDimenStyles` (one computation per window snapshot). Inline `sdp(16)` in render requires `useDimenMetrics()` in that component. Token sheets: `DimenStyleSheet.create({ card: { padding: '16sdp' } })`.

## Tokens

| Policy | Import | Token |
|---|---|---|
| scaled | `appdimens-react-native` | `sdp(16)` `hdp(48)` `wdp(100)` `ssp(16)` `sem(16)` |
| adaptive | `appdimens-react-native/auto` | `asdp(16)` `assp(16)` |
| bounded | `appdimens-react-native/fluid` | `fsdp(16)` `fssp(16)` |
| fraction | `appdimens-react-native/percent` | `spaceW(50)` `psdp(16)` |
| fit-text | `appdimens-react-native/resize` | `<AutoResizeText>`, `useAutoResizeTextSp` |

RN styles are in dp. `*Px` functions (`sdpPx`) are only for Skia/native modules/`PixelRatio` math, **never** in `fontSize` (font scale would apply twice).

## Intent → components

| Intent | React Native |
|---|---|
| `screen` + `scroll-v` | `<ScrollView contentContainerStyle={{ padding: sdp(16), gap: sdp(16) }}>` |
| `stack-v` / `stack-h` | `<View style={{ gap: sdp(12) }}>` / `flexDirection: 'row'` |
| `overlay` | `position: 'absolute'` **only** for true overlays (badge, FAB), with `top/right` from tokens |
| `list` | `<FlatList contentContainerStyle={{ padding: sdp(16) }} ItemSeparatorComponent={…} />` |
| `grid` | `<FlatList numColumns={cols} columnWrapperStyle={{ gap: sdp(12) }} />` (`cols` from `adapt`) |
| `carousel` | `<FlatList horizontal snapToInterval={…} decelerationRate="fast" />` |
| `sizing: fill` / `hug` | `flex: 1` / `alignSelf: 'stretch'` · default |
| `sizing: ratio` | `aspectRatio: 4 / 3` with `width: '100%'` |
| `sizing: clamp` | `minWidth: 280, maxWidth: 600` `// ad:fixed clamp` |
| `truncate` | `<Text numberOfLines={2} ellipsizeMode="tail">` |
| `divider` | `height: StyleSheet.hairlineWidth` |
| touch target | visual size as a token + hit area with `hitSlop` (or a `Pressable` wrapper with `minHeight: 48` Android / `44` iOS `// ad:fixed touch-min`) — never clamp the visual |
| `adapt` | `useWindowDimensions()` for structure; `sdpQualifier`, `sdpScreen`, `scaledDp(16).screen(…)` for values |

Fold/flip, car, watch and desk modes come from the app via `<AppDimensProvider uiModeType={…}>`; TV is detected automatically.

## Custom strategies (`appdimens-react-native/custom`, unreleased)

Only when `appdimens.config.json` declares `customStrategies` (or the user asks for their own strategy). Use the declared ids, never invent one; see the decision table → *Project-defined strategies*. Free-form formulas (`"type": "expression"`, `"formula"`) live in the JSON file.

```tsx
import {loadCustomStrategies, requireCustomStrategy, cdp, csp, useCustomStrategy, CustomStrategyProvider} from 'appdimens-react-native/custom';

loadCustomStrategies(require('./appdimens-strategies.json'));   // once, at startup
const brand = requireCustomStrategy('brand');
const s = useCustomStrategy(brand);                              // re-renders on window changes
<View style={{padding: s.dp(16)}}><Text style={{fontSize: s.sp(14)}}>Hi</Text></View>
```

`csp` returns a value for `fontSize`: RN applies the font scale itself, and the strategy policy is pre-compensated. Never put a `Px` value in `fontSize`.

## Lint (what `appdimens-kit lint` flags here)

- Numeric style literals > 2 for `padding*`, `margin*`, `gap`, `width`, `height`, `borderRadius`, `fontSize`, `lineHeight`, `top/left/…` → tokens.
- `fontSize: sdpPx(…)` / any `*Px(` in `fontSize`.
- Strategy function without its sub-path import (`asdp(` without `appdimens-react-native/auto`).

## Verify

App typecheck/tests; Storybook/tests with `DimenCache.setMetricsOverride({ width: 300, height: 533, density: 3, fontScale: 1 })` (reset with `null`), plus the design width and a tablet width.
