#!/usr/bin/env node
// appdimens-skills — install the AppDimens skills into your agentic clients and IDEs.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { detectAgents } from '../installer/agents.mjs';
import { ROOT, VERSION, catalog, execute, plan, suggestedPlatforms, resolveSkill, uninstall } from '../installer/install.mjs';
import { colors as c, confirm, multiselect, select } from '../installer/prompt.mjs';

const HELP = `appdimens-skills ${VERSION}

Usage
  npx appdimens-skills                 interactive install (detects your agents and project)
  npx appdimens-skills install [options]
  npx appdimens-skills detect          agentic clients/IDEs installed here + project platforms
  npx appdimens-skills list            available skills and agents (ids for --skills / --agents)
  npx appdimens-skills uninstall [--global] [--dir <project>]
  npx appdimens-skills kit <command>   the appdimens-kit CLI (lint, normalize, compare, detect, devices)

Install options (any of them skips the matching question; --yes accepts defaults for the rest)
  --agents <ids|all|detected>   claude-code, codex, gemini-cli, openclaw, hermes, cursor, copilot, windsurf, agents
  --skills <ids|all|detected>   platform/workflow skills, e.g. android,web,code-edit (core is always installed)
  --global                      install for your user (~/) instead of this project
  --dir <path>                  project folder (default: current folder)
  --no-hook                     don't add the Claude Code validation hook
  --no-config                   don't create appdimens.config.json
  --yes, -y                     non-interactive: accept defaults
  --dry-run                     show what would be written
`;

function parse(argv) {
  const f = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-y' || a === '--yes') f.yes = true;
    else if (a === '-h' || a === '--help') f.help = true;
    else if (['--global', '--dry-run', '--no-hook', '--no-config', '--json'].includes(a)) f[a.slice(2)] = true;
    else if (a.startsWith('--')) f[a.slice(2)] = argv[++i];
    else f._.push(a);
  }
  return f;
}

const f = parse(process.argv.slice(2));
const cmd = f._[0] || 'install';
const projectDir = resolve(f.dir || process.cwd());
const list = (v) => String(v).split(',').map((s) => s.trim()).filter(Boolean);

function printDetect() {
  const agents = detectAgents(projectDir);
  console.log(c.bold('Agentic clients / IDEs'));
  for (const a of agents.filter((x) => x.id !== 'agents'))
    console.log(`  ${a.installed || a.inProject ? c.green('●') : c.dim('○')} ${a.name.padEnd(30)} ${c.dim(a.evidence.join(', ') || 'not found')}`);
  const plats = suggestedPlatforms(projectDir);
  console.log(`\n${c.bold('Project platforms')} ${c.dim(projectDir)}`);
  console.log(plats.length ? plats.map((p) => `  ● ${p}`).join('\n') : c.dim('  none detected'));
}

if (f.help || cmd === 'help') {
  process.stdout.write(HELP);
  process.exit(0);
}

