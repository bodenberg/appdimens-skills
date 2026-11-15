// Loads and validates appdimens.config.json (and layout-intent sheets) against schemas/.
// An invalid contract is never used: callers get the errors and stop.
import { readFileSync } from 'node:fs';
import { loadSchema, validate } from './schema.mjs';
import { projectStrategies } from './custom.mjs';

/** Libraries each platform target can declare (beyond the schema's enums). */
export const LIBRARIES_OF_PLATFORM = {
  'android-compose': ['appdimens-dynamic'],
  'android-views': ['appdimens-dynamic'],
  'android-xml': ['appdimens-sdps', 'appdimens-ssps'],
  kmp: ['appdimens-kmp'],
  apple: ['appdimens-ios'],
  flutter: ['appdimens-flutter'],
  'react-native': ['appdimens-react-native'],
  web: ['webdimens'],
  'dotnet-maui': ['appdimens-net-sdps', 'appdimens-net'],
  'dotnet-desktop': ['appdimens-net-sdps', 'appdimens-net'],
  'dotnet-android': ['appdimens-net-sdps', 'appdimens-net-android'],
  games: ['appdimens-games'],
};

export class ConfigError extends Error {
  constructor(path, errors) {
    super(`${path} is invalid:\n${errors.map((e) => `  ${e.path}: ${e.message}`).join('\n')}`);
    this.path = path;
    this.errors = errors;
  }
}

/** Schema + cross-field checks for a parsed config object. Returns [{ path, message }]. */
export function validateConfig(config) {
  const errors = validate(loadSchema('appdimens.config.schema.json'), config);
  const known = new Set(Object.values(LIBRARIES_OF_PLATFORM).flat());
  (Array.isArray(config?.targets) ? config.targets : []).forEach((t, i) => {
    const allowed = LIBRARIES_OF_PLATFORM[t?.platform];
    if (allowed && known.has(t.library) && !allowed.includes(t.library)) errors.push({ path: `/targets/${i}/library`, message: `"${t.library}" is not an AppDimens library for platform "${t.platform}" (use ${allowed.map((l) => `"${l}"`).join(' or ')})` });
  });
  return errors;
}

/** Validates a layout-intent object, or an array of them. */
export function validateIntents(data) {
  const schema = loadSchema('layout-intent.schema.json');
  const list = Array.isArray(data) ? data : [data];
  return list.flatMap((item, i) => validate(schema, item).map((e) => ({ ...e, path: Array.isArray(data) ? `/${i}${e.path === '/' ? '' : e.path}` : e.path })));
}

/** Reads, parses and validates a config file. Returns { config, errors } — config is null when errors exist. */
export function loadConfig(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    return { config: null, errors: [{ path: '/', message: `cannot read: ${e.message}` }] };
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { config: null, errors: [{ path: '/', message: `not valid JSON: ${e.message}` }] };
  }
  const errors = validateConfig(data);
  if (!errors.length) errors.push(...customStrategyErrors(data, path));
  return { config: errors.length ? null : data, errors };
}

/**
 * customStrategies cross-checks: the file loads and passes the strategy schema + engine, the
 * listed ids / default exist, and every custom:<id> used by `strategy` is declared.
 */
export function customStrategyErrors(config, configPath) {
  const errors = [];
  const used = ['layout', 'text']
    .map((k) => [k, config?.strategy?.[k]])
    .filter(([, v]) => typeof v === 'string' && v.startsWith('custom:'));
  const loaded = projectStrategies(config, configPath);
  if (!loaded) {
    for (const [k, v] of used) errors.push({ path: `/strategy/${k}`, message: `${v} needs customStrategies.file (the strategies JSON the targets load)` });
    return errors;
  }
  for (const e of loaded.errors) errors.push({ path: '/customStrategies/file', message: `${loaded.file}${e.path === '/' ? '' : e.path}: ${e.message}` });
  if (loaded.errors.length) return errors;
  const known = new Set(loaded.configs.keys());
  const declared = config.customStrategies.ids ?? [...known];
  (config.customStrategies.ids ?? []).forEach((id, i) => {
    if (!known.has(id)) errors.push({ path: `/customStrategies/ids/${i}`, message: `"${id}" is not in ${loaded.file} (has: ${[...known].join(', ')})` });
  });
  const def = config.customStrategies.default;
  if (def !== undefined && !declared.includes(def)) errors.push({ path: '/customStrategies/default', message: `"${def}" is not one of the declared ids (${declared.join(', ')})` });
  for (const [k, v] of used) {
    const id = v.slice('custom:'.length);
    if (!declared.includes(id)) errors.push({ path: `/strategy/${k}`, message: `${v}: "${id}" is not a declared custom strategy (${declared.join(', ')})` });
  }
  return errors;
}
