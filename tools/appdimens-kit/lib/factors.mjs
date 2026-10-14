// Scale factors of every AppDimens strategy (reference canvas 300 × 533).
// Source: hub DOCS/THEORY.md §4–5 and appdimens-dynamic DimenMetrics / DesignScaleConstants.
//
// A "screen" is { width, height, dpi?, fontScale? } in logical units (dp / pt / CSS px).

import { readFileSync } from 'node:fs';

export const W0 = 300; // reference shorter side
export const H0 = 533; // reference longer side
export const D0 = 611.6305; // family-canonical diagonal (do not "fix" to the true sqrt)
export const P0 = 833; // reference perimeter sum
export const RHO0 = 1.78; // reference aspect ratio
const EPS = 0.1 / 30; // default adjustment scale (= 1/300)
const KAPPA = 0.08 / 30; // default aspect-ratio sensitivity

export const STRATEGIES = ['scaled', 'auto', 'percent', 'power', 'fluid', 'interpolated', 'logarithmic', 'diagonal', 'perimeter', 'fit', 'fill', 'density'];
const ALIASES = { adaptive: 'auto', bounded: 'fluid' };
export const resolveStrategy = (s) => ALIASES[s] || s;

/** Token prefix per strategy (`16.<prefix>sdp`). */
export const PREFIX = { scaled: '', auto: 'a', percent: 'p', power: 'pw', fluid: 'f', interpolated: 'i', logarithmic: 'log', diagonal: 'dg', perimeter: 'pr', fit: 'ft', fill: 'fl', density: 'd' };

/** Strategies whose kernel reads one axis (s/h/w); the others read the whole screen. */
export const AXIS_STRATEGIES = new Set(['scaled', 'auto', 'percent', 'power', 'fluid', 'interpolated', 'logarithmic']);

const smin = (s) => Math.min(s.width, s.height ?? s.width);
const smax = (s) => Math.max(s.width, s.height ?? s.width);

/** Axis length a token family reads: s = smallest side (sdp/ssp), h = height (hdp/hsp), w = width (wdp/wsp). */
export function axisLength(screen, axis = 's') {
  if (axis === 'h') {
    if (!screen.height) throw new Error('axis h (hdp/hsp) needs the base screen height.');
    return screen.height;
  }
  if (axis === 'w') return screen.width;
  return smin(screen);
}

const kernels = {
  scaled: (d) => d / W0,
  percent: (d) => d / W0, // same kernel as scaled; spaceW/H are literal percentages (see percentOf)
  auto: (d) => (d <= 480 ? d / W0 : 1.6 + 0.4 * Math.log(1 + (d - 480) / W0)),
  power: (d) => Math.pow(d / W0, 0.75),
  fluid: (d) => {
    const t = (d - 320) / (768 - 320);
    return Math.max(Math.min((1 - t) * 0.8 + t * 1.2, 1.2), 0.8);
  },
  interpolated: (d) => 0.5 + 0.5 * (d / W0),
  logarithmic: (d) => (d > W0 ? 1 + 0.4 * Math.log(d / W0) : 1 - 0.4 * Math.log(W0 / d)),
  diagonal: (_, s) => Math.sqrt(smin(s) ** 2 + smax(s) ** 2) / D0,
  perimeter: (_, s) => (smin(s) + smax(s)) / P0,
  fill: (_, s) => Math.max(smin(s) / W0, smax(s) / H0),
  fit: (_, s) => Math.min(smin(s) / W0, smax(s) / H0),
  density: (_, s) => {
    if (!(s.dpi > 0)) throw new Error('density strategy needs the base screen dpi (e.g. 420).');
    return s.dpi / 160;
  },
};

/** ln(ρ/1.78), ρ = longer / shorter side. 0 at 16:9-ish phones, > 0 on tall phones, < 0 on tablets. */
export const aspectLog = (s) => Math.log(smax(s) / smin(s) / RHO0);

/**
 * Multiplier of one token on one screen.
 * opts.aspect  → the `a` suffix (sdpa…): scaled uses 1 + (sw − 300)(1/300 + κ·L); satellites × (1 + κ·L).
 * opts.text    → sp kind (ssp…): × fontScale (the base screen is assumed to be fontScale 1).
 */
export function factorFor(strategy, screen, { axis = 's', aspect = false, text = false, k = KAPPA } = {}) {
  const s = resolveStrategy(strategy);
  const kernel = kernels[s];
  if (!kernel) throw new Error(`Unknown strategy "${strategy}". Use one of: ${STRATEGIES.join(', ')}.`);
  if (!(screen?.width > 0)) throw new Error('Screen width must be a positive number.');
  const d = AXIS_STRATEGIES.has(s) ? axisLength(screen, axis) : smin(screen);
  let f;
  if (aspect && (s === 'scaled' || s === 'percent')) {
    if (!screen.height) throw new Error('the a suffix needs the base screen height (aspect ratio).');
    f = 1 + (d - W0) * (EPS + k * aspectLog(screen));
  } else {
    f = kernel(d, screen);
    if (aspect) {
      if (!screen.height) throw new Error('the a suffix needs the base screen height (aspect ratio).');
      f *= 1 + k * aspectLog(screen);
    }
  }
  if (text) f *= screen.fontScale ?? 1;
  return f;
}

