# Layout Intent Model

Every element gets an intent before it gets a unit. The JSON form is validated by `schemas/layout-intent.schema.json`; in conversation, the intent sheet table is enough.

```json
{
  "node": "Home/Products",
  "role": "grid",
  "sizing": { "width": "fill", "height": "hug" },
  "overflow": "none",
  "repetition": { "itemNode": "ProductCard", "minItemWidth": 160 },
  "scale": { "spacing": "adaptive", "text": "adaptive", "radius": "adaptive", "border": "fixed" },
  "adapt": [{ "when": "sw600", "set": { "columns": 3 } }],
  "confidence": 0.82,
  "evidence": ["4 siblings are instances of ProductCard", "Auto Layout wrap = true"],
  "source": "inferred"
}
```

## Axis 1 — `role`

| Role | Meaning | Typical native target |
|---|---|---|
| `screen` | top-level route/page | Scaffold / NavigationStack page / Scaffold / Screen component / `<main>` |
| `section` | grouped block inside a screen | Column/VStack/Column/View/`<section>` |
| `stack-v` / `stack-h` | plain linear group (Auto Layout vertical/horizontal) | Column·Row / VStack·HStack / Column·Row / flexDirection / flex |
| `overlay` | layered children (badge on avatar, FAB, scrim) | Box / ZStack / Stack / absolute + zIndex / grid-area |
| `list` | vertical repetition of same-shaped items, unbounded | LazyColumn / List·LazyVStack / ListView.builder / FlatList / list markup |
| `grid` | 2-D repetition | LazyVerticalGrid / LazyVGrid / GridView / FlatList numColumns / CSS grid |
| `carousel` | horizontal repetition wider than the viewport | LazyRow·HorizontalPager / ScrollView(.horizontal) / PageView·ListView(horizontal) / FlatList horizontal / overflow-x + scroll-snap |
| `card` | bounded surface with its own padding/radius | Card / custom view / Card / View / `<article>` |
| `button`, `icon-button`, `chip`, `toggle` | interactive control | the design-system or platform component |
| `input` | text field, select, search | TextField / TextField / TextField / TextInput / `<input>` |
| `nav` | app bar, tab bar, bottom nav, rail, drawer | platform component (scale content, not chrome) |
| `text` | heading/body/caption/label | Text with a typography token |
| `media` | image, video, illustration, map | Image with aspectRatio |
| `icon` | glyph | Icon |
| `divider` | line separator | Divider / Divider / Divider / hairline View / `<hr>` |
| `spacer` | empty space carrying a gap | Spacer or parent gap — prefer the parent's gap |
| `hud`, `world` | game UI layer / game world objects | see `appdimens-games` |

## Axis 2 — `sizing` (per axis: `width`, `height`)

| Value | Meaning | Never implement as |
|---|---|---|
| `hug` | wraps content | a fixed number |
| `fill` | takes available space (Auto Layout "Fill container", `weight`, `flex: 1`) | `N.wdp`, `100%` of the screen when the parent is not the screen |
| `fixed` | a designed size that should scale with the policy | — (this is where tokens go) |
| `ratio` | derived from the other axis (`aspectRatio`) | `hdp` |
| `clamp` | grows between `min` and `max` (`{ "min": 280, "max": 600 }`) | unbounded scaling |
| `fraction` | literal share of the window (`{ "of": "width", "percent": 50 }`) | `wdp` (that is proportional, not a fraction) |

## Axis 3 — `overflow`

`none` · `scroll-v` · `scroll-h` · `wrap` (flow to next line) · `truncate` (ellipsis, give `maxLines`) · `clip` · `fit-text` (shrink text to fit → resize API, not a scale strategy).

## Axis 4 — `scale` (policy per property class)

