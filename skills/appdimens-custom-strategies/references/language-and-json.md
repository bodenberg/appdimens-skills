# Custom strategies — text language and JSON format

Identical on every AppDimens platform (Android, KMP, Games + Unity, Apple, Flutter, React Native, Web, .NET): same parser, same variables, same numbers (a shared 540-case fixture). The JSON schema is [`schemas/custom-strategy.schema.json`](../../../schemas/custom-strategy.schema.json).

## Where text formulas go

| Where | JSON | Returns | Extra variables |
|---|---|---|---|
| Curve | `"curve": {"type": "expression", "expression": "…"}` | the **factor** (once per window) | `ratio axis ref refWidth refHeight` |
| Formula | `"formula": "…"` | the **final value** | the curve variables + `base scaled factor` |

`scalingFormula("…")` (and the inline `16.cdp("…")`, `cdp(16, '…')`, `16.Cdp("…")`, `16.cdpFormula('…')`) builds a strategy whose only setting is a formula. Without an id these are shared per text (up to 256 texts).

## Language

| | |
|---|---|
| Numbers | `16`, `0.8`, `.5`, `1.5e3` (always `.` as decimal separator) |
| Arithmetic | `+ - * / %` and `^` (power). `%` keeps the sign of the dividend |
| Comparison | `== != < <= > >=` (result 1 or 0) |
| Logic | `&& \|\| !` (non-zero is true) |
| Conditional | `cond ? a : b` |
| Constants | `pi`, `e`, `true` (1), `false` (0) |

Precedence, loosest to tightest: `? :` · `||` · `&&` · comparisons · `+ -` · `* / %` · unary `- + !` · `^`. `^` is right-associative (`2 ^ 3 ^ 2` = 512); unary minus binds looser than `^` (`-2 ^ 2` = −4).

| Function | Result |
|---|---|
| `min(a, b, …)` · `max(a, b, …)` | smallest · largest argument |
| `clamp(x, lo, hi)` | `x` limited to `[lo, hi]` |
| `pow(x, y)` · `sqrt(x)` · `exp(x)` | power · square root · eˣ |
| `ln(x)` = `log(x)` · `log10(x)` · `log2(x)` | logarithms |
| `abs(x)` · `sign(x)` | absolute value · −1, 0 or 1 |
| `floor(x)` · `ceil(x)` · `round(x)` | rounding (`round` is half up: `floor(x + 0.5)`) |
| `lerp(a, b, t)` · `step(edge, x)` · `smoothstep(e0, e1, x)` | blending |

| Variables | Meaning |
|---|---|
| `sw` `width` `height` `shortSide` `longSide` `diagonal` `perimeter` | window measures (dp / pt / CSS px) |
| `aspectRatio` `density` `fontScale` | long/short side · density · user font scale |
| `phone` `tablet` `desktop` `tv` `watch` `car` `vr` · `landscape` `portrait` `multiWindow` | flags (1/0) |
| `ratio` | axis / reference (defaults: `sw / 300`, the `sdp` ratio) |
| `axis` · `ref` · `refWidth` · `refHeight` | axis value · reference value · reference frame |
| `base` · `scaled` · `factor` | formulas only: the value passed · `base × factor` after value bounds · the strategy factor |

Code one-liners expose the same names on their scope (`width`, `s.width`, `s.Width`, `({ width })`), plus `device` and `screen`; `axis`/`ref`/`refWidth`/`refHeight`/`scaled`/`factor` are text-only.

**Fast path:** `base`, `base * E` or `E * base` where `E` reads no `base`/`scaled`/`factor` is evaluated once per window (one multiply per value, bit-identical). `base * sw / 360` parses as `(base * sw) / 360` — write `base * (sw / 360)`. `base + 2` and `round(base * ratio)` are per value (cached).

Parse errors fail when the strategy is created, with the position: `Invalid expression at 7: unknown variable 'sww' (allowed: …) in "base * sww"`, `'clamp' takes 3 argument(s), got 2`. In JSON the path is prefixed (`brand.rules[0].set.curve.expression: …`).

## Document

