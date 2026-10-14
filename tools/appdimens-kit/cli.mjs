#!/usr/bin/env node
// appdimens-kit — helpers for AI agents (and humans) implementing AppDimens layouts.
import { formatText, lintFiles } from './lib/lint.mjs';
import { AXIS_STRATEGIES, PREFIX, normalize, percentOf, resolveStrategy } from './lib/factors.mjs';
import { detectTargets } from './lib/project.mjs';
import { devices, findDevice, looksLikePhysicalPx, parseSize } from './lib/devices.mjs';
import { scanBaseHints, summarizeHints } from './lib/basehints.mjs';

const USAGE = `appdimens-kit

  detect [dir] [--json]
      Platform targets + AppDimens library per target, and evidence of the BASE DEVICE the
      existing screens were built/previewed on (Compose @Preview devices, SwiftUI preview
      devices, flutter_screenutil designSize, design-width constants, test viewports).

  devices [--platform android|apple|web] [--json]
      Base-device catalog (logical size in dp / pt / CSS px).

  normalize (--device <id> | --frame <w> [--height <h>]) [--strategy <name>] [--axis s|h|w]
            [--aspect] [--text] [--density <d>] [--dpi <dpi>] [--font-scale <f>]
            [--space w|h|sw] [--rounding <step>] [--json] <values…>
      Converts values measured on the base screen (design values, or dp/pt that existing
      code was tuned with) into AppDimens base values that look the same on that screen:
        base = (value ÷ density) ÷ factor(strategy, base screen)
      --strategy  scaled (default) auto percent power fluid interpolated logarithmic
                  diagonal perimeter fit fill density
      --axis      s (sdp/ssp, smallest side, default) · h (hdp/hsp, height) · w (wdp/wsp, width)
      --aspect    the "a" suffix (sdpa…), which depends on the screen's aspect ratio
      --text      sp kind (ssp…); with --font-scale when the design was measured at a scale ≠ 1
      --density   resolution → logical units (frame 1080×2400 at 2.625 → 411×914 dp)
      --dpi       for the density strategy (default: catalog density × 160)
      --space     literal percentage tokens instead (spaceW / spaceH / spaceSw)

  lint [--json] [--force] <files or dirs…>
      Flags fixed literals that should be tokens, strategy tokens without their import/module,
      obsolete APIs, invalid XML resources, JS-only web tokens in CSS and mixed .NET families.
      Files outside an AppDimens project are skipped unless --force. Exit 1 on errors.
`;

function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (['json', 'force', 'help', 'aspect', 'text'].includes(key)) flags[key] = true;
      else flags[key] = args[++i];
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

const [command, ...args] = process.argv.slice(2);
const { flags, rest } = parseFlags(args);

