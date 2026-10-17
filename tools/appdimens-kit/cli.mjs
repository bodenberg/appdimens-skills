#!/usr/bin/env node
// appdimens-kit — helpers for AI agents (and humans) implementing AppDimens layouts.
import { formatText, lintFiles } from './lib/lint.mjs';
import { AXIS_STRATEGIES, PREFIX, compareOverride, normalize, percentOf, resolveStrategy, themeScale } from './lib/factors.mjs';
import { detectTargets, findProject } from './lib/project.mjs';
import { ConfigError, loadConfig, validateIntents } from './lib/config.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { devices, findDevice, looksLikePhysicalPx, parseSize } from './lib/devices.mjs';
import { scanBaseHints, summarizeHints } from './lib/basehints.mjs';

const USAGE = `appdimens-kit

  detect [dir] [--json]
      Platform targets + AppDimens library per target, and evidence of the BASE SCREEN the
      existing screens were built/previewed on (Compose @Preview devices, SwiftUI preview
      devices, flutter_screenutil designSize, design-width constants, test viewports).

  devices [--platform android|apple|web] [--json]
      Base-screen catalog (logical size in dp / pt / CSS px, density).

  normalize <screen> [--strategy <name>] [--axis s|h|w] [--aspect] [--text] [--xml]
            [--theme] [--space w|h|sw] [--rounding <step>] [--json] <values…>
      Converts values measured on the base screen (design values, or dp/pt that existing
      code was tuned with) into AppDimens base values that look the same on that screen:
        base = (value ÷ density) ÷ factor(strategy, base screen)
      <screen>    --device <id|WxH>  or  --frame <w> --height <h>
                  --runtime-height <h>  height the platform reports to the library (system bars)
                  --density <d>  the screen is in PHYSICAL px (1080×2400 at 2.625 → 411×914 dp)
                  --logical      the screen is already logical (silences the px check)
                  --dpi <dpi>    for the density strategy (default: catalog density × 160)
                  --font-scale <f>  text was measured at this font scale (with --text)
      --strategy  scaled (default) auto percent power fluid interpolated logarithmic
                  diagonal perimeter fit fill density
      --axis      s (sdp/ssp, smallest side, default) · h (hdp/hsp) · w (wdp/wsp) — single-axis strategies only
      --aspect    the "a" suffix (sdpa…), which depends on the aspect ratio
      --text      sp kind (ssp…)
      --xml       Android XML resources: integer names, factor = resource bucket ÷ 300
      --theme     theme scale: exact (0.01) base values named by the design number
      --space     literal percentages instead (spaceW / spaceH / spaceSw)
      --syntax    output syntax: kotlin|swift|dart (16.sdp, default) · web (16sdp) · rn (sdp(16));
                  defaults to the platform of appdimens.config.json found from the current folder

  compare --device <phone> --tablet <id|WxH> --phone-value <v> --tablet-value <v>
          [--strategy <name>] [--axis s|h|w] [--xml]
      Existing tablet override (values-sw600dp, if (isTablet)…): after migrating, does the
      strategy already produce it? → delete-override, or keep-as-adapt with its base value.

  lint [--json] [--force] [--config <appdimens.config.json>] <files or dirs…>
      Flags fixed literals that should scale, strategy units without their import/module,
      obsolete APIs, invalid XML resources, JS-only web units in CSS and mixed .NET families.
      Files outside an AppDimens project are skipped unless --force. Exit 1 on errors.

  validate [appdimens.config.json] [--intent <file.json>…] [--json]
      Checks the project contract against schemas/appdimens.config.schema.json (plus
      platform ↔ library pairs), or layout-intent sheets (an object or an array) against
      schemas/layout-intent.schema.json. Default: the config found from the current folder.
      Exit 0 valid · 1 invalid.

  Every command that reads appdimens.config.json (lint, normalize without --syntax, detect)
  stops with exit 2 when it fails validation: an invalid contract is never used.
`;

const BOOLEAN = ['json', 'force', 'help', 'aspect', 'text', 'xml', 'theme', 'logical'];
function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const name = a.slice(2);
      if (BOOLEAN.includes(name)) flags[name] = true;
      else flags[name] = args[++i];
    } else rest.push(a);
  }
  return { flags, rest };
}

