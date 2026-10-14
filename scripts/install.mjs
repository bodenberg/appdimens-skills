#!/usr/bin/env node
// Kept for compatibility: use `npx appdimens-skills` (bin/appdimens-skills.mjs) instead.
//   node scripts/install.mjs --target claude|codex|cursor|all <project-dir>
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const ti = args.indexOf('--target');
const target = ti >= 0 ? args[ti + 1] : 'all';
const dir = args.filter((a, i) => a !== '--target' && i !== ti + 1)[0] || '.';
const agents = { claude: 'claude-code', codex: 'codex', cursor: 'cursor', all: 'claude-code,codex,cursor' }[target];
if (!agents) {
  console.error('Usage: node scripts/install.mjs --target claude|codex|cursor|all <project-dir>   (or: npx appdimens-skills)');
  process.exit(2);
}
const bin = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'appdimens-skills.mjs');
const r = spawnSync(process.execPath, [bin, 'install', '--dir', dir, '--agents', agents, '--skills', 'all', '--yes', '--no-config'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
