#!/usr/bin/env node
// appdimens-kit — helpers for AI agents (and humans) implementing AppDimens layouts.
//
//   node cli.mjs lint [--json] [--force] <files or dirs…>
//   node cli.mjs normalize --frame 360 [--height 800] --policy scaled|auto|fluid [--rounding 0.5] <values…>
//   node cli.mjs detect [dir]
import { formatText, lintFiles } from './lib/lint.mjs';
import { normalize } from './lib/factors.mjs';
import { detectTargets } from './lib/project.mjs';

const USAGE = `appdimens-kit

  lint [--json] [--force] <files or dirs…>
      Flags fixed literals that should be AppDimens tokens, strategy tokens without their
      import/module, obsolete APIs, invalid XML resources and JS-only web tokens used in CSS.
      Files outside an AppDimens project are skipped unless --force.
      Exit code 1 when there are errors.

  normalize --frame <w> [--height <h>] --policy <scaled|auto|fluid> [--rounding <step>] [--json] <values…>
      Converts design values drawn on a <w>-wide frame into AppDimens base values
      (base = design / factor), so the build matches the design on a device the size of the frame.

  detect [dir]
      Lists the platform targets found in the repository and the AppDimens library for each.
`;

function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (['json', 'force', 'help'].includes(key)) flags[key] = true;
      else {
        flags[key] = next;
        i++;
      }
    } else rest.push(a);
  }
  return { flags, rest };
}

const [command, ...args] = process.argv.slice(2);
const { flags, rest } = parseFlags(args);

if (!command || command === 'help' || flags.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}

if (command === 'lint') {
  if (!rest.length) {
    process.stderr.write('lint: pass at least one file or directory.\n');
    process.exit(2);
  }
  const results = lintFiles(rest, { force: !!flags.force });
  if (flags.json) {
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
    process.exit(results.some((r) => r.findings.some((f) => f.severity === 'error')) ? 1 : 0);
  }
  const { text, errors } = formatText(results);
  process.stdout.write(text + '\n');
  process.exit(errors ? 1 : 0);
}

if (command === 'normalize') {
  const frame = Number(flags.frame);
  const height = flags.height ? Number(flags.height) : undefined;
  const policy = flags.policy || 'scaled';
  const rounding = flags.rounding ? Number(flags.rounding) : 0.5;
  const values = rest.map(Number).filter((n) => !Number.isNaN(n));
  if (!frame || !values.length) {
    process.stderr.write('normalize: --frame <width> and at least one value are required.\n');
    process.exit(2);
  }
  let out;
  try {
    out = normalize(values, { frame, height, policy, rounding });
  } catch (e) {
    process.stderr.write(`normalize: ${e.message}\n`);
    process.exit(2);
  }
  if (flags.json) {
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.exit(0);
  }
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''));
  const lines = [
    `policy ${policy} · smallest side ${out.smallestSide} · factor ${out.factor.toFixed(4)} · rounding ${rounding}`,
    '',
    '| design | base | on frame |',
    '|-------:|-----:|---------:|',
    ...out.rows.map((r) => `| ${fmt(r.design)} | ${fmt(r.base)} | ${fmt(r.resultOnFrame)} |`),
  ];
  process.stdout.write(lines.join('\n') + '\n');
  process.exit(0);
}

if (command === 'detect') {
  const targets = detectTargets(rest[0] || '.');
  if (flags.json) process.stdout.write(JSON.stringify(targets, null, 2) + '\n');
  else if (!targets.length) process.stdout.write('No platform target detected. Ask the user which platform this is for.\n');
  else for (const t of targets) process.stdout.write(`${t.platform.padEnd(16)} ${t.library.padEnd(40)} ${t.evidence}\n`);
  process.exit(0);
}

process.stderr.write(`Unknown command "${command}".\n\n${USAGE}`);
process.exit(2);
