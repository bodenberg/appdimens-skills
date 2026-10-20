import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkStrategies, customFactor, schemaErrors } from '../lib/custom.mjs';
import { normalize } from '../lib/factors.mjs';
import { customStrategyErrors } from '../lib/config.mjs';
import { lintFiles } from '../lib/lint.mjs';
import { ScalingExpression, resolveScaling, screenSnapshot } from '../lib/custom-engine.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (...p) => join(here, 'fixtures', 'custom', ...p);
const cli = join(here, '..', 'cli.mjs');
const run = (args, cwd = fx()) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });

test('the bundled engine reproduces the cross-platform fixture', () => {
  const text = readFileSync(fx('custom-strategy-fixture.json'), 'utf8');
  const fixture = JSON.parse(text);
  const { configs, errors } = checkStrategies(fixture.document);
  assert.deepEqual(errors, []);
  assert.ok(fixture.cases.length >= 500);
  for (const c of fixture.cases) {
    const s = fixture.screens[c.screen];
    const r = resolveScaling(configs.get(c.strategy), screenSnapshot({
      widthDp: s.width, heightDp: s.height, smallestWidthDp: s.smallestWidth, density: s.density,
      fontScale: s.fontScale, isLandscape: s.landscape, isMultiWindow: s.multiWindow, device: s.device,
    }));
    const close = (a, b) => Math.abs(a - b) <= fixture.tolerance * Math.max(1, Math.abs(a));
    assert.ok(close(c.factor, r.factor) && close(c.dp, r.scale(c.base)) && close(c.spDp, r.scaleSpDp(c.base)), `${c.strategy}@${c.screen}`);
    assert.deepEqual([...r.appliedRules], c.rules);
  }
});

test('schema and engine errors point at the field', () => {
  assert.deepEqual(schemaErrors({ id: 'a' }), []);
  assert.match(schemaErrors({ strategies: [{ id: 'x', axis: 'diag' }] })[0].path, /\/strategies\/0\/axis/);
  assert.match(schemaErrors([{ id: 'x', curve: { type: 'wave' } }])[0].path, /\/0\/curve/);
  assert.match(checkStrategies('{"id":"x","curve":{"type":"expression","expression":"base"}}').errors[0].message, /x\.curve\.expression: .*unknown variable 'base'/);
  assert.match(checkStrategies('[{"id":"a","extends":"b"},{"id":"b","extends":"a"}]').errors[0].message, /Cyclic/);
  assert.match(checkStrategies('{"id":"a",}').errors[0].message, /not valid JSON/);
  assert.match(checkStrategies('{"default":"nope","strategies":[{"id":"a"}]}').errors[0].path, /default/);
  assert.throws(() => ScalingExpression.parse('clamp(1, 2)'), /'clamp' takes 3/);
});

test('custom:<id> factors and normalize', () => {
  const { configs } = checkStrategies(readFileSync(fx('appdimens-strategies.json'), 'utf8'));
  assert.ok(Math.abs(customFactor('custom:brand', { width: 800, height: 1280 }, configs) - (1 + 0.4 * Math.log(800 / 360))) < 1e-9);
  assert.equal(customFactor('custom:tvSafe', { width: 960, height: 540, device: 'tv' }, configs), 1); // preset: 540 / 540
  const out = normalize([16], { frame: 411, height: 914, strategy: 'custom:brand', custom: configs, rounding: 0.01 });
  assert.ok(Math.abs(out.rows[0].resultOnFrame - 16) < 0.01);
  assert.throws(() => customFactor('custom:missing', { width: 400 }, configs), /Unknown custom strategy "missing"/);
});

test('config cross-checks for customStrategies', () => {
  const base = { targets: [{ platform: 'web', library: 'webdimens' }] };
  assert.match(customStrategyErrors({ ...base, strategy: { layout: 'custom:brand' } }, fx('appdimens.config.json'))[0].message, /needs customStrategies\.file/);
  const errs = customStrategyErrors({ ...base, strategy: { layout: 'custom:nope' }, customStrategies: { file: 'appdimens-strategies.json', ids: ['brand', 'ghost'], default: 'other' } }, fx('appdimens.config.json'));
  assert.deepEqual(errs.map((e) => e.path), ['/customStrategies/ids/1', '/customStrategies/default', '/strategy/layout']);
  assert.match(customStrategyErrors({ ...base, customStrategies: { file: 'missing.json' } }, fx('appdimens.config.json'))[0].message, /cannot read/);
});

test('lint suggests cdp with the project strategy and requires the custom import', () => {
  const [screen, missing] = lintFiles([fx('Screen.kt'), fx('MissingImport.kt')]);
  assert.match(screen.findings[0].message, /21\.5\.cdp\(brand\)/);
  assert.equal(missing.findings[0].rule, 'strategy-import');
  assert.match(missing.findings[0].message, /compose\.custom/);
});

test('CLI: validate, custom check / explain, normalize --strategy custom:<id>', () => {
  assert.equal(run(['validate']).status, 0);
  const check = run(['custom', 'check']);
  assert.equal(check.status, 0);
  assert.match(check.stdout, /18 strategies \(default: brand\)/);
  const explain = run(['custom', 'explain', 'brand', '--devices', 'medium-phone,medium-tablet', '--values', '16', '--json']);
  const rows = JSON.parse(explain.stdout);
  assert.deepEqual(rows[1].rules, ['large', 'wideLandscape']);
  const norm = run(['normalize', '--device', 'medium-phone', '--strategy', 'custom:brand', '--syntax', 'web', '16']);
  assert.match(norm.stdout, /14\.5cdp-brand/);
  assert.notEqual(run(['custom', 'check', fx('Screen.kt')]).status, 0);
});