if (cmd === 'kit') {
  const r = spawnSync(process.execPath, [join(ROOT, 'tools', 'appdimens-kit', 'cli.mjs'), ...process.argv.slice(3)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

if (cmd === 'detect') {
  printDetect();
  process.exit(0);
}

if (cmd === 'list') {
  console.log(c.bold('Skills') + c.dim('  (--skills ids)'));
  for (const s of catalog()) console.log(`  ${s.id.padEnd(16)} ${c.dim(s.group.padEnd(9))} ${s.summary}`);
  console.log('\n' + c.bold('Agents') + c.dim('  (--agents ids)'));
  for (const a of detectAgents(projectDir)) console.log(`  ${a.id.padEnd(16)} ${a.name.padEnd(48)} ${c.dim([a.project ? 'project' : null, a.global ? 'global' : null].filter(Boolean).join(' · '))}`);
  process.exit(0);
}

if (cmd === 'uninstall' || cmd === 'remove') {
  const kit = f.global ? join(process.env.HOME || process.env.USERPROFILE, '.appdimens') : join(projectDir, '.appdimens');
  try {
    const removed = uninstall(kit);
    console.log(`${c.green('✔')} removed ${removed.length} file(s) and ${kit}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  process.exit(0);
}

if (cmd !== 'install' && cmd !== 'add') {
  console.error(`Unknown command "${cmd}".\n\n${HELP}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------------------------
// install

const interactive = process.stdin.isTTY && process.stdout.isTTY && !f.yes;
const detected = detectAgents(projectDir);
const skills = catalog();
const suggested = suggestedPlatforms(projectDir);

try {
  console.log(`${c.bold('AppDimens skills')} ${c.dim('v' + VERSION)} — base screen + layout intent for AI agents\n`);

  // scope
  let scope = f.global ? 'global' : f.dir || !interactive ? 'project' : null;
  if (!scope)
    scope = await select('Install for', [
      { label: 'This project', value: 'project', hint: projectDir },
      { label: 'My user (all projects)', value: 'global', hint: '~/' },
    ]);

  // agents
  let agents;
  if (f.agents) agents = f.agents === 'all' ? detected.map((a) => a.id) : f.agents === 'detected' ? detected.filter((a) => a.installed || a.inProject).map((a) => a.id) : list(f.agents);
  else {
    const def = detected.filter((a) => a.installed || a.inProject).map((a) => a.id);
    if (interactive)
      agents = await multiselect(
        'Which agents / IDEs?',
        detected.map((a) => ({
          label: a.name,
          short: a.id,
          value: a.id,
          checked: def.includes(a.id),
          hint: [a.installed ? 'installed' : a.inProject ? 'used in project' : '', (scope === 'global' ? a.global : a.project) ? '' : scope === 'global' ? '(project only)' : a.global ? '(user-level only)' : ''].filter(Boolean).join(' '),
        })),
      );
    else agents = def.length ? def : ['agents'];
  }
  if (!agents.length) throw new Error('No agent selected.');

  // skills
  let chosen;
  const optional = skills.filter((s) => s.group !== 'core');
  if (f.skills) {
    const wanted = f.skills === 'all' ? optional.map((s) => s.dir) : f.skills === 'detected' ? [...optional.filter((s) => s.group === 'workflow').map((s) => s.dir), ...suggested] : list(f.skills).map((id) => resolveSkill(id)?.dir ?? (() => { throw new Error(`Unknown skill "${id}". Run: appdimens-skills list`); })());
    chosen = wanted;
  } else {
    const defaults = new Set([...optional.filter((s) => s.group === 'workflow').map((s) => s.dir), ...(suggested.length ? suggested : optional.filter((s) => s.group === 'platform').map((s) => s.dir))]);
    if (interactive)
      chosen = await multiselect(
        'Which skills?',
        skills.map((s) => ({
          label: `${s.id.padEnd(15)} ${c.dim(s.summary)}`,
          short: s.id,
          value: s.dir,
          locked: s.group === 'core',
          checked: s.group === 'core' || defaults.has(s.dir),
          hint: s.group === 'core' ? 'core · always installed' : s.group === 'workflow' ? 'workflow' : suggested.includes(s.dir) ? 'platform · detected in project' : 'platform',
        })),
      );
    else chosen = [...defaults];
  }

  // hook / config
  let hook = !f['no-hook'] && agents.includes('claude-code');
  if (hook && interactive && !f['no-hook']) hook = await confirm('Add the Claude Code validation hook (lints each edit)?');
  let config = !f['no-config'] && scope === 'project' && !existsSync(join(projectDir, 'appdimens.config.json'));
  if (config && interactive) config = await confirm('Create appdimens.config.json (project contract) now?');

  const p = plan({ projectDir, scope, agents, skills: chosen, hook, config });

  console.log(`\n${c.bold('Plan')} ${c.dim(`(${scope})`)}`);
  for (const op of p.ops) console.log(`  ${c.cyan(op.type.padEnd(11))} ${op.dest.replace(process.env.HOME || '~', '~')}${op.agents ? c.dim('  ← ' + op.agents.join(', ')) : ''}`);
  for (const n of p.notes) console.log(`  ${c.dim('note:')} ${n}`);
  if (f['dry-run']) process.exit(0);
  if (interactive && !(await confirm('Install?'))) process.exit(0);

  const written = execute(p);
  console.log(`\n${c.green('✔')} Installed ${p.skills.length} skills for ${agents.length} agent(s) — ${written.length} files.`);
  console.log(c.dim(`  Kit: ${p.kitAbs}  ·  Validate: npx appdimens-skills kit lint <files>  ·  Remove: npx appdimens-skills uninstall${scope === 'global' ? ' --global' : ''}`));
  if (agents.includes('claude-code')) console.log(c.dim('  Claude Code users can also install the plugin: /plugin marketplace add bodenberg/appdimens-skills'));
} catch (e) {
  if (e.message === 'Aborted') process.exit(130);
  console.error(`✖ ${e.message}`);
  process.exit(1);
}
