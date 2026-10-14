#!/usr/bin/env node
// Scores one agent run against a golden case.
//   node evals/score.mjs <case-id> <agent-output.txt> [--asked yes|no]
// The output file is the agent's full answer (intent sheet + code), e.g. from
//   claude -p "<case input>" --output-format text > out.txt
// --asked overrides the question detection (did the agent stop to ask before converting?).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [id, outFile, flag, flagValue] = process.argv.slice(2);
if (!id || !outFile) {
  console.error('Usage: node evals/score.mjs <case-id> <agent-output-file> [--asked yes|no]');
  process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));
const { cases } = JSON.parse(readFileSync(join(here, 'intent-cases.json'), 'utf8'));
const c = cases.find((x) => x.id === id);
if (!c?.assert) {
  console.error(`No case "${id}" with an "assert" block.`);
  process.exit(2);
}
const text = readFileSync(outFile, 'utf8');
const asked = flag === '--asked' ? flagValue === 'yes' : /\?\s*$/m.test(text.slice(0, 1500)) && !/```/.test(text.slice(0, 1500));

let points = 0;
let max = 0;
const lines = [];
for (const re of c.assert.must_match || []) {
  max++;
  const ok = new RegExp(re, 'm').test(text);
  if (ok) points++;
  lines.push(`${ok ? '✓' : '✗'} must match     ${re}`);
}
for (const re of c.assert.must_not_match || []) {
  const hit = new RegExp(re, 'm').test(text);
  if (hit) points--;
  lines.push(`${hit ? '✗' : '✓'} must not match ${re}`);
}
if (typeof c.assert.must_ask === 'boolean') {
  max++;
  const ok = asked === c.assert.must_ask;
  if (ok) points++;
  lines.push(`${ok ? '✓' : '✗'} must ask = ${c.assert.must_ask} (detected ${asked})`);
}
console.log(lines.join('\n'));
console.log(`\n${id}: ${Math.max(points, 0)} / ${max}`);
process.exit(points === max ? 0 : 1);
