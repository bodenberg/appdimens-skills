#!/usr/bin/env node
// Installs the kit into a consumer project for agents that don't use the Claude Code plugin.
//
//   node scripts/install.mjs --target claude|codex|cursor|all <project-dir>
//
// claude : skills → <project>/.claude/skills/, kit → <project>/.appdimens/, prints the hook snippet
// codex  : kit → <project>/.appdimens/, AppDimens section merged into <project>/AGENTS.md
// cursor : kit → <project>/.appdimens/, rules → <project>/.cursor/rules/appdimens-*.mdc
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const ti = args.indexOf('--target');
const target = ti >= 0 ? args[ti + 1] : 'all';
const project = resolve(args.filter((a, i) => a !== '--target' && i !== ti + 1)[0] || '.');

if (!['claude', 'codex', 'cursor', 'all'].includes(target)) {
  console.error('Usage: node scripts/install.mjs --target claude|codex|cursor|all <project-dir>');
  process.exit(2);
}
if (!existsSync(join(root, 'adapters', 'codex', 'AGENTS.md'))) {
  console.error('Adapters missing. Run: node scripts/build-adapters.mjs');
  process.exit(1);
}

const kitDir = join(project, '.appdimens');
function copyKit() {
  mkdirSync(kitDir, { recursive: true });
  for (const d of ['skills', 'schemas', 'tools']) cpSync(join(root, d), join(kitDir, d), { recursive: true, filter: (src) => !src.includes(`${join('test', 'fixtures')}`) });
  console.log(`copied skills, schemas and tools → ${kitDir}`);
}

const START = '<!-- appdimens-skills:start -->';
const END = '<!-- appdimens-skills:end -->';

function installCodex() {
  const section = readFileSync(join(root, 'adapters', 'codex', 'AGENTS.md'), 'utf8');
  const block = section.slice(section.indexOf(START), section.indexOf(END) + END.length);
  const agentsPath = join(project, 'AGENTS.md');
  const current = existsSync(agentsPath) ? readFileSync(agentsPath, 'utf8') : '';
  const next = current.includes(START)
    ? current.slice(0, current.indexOf(START)) + block + current.slice(current.indexOf(END) + END.length)
    : `${current}${current && !current.endsWith('\n') ? '\n' : ''}${current ? '\n' : ''}${block}\n`;
  writeFileSync(agentsPath, next);
  console.log(`updated ${agentsPath}`);
}

function installCursor() {
  const from = join(root, 'adapters', 'cursor', 'rules');
  const to = join(project, '.cursor', 'rules');
  mkdirSync(to, { recursive: true });
  for (const f of readdirSync(from)) cpSync(join(from, f), join(to, f));
  console.log(`copied ${readdirSync(from).length} rules → ${to}`);
}

function installClaude() {
  const to = join(project, '.claude', 'skills');
  mkdirSync(to, { recursive: true });
  for (const d of readdirSync(join(root, 'skills'))) cpSync(join(root, 'skills', d), join(to, d), { recursive: true });
  // In a project copy the kit lives in .appdimens/, not two folders above the skill.
  const fix = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, f.name);
      if (f.isDirectory()) fix(p);
      else if (f.name.endsWith('.md'))
        writeFileSync(p, readFileSync(p, 'utf8')
          .replace(/^Paths: `<package>` is the root of this kit[^\n]*\n\n/m, '')
          .replace(/<(this-)?package>/g, '.appdimens')
          .replace(/`schemas\//g, '`.appdimens/schemas/'));
    }
  };
  fix(to);
  console.log(`copied skills → ${to}`);
  console.log(
    '\nAdd the validation hook to .claude/settings.json (or install the plugin instead: /plugin marketplace add bodenberg/appdimens-skills):\n' +
      JSON.stringify(
        { hooks: { PostToolUse: [{ matcher: 'Write|Edit|MultiEdit', hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.appdimens/tools/appdimens-kit/hook.mjs"' }] }] } },
        null,
        2,
      ),
  );
}

copyKit();
if (target === 'codex' || target === 'all') installCodex();
if (target === 'cursor' || target === 'all') installCursor();
if (target === 'claude' || target === 'all') installClaude();
console.log('\nNext: add appdimens.config.json at the project root (schema: .appdimens/schemas/appdimens.config.schema.json).');
