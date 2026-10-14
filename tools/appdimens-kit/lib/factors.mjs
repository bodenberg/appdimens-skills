// Scale factors shared by every AppDimens library (reference 300 x 533).
// Formulas from the hub DOCS/PLATFORMS.md and DOCS/THEORY.md.

export const REFERENCE_WIDTH = 300;

export const policies = {
  scaled: (d) => d / REFERENCE_WIDTH,
  auto: (d) => (d <= 480 ? d / REFERENCE_WIDTH : 1.6 + 0.4 * Math.log(1 + (d - 480) / REFERENCE_WIDTH)),
  fluid: (d) => {
    const t = (d - 320) / (768 - 320);
    return Math.max(Math.min((1 - t) * 0.8 + t * 1.2, 1.2), 0.8);
  },
};

// Aliases used by the intent model.
policies.adaptive = policies.auto;
policies.bounded = policies.fluid;

export function factor(policy, smallestSide) {
  const fn = policies[policy];
  if (!fn) throw new Error(`Unknown policy "${policy}". Use one of: scaled, auto, fluid.`);
  if (!(smallestSide > 0)) throw new Error('Frame size must be a positive number.');
  return fn(smallestSide);
}

export function roundTo(value, step) {
  return Math.round(value / step) * step;
}

/**
 * base = design / factor(policy, smallestSide), rounded to `rounding`.
 * `result` is what the base value resolves to on a device the size of the frame.
 */
export function normalize(values, { frame, height, policy, rounding = 0.5 }) {
  const smallest = height ? Math.min(frame, height) : frame;
  const f = factor(policy, smallest);
  return {
    smallestSide: smallest,
    policy,
    factor: f,
    rounding,
    rows: values.map((design) => {
      const base = roundTo(design / f, rounding);
      return { design, base, resultOnFrame: base * f };
    }),
  };
}