```json
{
  "$schema": "https://github.com/bodenberg/appdimens-skills/schemas/custom-strategy.schema.json",
  "version": 1,
  "default": "brand",
  "strategies": [
    { "id": "brand",
      "reference": { "width": 360, "height": 640 },
      "curve": { "type": "power", "exponent": 0.8 },
      "clamp": { "min": 0.85, "max": 1.6 },
      "fontScale": { "max": 1.3 },
      "rules": [
        { "name": "large", "when": { "device": ["tablet", "desktop"] }, "set": { "curve": { "type": "logarithmic", "k": 0.4 } } },
        { "when": { "smallestWidth": { "min": 600 }, "orientation": "landscape" }, "set": { "multiplier": 0.9 } }
      ] },
    { "id": "brandText", "extends": "brand", "valueClamp": { "min": 10, "max": 32 } },
    { "id": "hud", "formula": "base * pow(sw / 360, 0.8)" }
  ]
}
```

| Field | Example | Notes |
|---|---|---|
| `id` | `"brand"` | required, unique |
| `extends` | `"power"` | a strategy of the document, a registered one, a built-in (`scaled power logarithmic interpolated diagonal perimeter fixed`) or a preset (`tabletFriendly compactFirst tvSafe wearable gameHud readableText`); parent rules first |
| `reference` | `{"width": 360, "height": 640}` | design frame; default 300 × 533 |
| `axis` | `"smallestWidth"` | `smallestWidth width height min max diagonal perimeter` |
| `curve` | `"linear"` or `{"type": …}` | below |
| `multiplier` | `0.9` | |
| `clamp` | `{"min": 0.85, "max": 1.6}` | factor bounds; `null` clears inherited |
| `valueClamp` | `{"min": 10, "max": 32}` | value bounds, **≥ 0**, on the magnitude; `null` clears |
| `aspectRatio` · `sensitivity` | `true` / `{"enabled": true, "sensitivity": 0.004}` · `0.004` | factor × `1 + k·ln(AR / 1.78)`, default k = 0.08 / 30 |
| `fontScale` | `"follow"` · `"ignore"` · `{"max": 1.3}` | `csp` policy |
| `ignoreMultiWindow` | `true` | split screen: factor 1, formulas skipped, value bounds kept |
| `formula` | `"max(scaled, base)"` | per-value text formula; `null` clears |
| `rules` | `[{"name": …, "when": {…}, "set": {…}}]` | `set` takes any field except `id`, `extends`, `rules` |

| Curve | JSON | Factor |
|---|---|---|
| Linear | `"linear"` | `r` |
| Power | `{"type": "power", "exponent": 0.8}` | `r^e` (built-in power: 0.75) |
| Logarithmic | `{"type": "logarithmic", "k": 0.4}` | `1 + k·ln(r)` |
| Interpolated | `{"type": "interpolated", "t": 0.5}` | `1 + (r − 1)·t` |
| Constant | `{"type": "constant", "factor": 1}` | `f` (1 = plain dp) |
| Breakpoints | `{"type": "breakpoints", "points": [{"at": 360, "factor": 1}, {"at": 600, "factor": 1.25}]}` | piecewise linear over the **absolute** axis value, clamped at the ends |
| Expression | `{"type": "expression", "expression": "pow(ratio, 0.8)"}` | your text formula |

| `when` key | Example |
|---|---|
| `device` | `"tv"` or `["tablet", "desktop"]` |
| `orientation` | `"landscape"` / `"portrait"` |
| `smallestWidth` · `width` · `height` · `aspectRatio` | `{"min": 600, "max": 840}` (`min <= v < max`; must be an object) |
| `multiWindow` | `true` |

An omitted `when` matches every screen. All matching rules apply in declaration order; later ones override earlier fields.

## Validation (strict, atomic)

Any error rejects the whole document; nothing is registered and the previous default stays.

| Input | Message |
|---|---|
| `"curve": {"type": "cubic"}` | `brand.curve.type 'cubic' is not one of linear, power, logarithmic, interpolated, constant, breakpoints, expression` |
| `"when": "tablet"` | `brand.rules[0].when must be an object` |
| `"width": 600` in `when` | `brand.rules[0].when.width must be an object with min/max` |
| `"ignoreMultiWindow": "true"` | `brand.ignoreMultiWindow must be a boolean` |
| `"valueClamp": {"max": -1}` | `maxValue must be >= 0` |
| `"clamp": {"min": 2, "max": 1}` | `minFactor must be <= maxFactor` |
| `"formula": "base * sww"` | `brand.formula: Invalid expression at 7: unknown variable 'sww' …` |
| `"default": "missing"` | `No scaling strategy 'missing'. Registered: […]` |
| duplicate id · cycle · unknown parent | `Duplicate strategy id 'brand'` · `Cyclic 'extends': …` · `'x' extends unknown strategy 'y'` |

The exception type is the platform's own (see [platforms.md](platforms.md)). Run `appdimens-kit custom check <file>` before shipping a file.