if (!command || command === 'help' || flags.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

if (command === 'lint') {
  if (!rest.length) fail('lint: pass at least one file or directory.');
  const results = lintFiles(rest, { force: !!flags.force });
  const hasErrors = results.some((r) => r.findings.some((f) => f.severity === 'error'));
  if (flags.json) out(JSON.stringify(results, null, 2));
  else out(formatText(results).text);
  process.exit(hasErrors ? 1 : 0);
}

if (command === 'devices') {
  const list = devices.filter((d) => !flags.platform || d.platform === flags.platform || d.platform === 'any');
  if (flags.json) out(JSON.stringify(list, null, 2));
  else {
    out('| id | device | logical size | smallest side | density |');
    out('|---|---|---|---|---|');
    for (const d of list) out(`| ${d.id} | ${d.name} | ${d.width}×${d.height} | ${Math.min(d.width, d.height)} | ${d.density ?? '—'} |`);
  }
  process.exit(0);
}

if (command === 'normalize') {
  let width;
  let height;
  let deviceName = null;
  let deviceDensity;
  if (flags.device) {
    const d = findDevice(flags.device) || (parseSize(flags.device) && { ...parseSize(flags.device), name: flags.device });
    if (!d) fail(`normalize: unknown device "${flags.device}". Run "devices" for the list, or pass --frame/--height.`);
    ({ width, height } = d);
    deviceName = d.name;
    deviceDensity = d.density;
  } else {
    width = Number(flags.frame);
    height = flags.height ? Number(flags.height) : undefined;
  }
  const strategy = resolveStrategy(flags.strategy || flags.policy || 'scaled');
  const axis = flags.axis || 's';
  const density = flags.density ? Number(flags.density) : 1;
  const rounding = flags.rounding ? Number(flags.rounding) : 0.5;
  const dpi = flags.dpi ? Number(flags.dpi) : deviceDensity ? deviceDensity * 160 : undefined;
  const fontScale = flags['font-scale'] ? Number(flags['font-scale']) : 1;
  const aspect = !!flags.aspect;
  const values = rest.map(Number).filter((n) => !Number.isNaN(n));
  if (!width || !values.length) fail('normalize: --device <id> (or --frame <w>) and at least one value are required.');
  if (!['s', 'h', 'w'].includes(axis)) fail('normalize: --axis must be s, h or w.');

  const warnings = [];
  if (density === 1 && height && looksLikePhysicalPx({ width, height }))
    warnings.push(`${width}×${height} looks like PHYSICAL PIXELS (resolution), not dp/pt. Pass --density (Android 420 dpi = 2.625, 480 dpi = 3, iOS @2x = 2, @3x = 3) or use the logical size.`);
  if (axis === 'h') warnings.push('hdp/hsp scale with height ÷ 300 (not 533): on a 914-tall phone 1.hdp ≈ 3 dp. Use height tokens only for values that must follow screen height; the platform may report the window height without system bars.');
  if (fontScale !== 1) warnings.push(`Text measured at font scale ${fontScale}: divide by it to get the base (ssp multiplies by the user's font scale at runtime).`);

  if (flags.space) {
    const rows = percentOf(values, { frame: width, height, of: flags.space, density, rounding });
    if (flags.json) out(JSON.stringify({ space: flags.space, rows, warnings }, null, 2));
    else {
      const name = { w: 'spaceW', h: 'spaceH', sw: 'spaceSw' }[flags.space];
      out(`literal percentage of ${flags.space} on ${fmt(width / density)}×${fmt(height ? height / density : undefined)} (percent strategy module)`);
      out('\n| on base screen | percent | token | resolves to on base screen |\n|---:|---:|---|---:|');
      for (const r of rows) out(`| ${fmt(r.design)} | ${fmt(r.percent)} | ${fmt(r.percent)}.${name} | ${fmt(r.resultOnFrame)} |`);
      for (const w of warnings) out(`\n⚠ ${w}`);
    }
    process.exit(0);
  }

  let result;
  try {
    const textValues = flags.text ? values.map((v) => v / fontScale) : values;
    result = normalize(textValues, { frame: width, height, strategy, rounding, axis, density, aspect, dpi });
  } catch (e) {
    fail(`normalize: ${e.message}`);
  }
  result.warnings = warnings;
  if (flags.json) {
    out(JSON.stringify(result, null, 2));
    process.exit(0);
  }
  const isText = flags.text;
  const kind = (isText ? { s: 'ssp', h: 'hsp', w: 'wsp' } : { s: 'sdp', h: 'hdp', w: 'wdp' })[AXIS_STRATEGIES.has(strategy) ? axis : 's'];
  const token = `${PREFIX[strategy]}${kind}${aspect ? 'a' : ''}`;
  out(`base screen ${deviceName ? `${deviceName} ` : ''}${fmt(result.baseDevice.width)}×${fmt(result.baseDevice.height)}` +
    `${density !== 1 ? ` (resolution ÷ density ${density})` : ''}${result.aspectRatio ? ` · aspect ${result.aspectRatio.toFixed(2)}` : ''}` +
    ` · ${strategy}${aspect ? ' + a' : ''} reads ${result.axis === 'screen' ? 'the whole screen' : `axis ${axis} = ${fmt(result.axisLength)}`}` +
    ` · factor ${result.factor.toFixed(4)} · rounding ${rounding}`);
  out('');
  out('| on base screen | AppDimens base | token | resolves to on base screen |');
  out('|---:|---:|---|---:|');
  for (const r of result.rows) out(`| ${fmt(r.design)} | ${fmt(r.base)} | ${fmt(r.base)}.${token} | ${fmt(r.resultOnFrame)} |`);
  for (const w of warnings) out(`\n⚠ ${w}`);
  process.exit(0);
}

if (command === 'detect') {
  const dir = rest[0] || '.';
  const targets = detectTargets(dir);
  const hints = scanBaseHints([dir]);
  const summary = summarizeHints(hints);
  if (flags.json) {
    out(JSON.stringify({ targets, baseDeviceHints: summary, hints }, null, 2));
    process.exit(0);
  }
  out('Targets');
  if (!targets.length) out('  none detected: ask the user which platform this is for.');
  for (const t of targets) out(`  ${t.platform.padEnd(16)} ${t.library.padEnd(40)} ${t.evidence}`);
  out('\nBase screen evidence (screens were built/previewed at)');
  if (!summary.length) out('  none found: ask the user (e.g. "Medium Phone 411×914 dp?") before converting values.');
  for (const g of summary)
    out(`  ${`${fmt(g.width)}×${fmt(g.height)}`.padEnd(12)} ×${g.count}  ${g.devices.join(', ') || ''} (${g.kinds.join(', ')})`);
  const unknown = hints.filter((h) => h.unknown);
  for (const h of unknown) out(`  ? ${h.label} at ${h.file}:${h.line} (device not in catalog: check its size)`);
  process.exit(0);
}

fail(`Unknown command "${command}".\n\n${USAGE}`);
