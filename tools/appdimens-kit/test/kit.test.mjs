import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { factor, normalize } from '../lib/factors.mjs';
import { lintFiles } from '../lib/lint.mjs';
import { lintText } from '../lib/rules.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (...p) => join(here, 'fixtures', ...p);
const kit = join(here, '..');

const rulesAt = (file) => {
  const [r] = lintFiles([file]);
  return r ? r.findings.map((f) => `${f.line}:${f.rule}:${f.severity}`) : [];
};

test('factors match the AppDimens tables', () => {
  assert.equal(factor('scaled', 300), 1);
  assert.equal(factor('scaled', 360), 1.2);
  assert.equal(factor('auto', 480), 1.6);
  assert.ok(Math.abs(16 * factor('auto', 800) - 30.2) < 0.05); // .NET table: 16 → 30.2 on 800
  assert.ok(Math.abs(16 * factor('fluid', 360) - 13.4) < 0.05); // .NET table: 16 → 13.4 on 360
  assert.equal(factor('fluid', 1080), 1.2);
  assert.throws(() => factor('nope', 360));
});

test('normalize divides by the factor and rounds', () => {
  const out = normalize([16, 12, 1], { frame: 360, policy: 'scaled', rounding: 0.5 });
  assert.deepEqual(out.rows.map((r) => r.base), [13.5, 10, 1]);
  const xml = normalize([16], { frame: 360, policy: 'scaled', rounding: 1 });
  assert.equal(xml.rows[0].base, 13);
  const landscape = normalize([16], { frame: 1440, height: 900, policy: 'auto' });
  assert.equal(landscape.smallestSide, 900);
});

test('android compose', () => {
  const r = rulesAt(fx('android', 'app', 'src', 'Home.kt'));
  assert.ok(r.includes('8:raw-unit:warning'));
  assert.ok(r.includes('9:raw-unit:warning'));
  assert.ok(!r.some((x) => x.startsWith('10:')), 'hairline 1.dp is not flagged');
  assert.ok(!r.some((x) => x.startsWith('11:')), 'ad:fixed silences the warning');
  assert.ok(r.includes('4:strategy-module:warning'), 'auto imported but its Gradle module is missing');
  assert.ok(r.includes('13:strategy-import:error'), 'fluid used without import');
  assert.ok(!r.some((x) => x.startsWith('14:')), '16.sdp is fine');
  assert.equal(r.filter((x) => x.startsWith('15:obsolete-api')).length, 1, 'one finding for .balanced()');
});

test('android xml', () => {
  const r = rulesAt(fx('xml', 'res', 'layout', 'item.xml'));
  assert.ok(r.includes('4:raw-unit:warning'));
  assert.ok(r.includes('5:raw-unit:warning'));
  assert.ok(!r.some((x) => x.startsWith('6:')), '1dp hairline');
  assert.ok(!r.some((x) => x.startsWith('8:')), 'ad:fixed comment on the previous line');
  assert.ok(r.includes('9:dimen-range:error'));
  assert.ok(!r.some((x) => x.startsWith('10:')), '_14ssp and _minus8sdp exist');
  assert.deepEqual(rulesAt(fx('xml', 'res', 'values', 'dimens.xml')), ['2:raw-unit:warning']);
});

test('flutter', () => {
  const r = rulesAt(fx('flutter', 'lib', 'home.dart'));
  assert.deepEqual(r, ['5:raw-unit:warning', '7:raw-unit:warning', '9:strategy-import:error']);
});

test('apple', () => {
  const r = rulesAt(fx('apple', 'Sources', 'Home.swift'));
  assert.deepEqual(r, ['6:raw-unit:warning', '7:raw-unit:warning', '10:strategy-import:error', '12:raw-unit:warning']);
});

test('react native', () => {
  const r = rulesAt(fx('rn', 'Card.tsx'));
  assert.deepEqual(r, ['5:raw-unit:warning', '7:px-font-size:error', '8:strategy-import:error']);
});

test('web css and markup', () => {
  assert.deepEqual(rulesAt(fx('web', 'styles.css')), ['1:raw-unit:warning', '2:raw-unit:warning', '5:px-token-in-css:error']);
  assert.deepEqual(rulesAt(fx('web', 'index.html')), ['2:px-token-in-css:error', '3:js-only-token:error', '5:raw-unit:warning']);
});

test('dotnet', () => {
  assert.deepEqual(rulesAt(fx('dotnet', 'MainPage.xaml')), ['1:raw-unit:warning', '2:raw-unit:warning']);
  assert.deepEqual(rulesAt(fx('dotnet', 'Mixed.cs')), ['1:dotnet-family-mix:error']);
});

