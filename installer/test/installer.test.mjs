import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'appdimens-skills.mjs');
const run = (cwd, home, ...args) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home, NO_COLOR: '1' } });

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'ads-'));
  const app = join(root, 'app');
  const home = join(root, 'home');
  mkdirSync(app, { recursive: true });
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(join(home, '.claude', 'settings.json'), '{"theme":"dark"}');
  writeFileSync(join(app, 'package.json'), '{"dependencies":{"react-native":"0.76.0"}}');
  writeFileSync(join(app, 'AGENTS.md'), '# Team rules\n');
  return { app, home };
}

test('detect finds an agent by its home folder', () => {
  const { app, home } = sandbox();
  mkdirSync(join(home, '.hermes'));
  const r = run(app, home, 'detect');
  assert.match(r.stdout, /● Hermes Agent/);
  assert.match(r.stdout, /appdimens-react-native/);
});

test('project install for every agent, idempotent, then clean uninstall', () => {
  const { app, home } = sandbox();
  for (let i = 0; i < 2; i++) assert.equal(run(app, home, 'install', '--agents', 'all', '--skills', 'detected', '--yes').status, 0);
  for (const p of ['.claude/skills/appdimens-layout-intent/SKILL.md', '.agents/skills/appdimens-react-native/SKILL.md', '.cursor/rules/appdimens-00-gate.mdc', '.github/instructions/appdimens-00-gate.instructions.md', '.windsurf/rules/appdimens-00-gate.md', '.appdimens/tools/appdimens-kit/cli.mjs', 'appdimens.config.json'])
    assert.ok(existsSync(join(app, p)), p);
  assert.ok(existsSync(join(home, '.hermes', 'skills', 'appdimens-layout-intent', 'SKILL.md')), 'hermes falls back to ~/.hermes/skills');
  const agentsMd = readFileSync(join(app, 'AGENTS.md'), 'utf8');
  assert.equal(agentsMd.split('appdimens-skills:start').length, 2, 'one section after two installs');
  assert.ok(agentsMd.startsWith('# Team rules'));
  const settings = JSON.parse(readFileSync(join(app, '.claude', 'settings.json'), 'utf8'));
  assert.equal(settings.hooks.PostToolUse.length, 1);
  const skill = readFileSync(join(app, '.claude/skills/appdimens-layout-intent/SKILL.md'), 'utf8');
  assert.ok(!skill.includes('<package>') && skill.includes('.appdimens/tools/appdimens-kit/cli.mjs'));
  assert.equal(run(app, home, 'uninstall').status, 0);
  assert.deepEqual(readdirSync(app).sort(), ['AGENTS.md', 'appdimens.config.json', 'package.json']);
  assert.equal(readFileSync(join(app, 'AGENTS.md'), 'utf8'), '# Team rules\n');
});

test('global install keeps user settings and uninstalls cleanly', () => {
  const { app, home } = sandbox();
  assert.equal(run(app, home, 'install', '--global', '--agents', 'claude-code,openclaw,hermes', '--skills', 'web', '--yes').status, 0);
  assert.ok(existsSync(join(home, '.openclaw', 'skills', 'appdimens-web', 'SKILL.md')));
  const s = JSON.parse(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'));
  assert.equal(s.theme, 'dark');
  assert.match(s.hooks.PostToolUse[0].hooks[0].command, /\.appdimens\/tools\/appdimens-kit\/hook\.mjs/);
  assert.equal(run(app, home, 'uninstall', '--global').status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(home, '.claude', 'settings.json'), 'utf8')), { theme: 'dark' });
  assert.ok(!existsSync(join(home, '.appdimens')));
});

test('kit passthrough and unknown ids', () => {
  const { app, home } = sandbox();
  assert.match(run(app, home, 'kit', 'normalize', '--device', 'medium-phone', '16').stdout, /11\.5/);
  assert.equal(run(app, home, 'install', '--agents', 'nope', '--yes').status, 1);
});
