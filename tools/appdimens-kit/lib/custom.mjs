// Custom scaling strategies (schemas/custom-strategy.schema.json): load, check, resolve, explain.
// The math comes from lib/custom-engine.mjs, generated from the webdimens engine, so the numbers
// are the ones every AppDimens platform produces (shared 540-case parity fixture).
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { BUILT_IN_SPECS, PRESET_SPECS, DEFAULT_CONFIG, FORMULA_VARIABLES, ScalingExpression, configFromSpec, isValueDependent, parseStrategiesDocument, resolveScaling, screenSnapshot } from './custom-engine.mjs';
import { loadSchema, validate } from './schema.mjs';

const KNOWN = { ...BUILT_IN_SPECS, ...PRESET_SPECS };
const builtInCache = new Map();
/** Config of a built-in (scaled, power…) or preset (tabletFriendly…), the parents `extends` may name. */
function builtIn(id) {
  if (!KNOWN[id]) return undefined;
  if (!builtInCache.has(id)) builtInCache.set(id, configFromSpec(KNOWN[id], DEFAULT_CONFIG, id));
  return builtInCache.get(id);
}

export const CUSTOM_PREFIX = 'custom:';
export const isCustom = (strategy) => typeof strategy === 'string' && strategy.startsWith(CUSTOM_PREFIX);

/**
 * Structural errors for a strategies document: [{ path, message }]. Picks the matching form
 * (document / array / single strategy) first so errors point at the exact field.
 */
export function schemaErrors(data) {
  const schema = loadSchema('custom-strategy.schema.json');
  const strategy = { ...schema.$defs.strategy, $defs: schema.$defs };
  const branch = Array.isArray(data)
    ? { type: 'array', minItems: 1, items: { $ref: '#/$defs/strategy' }, $defs: schema.$defs }
    : data && typeof data === 'object' && 'strategies' in data
      ? { ...schema.oneOf[0], $defs: schema.$defs }
      : strategy;
  return validate(branch, data);
}

/**
 * Parses a strategies document (text or object). Returns { configs: Map, defaultId, errors }:
 * schema errors first, then the engine's semantic errors (unknown parents, cycles, invalid
 * expressions with their JSON path, crossed bounds…).
 */
export function checkStrategies(input) {
  let data = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch (e) {
      return { configs: new Map(), errors: [{ path: '/', message: `not valid JSON: ${e.message}` }] };
    }
  }
  const errors = schemaErrors(data);
  if (errors.length) return { configs: new Map(), errors };
  try {
    const { configs, defaultId } = parseStrategiesDocument(data, builtIn);
    if (defaultId !== undefined && !configs.has(defaultId) && !builtIn(defaultId))
      return { configs, defaultId, errors: [{ path: '/default', message: `"${defaultId}" is not a strategy of this document, a built-in or a preset` }] };
    return { configs, defaultId, errors: [] };
  } catch (e) {
    return { configs: new Map(), errors: [{ path: '/', message: e.message }] };
  }
}

/** Id under which `--formula "<text>"` is resolved (see formulaConfigs). */
export const FORMULA_ID = 'formula';

/**
 * The simplest custom strategy, as on every platform's `scalingFormula("…")`: the default config
 * plus the per-value text formula (the formula IS the value; `base` = the value passed).
 * Returns a Map { formula → config } usable wherever project configs are; parse errors throw
 * with the parser's own message ("unknown variable 'sww'" with the position).
 */
export function formulaConfigs(text) {
  const cfg = Object.freeze({ ...DEFAULT_CONFIG, formula: ScalingExpression.parse(String(text), FORMULA_VARIABLES) });
  return new Map([[FORMULA_ID, cfg]]);
}

/** True when results depend on the value itself (value bounds, transform, a formula not shaped `base * (…)`). */
export { isValueDependent };

/** Reads `file` (relative paths against `baseDir`). Returns checkStrategies(…) plus { file }. */
export function loadStrategiesFile(file, baseDir = process.cwd()) {
  const path = resolve(baseDir, file);
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    return { file: path, configs: new Map(), errors: [{ path: '/', message: `cannot read: ${e.message}` }] };
  }
  return { file: path, ...checkStrategies(text) };
}

/** Strategies declared by appdimens.config.json (`customStrategies.file`), or null. */
export function projectStrategies(config, configPath) {
  const file = config?.customStrategies?.file;
  if (!file) return null;
  return loadStrategiesFile(file, configPath ? dirname(configPath) : process.cwd());
}

/** The engine config for `custom:<id>` (or a bare id); built-ins and presets also resolve. */
export function strategyConfig(strategy, configs) {
  const id = isCustom(strategy) ? strategy.slice(CUSTOM_PREFIX.length) : strategy;
  const cfg = configs?.get?.(id) ?? builtIn(id);
  if (!cfg) {
    const known = [...(configs?.keys?.() ?? [])];
    throw new Error(`Unknown custom strategy "${id}"${known.length ? ` (known: ${known.join(', ')})` : ''}. Declare it in customStrategies.file or pass --custom <file>.`);
  }
  return cfg;
}

/** Device class a logical screen is treated as (override with `device`). */
export function deviceOf(screen) {
  if (screen.device) return screen.device;
  return Math.min(screen.width, screen.height ?? screen.width) >= 600 ? 'tablet' : 'phone';
}

/** Platform-free snapshot for a kit screen { width, height?, density?, fontScale?, device?, multiWindow? }. */
export function snapshotOf(screen) {
  const width = screen.width;
  const height = screen.height ?? screen.width;
  return screenSnapshot({
    widthDp: width,
    heightDp: height,
    smallestWidthDp: Math.min(width, height),
    density: screen.density ?? (screen.dpi ? screen.dpi / 160 : 1),
    fontScale: screen.fontScale ?? 1,
    isLandscape: width > height,
    isMultiWindow: !!screen.multiWindow,
    device: deviceOf(screen),
  });
}

/** Resolution of a custom strategy on a screen (factor, applied rules, scale(), explain()). */
export function resolveCustom(strategy, screen, configs) {
  return resolveScaling(strategyConfig(strategy, configs), snapshotOf(screen));
}

/**
 * What one dp of `custom:<id>` becomes on `screen` (text = × effective font-scale policy): the
 * factor, or `E` of a proportional formula `base * E` (whose value is `base × E`, not `base × factor`).
 */
export function customFactor(strategy, screen, configs, { text = false } = {}) {
  const r = resolveCustom(strategy, screen, configs);
  return text ? r.valueFactor * r.effectiveFontScale() : r.valueFactor;
}