test('files outside an AppDimens project are skipped (unless forced)', () => {
  assert.deepEqual(lintFiles([fx('unrelated', 'Plain.kt')]), []);
  const [forced] = lintFiles([fx('unrelated', 'Plain.kt')], { force: true });
  assert.equal(forced.findings.length, 1);
});

test('suggestions are base-screen aware, never the raw number re-labelled', () => {
  const base = { design: { baseScreen: { width: 411, height: 914 } }, formFactors: ['phone', 'tablet'] };
  const withBase = lintText('Modifier.padding(16.dp)', { file: 'a.kt', config: base });
  assert.match(withBase.findings[0].message, /11\.5\.asdp/);
  assert.doesNotMatch(withBase.findings[0].message, /\b16\.asdp/);
  const xml = lintText('<View android:padding="16dp" />', { file: 'res/layout/a.xml', config: base });
  assert.match(xml.findings[0].message, /@dimen\/_12sdp/);
  const noBase = lintText('Modifier.padding(16.dp)', { file: 'a.kt', config: { formFactors: ['phone'] } });
  assert.match(noBase.findings[0].message, /normalize --device <base screen> --strategy scaled 16/);
  assert.doesNotMatch(noBase.findings[0].message, /\b16\.sdp/);
});

test('fixed-intent contexts and touch minimums are not flagged', () => {
  const kt = lintText(['Card(elevation = CardDefaults.cardElevation(4.dp), modifier = Modifier.padding(16.dp))',
    'Modifier.shadow(8.dp)', 'Modifier.sizeIn(minWidth = 48.dp, minHeight = 48.dp)', 'Modifier.border(2.dp, Color.Red)'].join('\n'), { file: 'a.kt' });
  assert.deepEqual(kt.findings.map((f) => f.line), [1], 'only the padding on line 1');
  const rn = lintText("import {View} from 'react-native';\nconst s = { shadowOffset: { width: 0, height: 4 }, padding: 16 };\nconst h = { hitSlop: { top: 10 } };", { file: 'a.tsx' });
  assert.deepEqual(rn.findings.map((f) => f.message.startsWith('padding')), [true]);
  const css = lintText('.card { padding: 16px; border: 1px solid #ddd; box-shadow: 0 4px 8px #0003; }\n@media (min-width: 600px) { .x { padding: 24px } }', { file: 'a.css' });
  assert.deepEqual(css.findings.map((f) => f.line), [1, 2]);
});

test('react native files without a react-native import, and relative XML paths', () => {
  const rn = lintFiles([fx('rn', 'styles.ts')]);
  assert.equal(rn[0].lang, 'react-native');
  const cwd = process.cwd();
  process.chdir(fx('xml'));
  try {
    assert.equal(lintFiles(['res/layout/item.xml'])[0].lang, 'android-xml');
  } finally {
    process.chdir(cwd);
  }
});

test('cli normalize prints a table', () => {
  const run = spawnSync(process.execPath, [join(kit, 'cli.mjs'), 'normalize', '--frame', '360', '--policy', 'auto', '16'], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /\| 16 \| 13\.5 \| 13\.5\.asdp \| 16\.2 \|/);
});

test('hook: errors exit 2, warnings add context, unrelated files are silent', () => {
  const hook = join(kit, 'hook.mjs');
  const call = (file, extra = {}) => spawnSync(process.execPath, [hook], { input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: file, ...extra } }), encoding: 'utf8' });

  const err = call(fx('rn', 'Card.tsx'));
  assert.equal(err.status, 2);
  assert.match(err.stderr, /px-font-size/);

  const warn = call(fx('dotnet', 'MainPage.xaml'));
  assert.equal(warn.status, 0);
  assert.equal(JSON.parse(warn.stdout).hookSpecificOutput.hookEventName, 'PostToolUse');

  // only the lines this edit wrote count: an unrelated change in a legacy file never blocks
  const unrelatedEdit = call(fx('rn', 'Card.tsx'), { new_string: "  title: { fontSize: ssp(18) }," });
  assert.equal(unrelatedEdit.status, 0);
  assert.equal(unrelatedEdit.stdout, '');
  const badEdit = call(fx('rn', 'Card.tsx'), { new_string: '  bad: { fontSize: sdpPx(14) },' });
  assert.equal(badEdit.status, 2);

  const quiet = call(fx('unrelated', 'Plain.kt'));
  assert.equal(quiet.status, 0);
  assert.equal(quiet.stdout, '');
});