const out = (s) => process.stdout.write(s + '\n');
const fail = (s) => {
  process.stderr.write(s + '\n');
  process.exit(2);
};
const fmt = (n) => (n === undefined ? '?' : Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

function screenFrom(flags, flag = 'device') {
  const q = flags[flag];
  if (q) {
    const d = findDevice(q) || (parseSize(q) && { ...parseSize(q), name: q });
    if (!d) fail(`unknown screen "${q}". Run "devices" for the list, or pass WxH.`);
    return { width: d.width, height: d.height, name: d.name, density: d.density };
  }
  if (flag !== 'device') return null;
  return { width: Number(flags.frame), height: flags.height ? Number(flags.height) : undefined, name: null };
}

/** The project's validated config (or null when there is none); exits 2 when it is invalid. */
function projectConfig(dir) {
  const p = findProject(dir);
  if (p.configErrors?.length) fail(new ConfigError(p.configPath, p.configErrors).message + '\nFix it (or run: validate) before continuing.');
  return p.config;
}

const [command, ...args] = process.argv.slice(2);
const { flags, rest } = parseFlags(args);

if (!command || command === 'help' || flags.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

if (command === 'lint') {
  if (!rest.length) fail('lint: pass at least one file or directory.');
  let results;
  try {
    results = lintFiles(rest, { force: !!flags.force, configPath: flags.config });
  } catch (e) {
    if (e instanceof ConfigError) fail(`${e.message}\nLint stopped: fix the config first (validate shows the same errors).`);
    throw e;
  }
  const hasErrors = results.some((r) => r.findings.some((f) => f.severity === 'error'));
  if (flags.json) out(JSON.stringify(results, null, 2));
  else out(formatText(results).text);
  process.exit(hasErrors ? 1 : 0);
}

if (command === 'devices') {
  const list = devices.filter((d) => !flags.platform || d.platform === flags.platform || d.platform === 'any');
  if (flags.json) out(JSON.stringify(list, null, 2));
  else {
    out('| id | screen | logical size (as listed) | smallest side | density |');
    out('|---|---|---|---|---|');
    for (const d of list) out(`| ${d.id} | ${d.name} | ${d.width}×${d.height} | ${Math.min(d.width, d.height)} | ${d.density ?? '—'} |`);
  }
  process.exit(0);
}

if (command === 'normalize') {
  const screen = screenFrom(flags);
  const strategy = resolveStrategy(flags.strategy || flags.policy || 'scaled');
  const axis = flags.axis || 's';
  const density = flags.density ? Number(flags.density) : 1;
  const xml = !!flags.xml;
  // Font sizes are always exact: a 0.5 rounding (16 → 11.5assp = 15.79px) is enough to change line wrapping.
  const rounding = flags.rounding ? Number(flags.rounding) : xml ? 1 : flags.text ? 0.01 : 0.5;
  const dpi = flags.dpi ? Number(flags.dpi) : screen.density ? screen.density * 160 : undefined;
  const fontScale = flags['font-scale'] ? Number(flags['font-scale']) : 1;
  const runtimeHeight = flags['runtime-height'] ? Number(flags['runtime-height']) : undefined;
  const values = rest.map(Number).filter((n) => !Number.isNaN(n));
  if (!screen.width || !values.length) fail('normalize: --device <id> (or --frame <w> --height <h>) and at least one value are required.');
  if (!['s', 'h', 'w'].includes(axis)) fail('normalize: --axis must be s, h or w.');

  // Physical pixels must never produce a usable-looking table.
  if (density === 1 && !flags.logical && screen.height && looksLikePhysicalPx(screen))
    fail(`normalize: ${screen.width}×${screen.height} looks like PHYSICAL PIXELS (resolution), not dp/pt.\n` +
      'Pass --density (Android 420 dpi = 2.625, 480 dpi = 3, iOS @2x = 2, @3x = 3), or --logical if it really is logical.');

  const warnings = [];
  if (axis !== 's' && !AXIS_STRATEGIES.has(strategy))
    warnings.push(`${strategy} reads the whole screen and ignores the axis: ${PREFIX[strategy]}hdp / ${PREFIX[strategy]}wdp equal ${PREFIX[strategy]}sdp.`);
  if (fontScale !== 1) warnings.push(`Text measured at font scale ${fontScale}: values were divided by it (ssp multiplies by the user's font scale at runtime).`);
  if (axis === 'h' && !runtimeHeight && AXIS_STRATEGIES.has(strategy))
    warnings.push('Height-based unit: the platform may report a window height without system bars (Android targetSdk ≤ 34). If so, pass --runtime-height.');

  if (flags.space) {
    const rows = percentOf(values, { frame: screen.width, height: runtimeHeight ?? screen.height, of: flags.space, density, rounding });
    if (flags.json) out(JSON.stringify({ space: flags.space, rows, warnings }, null, 2));
    else {
      const name = { w: 'spaceW', h: 'spaceH', sw: 'spaceSw' }[flags.space];
      out(`literal percentage of ${flags.space} (percent strategy module)`);
      out('\n| on base screen | percent | dimen | resolves to on base screen |\n|---:|---:|---|---:|');
      for (const r of rows) out(`| ${fmt(r.design)} | ${fmt(r.percent)} | ${fmt(r.percent)}.${name} | ${fmt(r.resultOnFrame)} |`);
      for (const w of warnings) out(`\n⚠ ${w}`);
    }
    process.exit(0);
  }

  const input = flags.text ? values.map((v) => v / fontScale) : values;
  const opts = { frame: screen.width, height: screen.height, runtimeHeight, strategy, rounding, axis, density, aspect: !!flags.aspect, dpi, xml };
  let result;
  try {
    result = normalize(input, opts);
  } catch (e) {
    fail(`normalize: ${e.message}`);
  }
  result.warnings = warnings;
  const kindAxis = AXIS_STRATEGIES.has(strategy) || xml ? axis : 's';
  const kind = (flags.text ? { s: 'ssp', h: 'hsp', w: 'wsp' } : { s: 'sdp', h: 'hdp', w: 'wdp' })[kindAxis];
  const unit = `${PREFIX[strategy]}${kind}${flags.aspect ? 'a' : ''}`;
  const xmlName = (b) => `@dimen/_${b < 0 ? `minus${fmt(-b)}` : fmt(b)}${kind}`;
  const platform = flags.syntax || projectConfig(process.cwd())?.targets?.[0]?.platform;
  const syntax = /^(web|css)$/.test(platform) ? 'web' : /^(rn|react-native)$/.test(platform) ? 'rn' : 'dot';
  const tok = (b) => (syntax === 'web' ? `${fmt(b)}${unit}` : syntax === 'rn' ? `${unit}(${fmt(b)})` : `${fmt(b)}.${unit}`);

  if (flags.theme) {
    const rows = themeScale(input, opts);
    if (flags.json) {
      out(JSON.stringify({ ...result, theme: rows }, null, 2));
      process.exit(0);
    }
    out(`theme scale · ${strategy}${xml ? ' · XML' : ''} · factor ${result.factor.toFixed(4)} · ${xml ? 'integer' : 'exact (0.01)'} base values, named by the value on the base screen`);
    out('');
    const prefix = flags.text ? 'text' : 'space';
    for (const r of rows)
      out(xml ? `<dimen name="${prefix}_${fmt(r.name).replace('.', '_')}">${xmlName(r.base)}</dimen>  <!-- ${fmt(r.name)} on base → ${fmt(r.resultOnFrame)} -->`
        : syntax === 'web'
          ? `--${prefix}-${fmt(r.name).replace('.', '_')}: ${tok(r.base)};   /* ${fmt(r.name)} on base screen → ${fmt(r.resultOnFrame)} */`
          : `${prefix}${fmt(r.name).replace('.', '_')} = ${tok(r.base)}   // ${fmt(r.name)} on base screen → ${fmt(r.resultOnFrame)}`);
    for (const w of warnings) out(`\n⚠ ${w}`);
    process.exit(0);
  }

  if (flags.json) {
    out(JSON.stringify(result, null, 2));
    process.exit(0);
  }
  out(`base screen ${screen.name ? `${screen.name} ` : ''}${fmt(result.baseDevice.width)}×${fmt(result.baseDevice.height)}` +
    `${density !== 1 ? ` (resolution ÷ density ${density})` : ''}${runtimeHeight ? ' (runtime height)' : ''}` +
    ` · ${strategy}${flags.aspect ? ' + a' : ''} reads ${result.axis === 'screen' ? 'the whole screen' : `axis ${axis} = ${fmt(result.axisLength)}`}` +
    `${xml ? ` · XML bucket ${result.xmlBucket}` : ''} · factor ${result.factor.toFixed(4)} · rounding ${rounding}`);
  out('');
  out('| on base screen | AppDimens base | dimen | resolves to on base screen |');
  out('|---:|---:|---|---:|');
  for (const r of result.rows) out(`| ${fmt(r.design)} | ${fmt(r.base)} | ${xml ? xmlName(r.base) : tok(r.base)} | ${fmt(r.resultOnFrame)} |`);
  for (const w of warnings) out(`\n⚠ ${w}`);
  process.exit(0);
}

if (command === 'compare') {
  const phone = screenFrom(flags);
  const tablet = screenFrom(flags, 'tablet');
  const phoneValue = Number(flags['phone-value']);
  const tabletValue = Number(flags['tablet-value']);
  if (!phone?.width || !tablet || Number.isNaN(phoneValue) || Number.isNaN(tabletValue) || flags['phone-value'] === undefined || flags['tablet-value'] === undefined) fail('compare: --device <phone> --tablet <tablet> --phone-value <v> --tablet-value <v> are required.');
  const strategy = resolveStrategy(flags.strategy || 'scaled');
  let r;
  try {
    r = compareOverride({ phoneValue, tabletValue, phone, tablet, strategy, axis: flags.axis || 's', xml: !!flags.xml, rounding: flags.rounding ? Number(flags.rounding) : flags.xml ? 1 : 0.5 });
  } catch (e) {
    fail(`compare: ${e.message}`);
  }
  if (flags.json) out(JSON.stringify(r, null, 2));
  else {
    out(`${strategy}: base ${fmt(r.base)} → on ${tablet.name ?? 'tablet'} the strategy gives ${fmt(r.strategyOnTablet)}; the override sets ${fmt(r.override)} (${Number.isFinite(r.ratio) ? `×${r.ratio.toFixed(2)}` : 'one side is 0'}).`);
    out(r.verdict === 'delete-override'
      ? 'Verdict: delete-override — the strategy already produces it (within 10 %); keeping it would scale twice.'
      : `Verdict: keep-as-adapt — express it as an adapt value at the breakpoint with base ${fmt(r.adaptBase)}.`);
  }
  process.exit(0);
}

if (command === 'detect') {
  const dir = rest[0] || '.';
  const targets = detectTargets(dir);
  const hints = scanBaseHints([dir]);
  const summary = summarizeHints(hints);
  const declared = projectConfig(dir)?.targets || [];
  if (flags.json) {
    out(JSON.stringify({ declared, targets, baseScreenHints: summary, hints }, null, 2));
    process.exit(0);
  }
  out('Targets');
  for (const t of declared) out(`  ${String(t.platform).padEnd(16)} ${String(t.library).padEnd(40)} declared in appdimens.config.json`);
  if (!targets.length && !declared.length) out('  none detected: ask the user which platform this is for.');
  for (const t of targets) out(`  ${t.platform.padEnd(16)} ${t.library.padEnd(40)} ${t.evidence}`);
  out('\nBase screen evidence (screens were built/previewed at)');
  if (!summary.length) out('  none found: use the config, a single unambiguous design frame, or ask.');
  const total = summary.reduce((n, g) => n + g.count, 0);
  for (const g of summary)
    out(`  ${`${fmt(g.width)}×${fmt(g.height)}`.padEnd(12)} ×${g.count} (${Math.round((g.count / total) * 100)} %)  ${g.devices.join(', ') || ''} (${g.kinds.join(', ')})`);
  if (summary.length && summary[0].count / total >= 0.8) out(`  → dominant: ${fmt(summary[0].width)}×${fmt(summary[0].height)} (≥ 80 %): use it as "assumed, unconfirmed".`);
  else if (summary.length > 1) out('  → no dominant size (< 80 %): ask which base the app uses.');
  if (hints.some((h) => h.kind === 'html-device-frame')) out('  note: a prototype device frame was found — subtract its fake status bar / home indicator from the height before height-based conversions.');
  for (const h of hints.filter((x) => x.unknown)) out(`  ? ${h.label} at ${h.file}:${h.line} (not in catalog: check its size)`);
  process.exit(0);
}

if (command === 'validate') {
  const reports = [];
  if (flags.intent) {
    for (const file of [flags.intent, ...rest]) {
      let data;
      try {
        data = JSON.parse(readFileSync(file, 'utf8'));
      } catch (e) {
        reports.push({ file, kind: 'layout-intent', errors: [{ path: '/', message: e.code === 'ENOENT' ? 'file not found' : `not valid JSON: ${e.message}` }] });
        continue;
      }
      reports.push({ file, kind: 'layout-intent', errors: validateIntents(data) });
    }
  } else {
    const file = rest[0] || findProject(process.cwd()).configPath || (existsSync(join(process.cwd(), 'appdimens.config.json')) ? join(process.cwd(), 'appdimens.config.json') : null);
    if (!file) fail('validate: no appdimens.config.json found from the current folder; pass its path.');
    reports.push({ file, kind: 'config', errors: loadConfig(file).errors });
  }
  if (flags.json) out(JSON.stringify(reports, null, 2));
  else
    for (const r of reports)
      out(r.errors.length ? `✖ ${r.file} (${r.kind}): ${r.errors.length} error(s)\n${r.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n')}` : `✔ ${r.file} (${r.kind}) is valid`);
  process.exit(reports.some((r) => r.errors.length) ? 1 : 0);
}

fail(`Unknown command "${command}".\n\n${USAGE}`);