| Policy | Strategy / token family | Grows… |
|---|---|---|
| `scaled` | `sdp` / `ssp` | proportionally with the smallest side (÷300) |
| `adaptive` | `asdp` / `assp` | proportionally up to 480, then log-damped |
| `bounded` | `fsdp` / `fssp` | only within 0.8×–1.2× across 320–768 |
| `width` / `height` | `wdp` / `hdp` (`wsp`/`hsp` for text) | with one explicit axis |
| `fraction` | percent `spaceW` / `spaceH` / `spaceSw`, `psdp` | as a literal % of the window |
| `fit` / `fill` | `ftsdp` / `flsdp` | contain / cover (canvas, games, hero art) |
| `damped` | `logsdp`, `pwsdp`, `isdp` | slower than linear (TV, dashboards) — needs a visual reason |
| `physical` | units: `mm`, `cm`, `inch` | not at all — real-world size |
| `fixed` | plain `dp` / `pt` / CSS px | not at all (hairlines, elevation, platform minimums) |
| `platform` | leave to the system component | as the OS decides |
| `fit-text` | resize API (`autoResizeTextSp`, `AutoResizeText`, `autoResizeText(el, …)`) | largest step that fits the box |

## Axis 5 — `adapt`

Discrete changes at breakpoints: column count, layout swap (list → two-pane), visibility, alternate value. Express `when` as an AppDimens qualifier so every platform can implement it: `sw600`, `w840`, `h480`, `landscape`, `portrait`, `tv`, `car`, `watch`, `fold-open`, `fold-half`, `desk`. Values come from `appdimens.config.json → breakpoints`, or from the design (a separate tablet frame), or from the user. Never invent them. Platform skills map these to `.screen()` builders / `sdpQualifier` / `@sw600` conditions / window size classes.

## Inference heuristics (use when nothing is annotated)

Score each candidate; keep the evidence strings for the intent sheet.

| Signal | Suggests | Weight |
|---|---|---|
| ≥ 3 siblings that are instances of the same component (or identical structure) | `list` (vertical) / `grid` (wrap or 2-D) / `carousel` (horizontal) | +0.5 |
| Content extent > parent viewport on one axis | `scroll-v` / `scroll-h`; horizontal + repeated → `carousel` | +0.3 |
| Auto Layout wrap on | `grid` or chips (`wrap`) | +0.3 |
| Frame taller than a device viewport with pinned header/footer | `screen` + `scroll-v` | +0.3 |
| Child "Fill container" / layout grow | `sizing: fill` | +0.4 |
| Child "Hug contents" | `sizing: hug` | +0.4 |
| Element ≤ 1 unit thick spanning the parent | `divider`, policy `fixed` | +0.6 |
| Image with locked proportions | `media`, `height: ratio` | +0.4 |
| Absolute-positioned child overlapping a sibling corner | `overlay` (badge) | +0.4 |
| Absolute positioning everywhere, no Auto Layout | low confidence for the whole frame → ask or rebuild as stacks | −0.3 |
| Name matches design-system component (`Button/Primary`) | that component's role | +0.5 |
| Separate frames per device width (Mobile/Tablet) | `adapt` rules from the differences | +0.4 |

Clamp to 0–1. Same-confidence ties → prefer the simpler role (`stack-v` over `list` for ≤ 3 static items).

## Annotations designers can add (no plugin required)

Append tags to layer names; they override inference (`source: "annotated"`, confidence 1.0):

`[screen] [list] [grid] [carousel] [overlay] [card] [nav]` · `[fill] [hug] [fixed] [ratio]` · `[scroll] [scroll-h] [wrap] [truncate:2] [fit-text]` · `[scaled] [adaptive] [bounded] [fixed-scale] [fraction:50w] [platform]` · `[sw600:cols=3]`.

Example: `Products [grid] [fill] [sw600:cols=3]`, `Divider [fixed-scale]`, `Hero [fraction:40h]`.

## Modes

The same model is used in three directions:

- **Read a design** (Figma, screenshot, spec → code): infer intent from the design → `appdimens-design-to-code`.
- **Claude Design screens** (HTML/React/CSS → app or new project): read intent from DOM/CSS → `appdimens-claude-design`.
- **Edit** (existing screens → AppDimens): recover intent from the code and keep the look on its base screen → `appdimens-code-edit`.
- **Create** (brief → new screens in code): state the base screen you design for, then build from explicit intent → `appdimens-new-screen`.