import { factorFor, percentOf, STRATEGIES } from '../lib/factors.mjs';
import { findDevice, looksLikePhysicalPx } from '../lib/devices.mjs';
import { scanBaseHints, summarizeHints } from '../lib/basehints.mjs';

const REF = { width: 300, height: 533, dpi: 160 };
const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('every strategy is neutral on the reference screen (except fluid and density by design)', () => {
  for (const s of STRATEGIES) {
    const f = factorFor(s, REF);
    if (s === 'fluid') close(f, 0.8);
    else close(f, 1, 0.002);
  }
});

test('strategy kernels match THEORY.md', () => {
  const phone = { width: 411, height: 914, dpi: 420 };
  close(factorFor('power', phone), Math.pow(411 / 300, 0.75));
  close(factorFor('interpolated', phone), 0.5 + 0.5 * (411 / 300));
  close(factorFor('logarithmic', phone), 1 + 0.4 * Math.log(411 / 300));
  close(factorFor('diagonal', phone), Math.sqrt(411 ** 2 + 914 ** 2) / 611.6305);
  close(factorFor('perimeter', phone), (411 + 914) / 833);
  close(factorFor('fill', phone), Math.max(411 / 300, 914 / 533));
  close(factorFor('fit', phone), Math.min(411 / 300, 914 / 533));
  close(factorFor('density', phone), 420 / 160);
  // hdp divides the height by 300, not 533
  close(factorFor('scaled', phone, { axis: 'h' }), 914 / 300);
  // the a suffix on a 16:9 screen is neutral for the aspect term
  close(factorFor('scaled', { width: 400, height: 712 }, { aspect: true }), 1 + 100 / 300, 0.002);
  assert.throws(() => factorFor('density', { width: 411, height: 914 }));
  assert.throws(() => factorFor('scaled', { width: 411 }, { axis: 'h' }));
});

test('normalize handles density, axis and percentages', () => {
  const px = normalize([48], { frame: 1080, height: 2400, density: 2.625 });
  close(px.baseDevice.width, 411.43);
  assert.equal(px.rows[0].base, 13.5);
  const h = normalize([220], { frame: 411, height: 914, axis: 'h' });
  assert.equal(h.rows[0].base, 72);
  const [p] = percentOf([205], { frame: 411, height: 914, of: 'w' });
  assert.equal(p.percent, 50);
});

test('device catalog and physical-px heuristic', () => {
  assert.equal(findDevice('Medium Phone').width, 411);
  assert.equal(findDevice('iPhone 15').width, 393);
  assert.equal(findDevice('android compact').id, 'figma-android-compact');
  assert.ok(looksLikePhysicalPx({ width: 1080, height: 2400 }));
  assert.ok(!looksLikePhysicalPx({ width: 1920, height: 1080 }), 'landscape desktop is logical');
  assert.ok(!looksLikePhysicalPx({ width: 411, height: 914 }));
});

test('base-screen evidence is found in code', () => {
  const summary = summarizeHints(scanBaseHints([fx('android'), fx('flutter')]));
  assert.deepEqual([summary[0].width, summary[0].height, summary[0].count], [411, 914, 2]);
  const sizes = summary.map((g) => `${g.width}x${g.height}`);
  assert.ok(sizes.includes('360x800'));
  assert.ok(sizes.includes('673x841'));
  assert.ok(sizes.includes('375x812'), 'flutter_screenutil designSize');
});

test('round-3 fixes: exact text, compare with zero, line-height ratio, design-source evidence', () => {
  const text = spawnSync(process.execPath, [join(kit, 'cli.mjs'), 'normalize', '--device', 'figma-android-compact', '--strategy', 'auto', '--text', '16'], { encoding: 'utf8' });
  assert.match(text.stdout, /11\.65\.assp/);
  const zero = spawnSync(process.execPath, [join(kit, 'cli.mjs'), 'compare', '--device', 'iphone-se', '--tablet', '768x1024', '--phone-value', '0', '--tablet-value', '40', '--strategy', 'auto'], { encoding: 'utf8' });
  assert.equal(zero.status, 0);
  assert.match(zero.stdout, /keep-as-adapt/);
  const lh = lintText('.t { line-height: 24px; }', { file: 'a.css' });
  assert.equal(lh.findings[0].rule, 'line-height-px');
  const hints = summarizeHints(scanBaseHints([fx('design-sources')]));
  const kinds = hints.flatMap((g) => g.kinds);
  for (const k of ['figma-frame', 'html-device-frame', 'design-comment']) assert.ok(kinds.includes(k), k);
});

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { checkKeywords, loadSchema, validate } from '../lib/schema.mjs';
import { ConfigError, validateConfig, validateIntents } from '../lib/config.mjs';
import { clearProjectCache } from '../lib/project.mjs';