// Android XML (appdimens-sdps / appdimens-ssps) ships pre-computed resources in discrete
// values-sw<N>dp / -h<N>dp / -w<N>dp folders; at runtime Android picks the largest bucket
// <= the screen's axis, so the XML factor is floorBucket / 300 (default `values` = 300 base).
let buckets;
export function xmlBucket(length, axis = 's') {
  buckets ??= JSON.parse(readFileSync(new URL('./xml-buckets.json', import.meta.url), 'utf8'));
  const list = buckets[axis === 'h' ? 'h' : axis === 'w' ? 'w' : 'sw'];
  let best = W0;
  for (const b of list) if (b <= length) best = b;
  return length < list[0] ? W0 : best;
}

/** Backwards-compatible single-axis helper: factor(policy, smallestSide). */
export function factor(policy, smallestSide) {
  return factorFor(policy, { width: smallestSide, height: smallestSide * (H0 / W0) });
}

export function roundTo(value, step) {
  return Math.round(value / step) * step;
}

/**
 * Converts values measured on the base screen (design values, or dp/pt tuned by hand) into
 * AppDimens base values that resolve to the same size on that screen:
 *   base = (value ÷ density) ÷ factor(strategy, base screen)
 */
export function normalize(values, { frame, height, runtimeHeight, policy = 'scaled', strategy, rounding = 0.5, axis = 's', density = 1, aspect = false, dpi, fontScale, xml = false } = {}) {
  const s = resolveStrategy(strategy || policy);
  // runtimeHeight = the height the platform reports to the library (may exclude system bars);
  // it replaces the frame height for every kernel that reads the height.
  const h = runtimeHeight ? runtimeHeight / density : height ? height / density : undefined;
  const screen = { width: frame / density, height: h, dpi, fontScale };
  if (xml && s !== 'scaled') throw new Error('Android XML resources only exist for the scaled strategy.');
  const bucket = xml ? xmlBucket(axisLength(screen, axis), axis) : undefined;
  const f = xml ? bucket / W0 : factorFor(s, screen, { axis, aspect });
  return {
    baseDevice: { width: screen.width, height: screen.height, frameHeight: height ? height / density : undefined },
    strategy: s,
    policy: s,
    axis: AXIS_STRATEGIES.has(s) ? axis : 'screen',
    axisLength: AXIS_STRATEGIES.has(s) ? axisLength(screen, axis) : smin(screen),
    xmlBucket: bucket,
    smallestSide: smin(screen),
    aspect,
    aspectRatio: screen.height ? smax(screen) / smin(screen) : undefined,
    factor: f,
    density,
    rounding,
    rows: values.map((raw) => {
      const design = raw / density;
      const base = roundTo(design / f, rounding);
      return { input: raw, design, base, resultOnFrame: base * f };
    }),
  };
}

/** Literal-percentage tokens (spaceW / spaceH / spaceSw): percent = value ÷ axis × 100. */
export function percentOf(values, { frame, height, of = 'w', density = 1, rounding = 0.5 }) {
  const screen = { width: frame / density, height: height ? height / density : undefined };
  const axisValue = of === 'h' ? axisLength(screen, 'h') : of === 'sw' ? smin(screen) : screen.width;
  return values.map((raw) => {
    const design = raw / density;
    const percent = roundTo((design / axisValue) * 100, rounding);
    return { input: raw, design, percent, resultOnFrame: (percent / 100) * axisValue };
  });
}

/**
 * Theme tokens keep full precision and the design number in their name, so sums and
 * ratios survive (space8 + space8 == space16) and the base can be changed in one place.
 */
export function themeTokens(values, opts) {
  const exact = normalize(values, { ...opts, rounding: opts.xml ? 1 : 0.01 });
  return exact.rows.map((r) => ({ name: r.design, base: r.base, resultOnFrame: r.resultOnFrame }));
}

/**
 * Existing tablet overrides (values-sw600dp, `if (isTablet)`) were written because plain
 * dp did not grow. After migrating, the strategy already grows: compare what the override
 * did with what the strategy will do on the same tablet.
 */
export function compareOverride({ phoneValue, tabletValue, phone, tablet, strategy = 'scaled', axis = 's', xml = false, tolerance = 0.1 }) {
  const fPhone = xml ? xmlBucket(axisLength(phone, axis), axis) / W0 : factorFor(strategy, phone, { axis });
  const fTablet = xml ? xmlBucket(axisLength(tablet, axis), axis) / W0 : factorFor(strategy, tablet, { axis });
  const base = phoneValue / fPhone;
  const strategyOnTablet = base * fTablet;
  const ratio = tabletValue / strategyOnTablet;
  const verdict = Math.abs(ratio - 1) <= tolerance ? 'delete-override' : 'keep-as-adapt';
  return { base, strategyOnTablet, override: tabletValue, ratio, verdict, adaptBase: tabletValue / fTablet };
}
