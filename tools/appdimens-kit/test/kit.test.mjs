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

test('config policy changes the suggestion', () => {
  const { findings } = lintText('Modifier.padding(16.dp)', { file: 'a.kt', config: { formFactors: ['phone', 'tablet'] } });
  assert.match(findings[0].message, /16\.asdp/);
});

test('cli normalize prints a table', () => {
  const run = spawnSync(process.execPath, [join(kit, 'cli.mjs'), 'normalize', '--frame', '360', '--policy', 'auto', '16'], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /\| 16 \| 13\.5 \| 13\.5\.asdp \| 16\.2 \|/);
});

test('hook: errors exit 2, warnings add context, unrelated files are silent', () => {
  const hook = join(kit, 'hook.mjs');
  const call = (file) => spawnSync(process.execPath, [hook], { input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: file } }), encoding: 'utf8' });

  const err = call(fx('rn', 'Card.tsx'));
  assert.equal(err.status, 2);
  assert.match(err.stderr, /px-font-size/);

  const warn = call(fx('dotnet', 'MainPage.xaml'));
  assert.equal(warn.status, 0);
  assert.equal(JSON.parse(warn.stdout).hookSpecificOutput.hookEventName, 'PostToolUse');

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