test('schema validator implements every keyword the shipped schemas use', () => {
  for (const name of ['appdimens.config.schema.json', 'layout-intent.schema.json']) assert.doesNotThrow(() => checkKeywords(loadSchema(name)), name);
  assert.throws(() => validate({ type: 'object', propertyNames: { pattern: 'x' } }, {}), /propertyNames/);
});

test('config validation: schema, typos and platform ↔ library', () => {
  const ok = { targets: [{ platform: 'android-compose', library: 'appdimens-dynamic' }], design: { baseScreen: { width: 411, height: 914 } } };
  assert.deepEqual(validateConfig(ok), []);
  const bad = validateConfig({
    targets: [{ platform: 'web', library: 'appdimens-ios' }],
    design: { normalization: 'match_base', baseScreen: { widht: 411, height: '914' } },
  });
  const by = (p) => bad.filter((e) => e.path === p).map((e) => e.message).join(' | ');
  assert.match(by('/design/normalization'), /one of/);
  assert.match(by('/design/baseScreen'), /missing required property "width"/);
  assert.match(by('/design/baseScreen/widht'), /did you mean "width"/);
  assert.match(by('/design/baseScreen/height'), /must be number/);
  assert.match(by('/targets/0/library'), /not an AppDimens library for platform "web"/);
  assert.match(validateConfig({})[0].message, /missing required property "targets"/);
  assert.match(validateConfig({ targets: [] })[0].message, /at least 1/);
  // every config shipped in evals is a valid contract
  const { cases } = JSON.parse(readFileSync(join(here, '..', '..', '..', 'evals', 'intent-cases.json'), 'utf8'));
  for (const c of cases.filter((x) => x.config)) assert.deepEqual(validateConfig(c.config), [], c.id);
});

test('layout-intent validation, including oneOf sizing', () => {
  const intent = { node: 'Home', role: 'screen', sizing: { width: 'fill', height: { clamp: { min: 40 } } }, scale: { text: 'scaled' }, confidence: 0.9 };
  assert.deepEqual(validateIntents(intent), []);
  const errs = validateIntents([intent, { ...intent, role: 'lists', sizing: { width: 'stretch', height: 'hug' }, confidence: 2 }]);
  assert.deepEqual(errs.map((e) => e.path).sort(), ['/1/confidence', '/1/role', '/1/sizing/width']);
});

test('an invalid config stops lint, normalize, detect and the hook', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ad-cfg-'));
  mkdirSync(join(dir, '.git'));
  const cfg = join(dir, 'appdimens.config.json');
  writeFileSync(cfg, JSON.stringify({ targets: [{ platform: 'android-compose', library: 'appdimens-dynamic' }], design: { baseScreen: { width: '411', height: 914 } } }));
  const kt = join(dir, 'A.kt');
  writeFileSync(kt, 'Modifier.padding(16.dp)\n');
  clearProjectCache();
  assert.throws(() => lintFiles([kt]), (e) => e instanceof ConfigError && e.errors[0].path === '/design/baseScreen/width');

  const cli = (...a) => spawnSync(process.execPath, [join(kit, 'cli.mjs'), ...a], { cwd: dir, encoding: 'utf8' });
  assert.equal(cli('lint', kt).status, 2);
  assert.equal(cli('normalize', '--device', 'medium-phone', '16').status, 2);
  assert.equal(cli('detect', '.').status, 2);
  const v = cli('validate');
  assert.equal(v.status, 1);
  assert.match(v.stdout, /\/design\/baseScreen\/width: must be number/);

  const hook = (file) => spawnSync(process.execPath, [join(kit, 'hook.mjs')], { input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: file, new_string: 'x' } }), encoding: 'utf8' });
  const h = hook(kt);
  assert.equal(h.status, 2);
  assert.match(h.stderr, /checks are paused/);
  assert.equal(hook(cfg).status, 2);

  writeFileSync(cfg, JSON.stringify({ targets: [{ platform: 'android-compose', library: 'appdimens-dynamic' }] }));
  assert.equal(cli('validate').status, 0);
  assert.equal(hook(cfg).status, 0);
  const relinted = cli('lint', kt); // valid again: the file is linted (the 16.dp literal is a warning)
  assert.equal(relinted.status, 0);
  assert.match(relinted.stdout, /1 warning/);
});
