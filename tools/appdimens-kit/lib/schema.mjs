// Dependency-free JSON Schema (2020-12) validator for the subset the AppDimens schemas use.
// A keyword it does not implement throws at compile time, so a schema edit can never be
// silently skipped: add the keyword here (and a test) before using it in schemas/.
import { readFileSync } from 'node:fs';

const ANNOTATIONS = new Set(['$schema', '$id', '$comment', '$defs', 'title', 'description', 'default', 'examples']);
const ASSERTIONS = new Set(['type', 'enum', 'required', 'properties', 'additionalProperties', 'items', 'minItems', '$ref', 'oneOf', 'minimum', 'maximum', 'exclusiveMinimum', 'pattern']);

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const isType = (v, t) => (t === 'number' ? typeof v === 'number' && Number.isFinite(v) : t === 'integer' ? Number.isInteger(v) : typeOf(v) === t);
const show = (v) => JSON.stringify(v);

/** Throws if `schema` uses a keyword this validator does not implement. */
export function checkKeywords(schema, path = '#') {
  if (typeof schema === 'boolean') return;
  for (const k of Object.keys(schema)) if (!ANNOTATIONS.has(k) && !ASSERTIONS.has(k)) throw new Error(`schema keyword "${k}" at ${path} is not supported by lib/schema.mjs`);
  const sub = (s, p) => checkKeywords(s, p);
  for (const [k, s] of Object.entries(schema.properties || {})) sub(s, `${path}/properties/${k}`);
  for (const [k, s] of Object.entries(schema.$defs || {})) sub(s, `${path}/$defs/${k}`);
  if (schema.items) sub(schema.items, `${path}/items`);
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') sub(schema.additionalProperties, `${path}/additionalProperties`);
  (schema.oneOf || []).forEach((s, i) => sub(s, `${path}/oneOf/${i}`));
}

/** Validates `data` against `schema`. Returns [{ path, message }] (empty = valid). */
export function validate(schema, data) {
  checkKeywords(schema);
  const errors = [];
  const resolve = (ref) => {
    const m = /^#\/\$defs\/([^/]+)$/.exec(ref);
    if (!m || !schema.$defs?.[m[1]]) throw new Error(`unsupported $ref "${ref}"`);
    return schema.$defs[m[1]];
  };

  const walk = (s, v, path, out = errors) => {
    const before = out.length;
    const err = (message) => out.push({ path: path || '/', message });
    if (s.$ref) walk(resolve(s.$ref), v, path, out);
    if (s.type && !(Array.isArray(s.type) ? s.type : [s.type]).some((t) => isType(v, t))) {
      err(`must be ${Array.isArray(s.type) ? s.type.join(' or ') : s.type}, got ${typeOf(v)}`);
      return out.length === before;
    }
    if (s.enum && !s.enum.some((e) => e === v)) err(`must be one of ${s.enum.map(show).join(', ')}; got ${show(v)}`);
    if (typeof v === 'number') {
      if (s.minimum !== undefined && v < s.minimum) err(`must be ≥ ${s.minimum}; got ${v}`);
      if (s.maximum !== undefined && v > s.maximum) err(`must be ≤ ${s.maximum}; got ${v}`);
      if (s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum) err(`must be > ${s.exclusiveMinimum}; got ${v}`);
    }
    if (typeof v === 'string' && s.pattern && !new RegExp(s.pattern, 'u').test(v)) err(`must match ${s.pattern}; got ${show(v)}`);
    if (Array.isArray(v)) {
      if (s.minItems !== undefined && v.length < s.minItems) err(`must have at least ${s.minItems} item(s)`);
      if (s.items) v.forEach((item, i) => walk(s.items, item, `${path}/${i}`, out));
    }
    if (typeOf(v) === 'object') {
      for (const r of s.required || []) if (!(r in v)) err(`missing required property "${r}"`);
      const props = s.properties || {};
      for (const [k, val] of Object.entries(v)) {
        if (k in props) walk(props[k], val, `${path}/${k}`, out);
        else if (s.additionalProperties === false) out.push({ path: `${path}/${k}`, message: `unknown property "${k}"${suggest(k, Object.keys(props))}` });
        else if (s.additionalProperties && typeof s.additionalProperties === 'object') walk(s.additionalProperties, val, `${path}/${k}`, out);
      }
    }
    if (s.oneOf) {
      const passing = s.oneOf.filter((alt) => walk(alt, v, path, []));
      if (passing.length !== 1) err(passing.length ? `matches ${passing.length} alternatives, expected exactly one` : `matches none of the ${s.oneOf.length} allowed forms; got ${show(v)}`);
    }
    return out.length === before;
  };
  walk(schema, data, '');
  return errors;
}

function suggest(key, known) {
  const k = key.toLowerCase();
  const hit = known.find((n) => n.toLowerCase() === k) || known.find((n) => distance(n.toLowerCase(), k) <= 2);
  return hit ? ` (did you mean "${hit}"?)` : '';
}

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const schemas = new Map();
/** Loads a schema shipped in schemas/ (the kit sits at tools/appdimens-kit, schemas/ beside tools/). */
export function loadSchema(name) {
  if (!schemas.has(name)) schemas.set(name, JSON.parse(readFileSync(new URL(`../../../schemas/${name}`, import.meta.url), 'utf8')));
  return schemas.get(name);
}
