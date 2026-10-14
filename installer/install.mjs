// Installs the AppDimens skills into the selected agentic clients / IDEs.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS, HOME, findAgent } from './agents.mjs';
import { parseSkill, rewriteFlat, rewriteSkillCopy } from './rewrite.mjs';
import { detectTargets } from '../tools/appdimens-kit/lib/project.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
const START = '<!-- appdimens-skills:start -->';
const END = '<!-- appdimens-skills:end -->';

// ---------------------------------------------------------------------------------------------
// Skill catalog

const GROUPS = {
  'appdimens-layout-intent': 'core',
  'appdimens-design-to-code': 'workflow',
  'appdimens-claude-design': 'workflow',
  'appdimens-code-edit': 'workflow',
  'appdimens-new-screen': 'workflow',
};
const PLATFORM_OF_TARGET = {
  'android-compose': 'appdimens-android',
  'android-views': 'appdimens-android',
  'android-xml': 'appdimens-android-xml',
  kmp: 'appdimens-kmp',
  apple: 'appdimens-apple',
  flutter: 'appdimens-flutter',
  'react-native': 'appdimens-react-native',
  web: 'appdimens-web',
  'dotnet-maui': 'appdimens-dotnet',
  'dotnet-desktop': 'appdimens-dotnet',
  'dotnet-android': 'appdimens-dotnet',
  games: 'appdimens-games',
};
const LIBRARY_OF_TARGET = {
  'android-compose': 'appdimens-dynamic',
  'android-views': 'appdimens-dynamic',
  'android-xml': 'appdimens-sdps',
  kmp: 'appdimens-kmp',
  apple: 'appdimens-ios',
  flutter: 'appdimens-flutter',
  'react-native': 'appdimens-react-native',
  web: 'webdimens',
  'dotnet-maui': 'appdimens-net-sdps',
  'dotnet-desktop': 'appdimens-net',
  'dotnet-android': 'appdimens-net-android',
  games: 'appdimens-games',
};
const SUMMARY = {
  'appdimens-layout-intent': 'base screen, layout intent, decision table, platform router',
  'appdimens-design-to-code': 'implement from Figma, screenshots or specs',
  'appdimens-claude-design': 'implement or create the project from Claude Design screens',
  'appdimens-code-edit': 'apply AppDimens to existing screens',
  'appdimens-new-screen': 'create new screens directly with AppDimens',
  'appdimens-android': 'Jetpack Compose / Views — appdimens-dynamic',
  'appdimens-android-xml': 'XML @dimen — appdimens-sdps + appdimens-ssps',
  'appdimens-kmp': 'Kotlin / Compose Multiplatform — appdimens-kmp',
  'appdimens-apple': 'SwiftUI / UIKit / AppKit — appdimens-ios',
  'appdimens-flutter': 'Flutter — appdimens_flutter',
  'appdimens-react-native': 'React Native / Expo — appdimens-react-native',
  'appdimens-web': 'HTML/CSS, React, Vue, Svelte, Angular — webdimens',
  'appdimens-dotnet': 'MAUI, WPF, WinForms, WinUI, .NET for Android — appdimens-net-binding',
  'appdimens-games': 'Android games, NDK, Vulkan, Unity — appdimens-games',
};
// Cursor / Windsurf / Copilot auto-attach globs for platform skills.
const GLOBS = {
  'appdimens-android': '**/*.kt',
  'appdimens-android-xml': '**/res/**/*.xml',
  'appdimens-kmp': '**/commonMain/**/*.kt',
  'appdimens-apple': '**/*.swift',
  'appdimens-flutter': '**/*.dart',
  'appdimens-web': '**/*.{css,scss,html,vue,svelte,astro}',
  'appdimens-dotnet': '**/*.xaml',
};

export function catalog() {
  return readdirSync(join(ROOT, 'skills'))
    .filter((d) => existsSync(join(ROOT, 'skills', d, 'SKILL.md')))
    .map((d) => {
      const s = parseSkill(readFileSync(join(ROOT, 'skills', d, 'SKILL.md'), 'utf8'), d);
      return { ...s, id: d.replace(/^appdimens-/, ''), group: GROUPS[d] || 'platform', summary: SUMMARY[d] || s.description.split(/(?<=\.)\s|—/)[0].slice(0, 90) };
    })
    .sort((a, b) => ['core', 'workflow', 'platform'].indexOf(a.group) - ['core', 'workflow', 'platform'].indexOf(b.group) || a.dir.localeCompare(b.dir));
}

/** Platform skills suggested by the project's build files. */
export function suggestedPlatforms(projectDir) {
  return [...new Set(detectTargets(projectDir).map((t) => PLATFORM_OF_TARGET[t.platform]).filter(Boolean))];
}

export function resolveSkill(id) {
  const all = catalog();
  return all.find((s) => s.dir === id || s.id === id || s.dir === `appdimens-${id}`);
}

// ---------------------------------------------------------------------------------------------
// Plan

/**
 * opts: { projectDir, scope: 'project'|'global', agents: [ids], skills: [dirs], hook, config }
 * Returns a list of operations; nothing is written until execute().
 */
export function plan(opts) {
  const projectDir = resolve(opts.projectDir || process.cwd());
  const scope = opts.scope || 'project';
  const kitAbs = scope === 'global' ? join(HOME, '.appdimens') : join(projectDir, '.appdimens');
  const kitRef = scope === 'global' ? kitAbs : '.appdimens'; // how instructions refer to the kit
  const all = catalog();
  const skills = all.filter((s) => s.group === 'core' || opts.skills.includes(s.dir));
  const ops = [];
  const notes = [];
  const at = (p) => (p.startsWith('/') || /^[A-Z]:\\/.test(p) ? p : join(projectDir, p));

  // 1. the kit: skills (for flat formats' links), CLI, schemas
  ops.push({ type: 'kit', dest: kitAbs, skills: skills.map((s) => s.dir) });

  // 2. per agent
  const skillDirsDone = new Map(); // dest → [agent names]
  for (const id of opts.agents) {
    const a = findAgent(id);
    if (!a) throw new Error(`Unknown agent "${id}". Run: appdimens-skills list`);
    let target = scope === 'global' ? a.global : a.project;
    let agentScope = scope;
    if (!target && a.global && scope === 'project') {
      target = a.global;
      agentScope = 'global';
      notes.push(`${a.name} only reads skills from ${a.global.replace(HOME, '~')}; installed there.`);
    }
    if (!target) {
      notes.push(`${a.name} has no ${scope}-level location on disk; skipped (install at project scope instead).`);
      continue;
    }
    const dest = at(target);
    if (a.kind === 'skills') {
      if (skillDirsDone.has(dest)) skillDirsDone.get(dest).push(a.name);
      else {
        skillDirsDone.set(dest, [a.name]);
        ops.push({ type: 'skills', dest, agents: skillDirsDone.get(dest), skills: skills.map((s) => s.dir), kitRef: agentScope !== scope ? kitAbs : kitRef });
      }
    } else ops.push({ type: a.kind, dest, agents: [a.name], skills: skills.map((s) => s.dir), kitRef });
    if (a.agentsMd) ops.push({ type: 'agents-md', dest: at(scope === 'global' ? a.agentsMd.global : a.agentsMd.project), skills: skills.map((s) => s.dir), kitRef });
    if (a.hook && opts.hook) {
      const settings = scope === 'global' ? join(HOME, '.claude', 'settings.json') : join(projectDir, '.claude', 'settings.json');
      const cmd = scope === 'global' ? `node "${join(kitAbs, 'tools', 'appdimens-kit', 'hook.mjs')}"` : 'node "$CLAUDE_PROJECT_DIR/.appdimens/tools/appdimens-kit/hook.mjs"';
      ops.push({ type: 'claude-hook', dest: settings, command: cmd });
    }
  }

  // 3. project contract
  if (opts.config && scope === 'project' && !existsSync(join(projectDir, 'appdimens.config.json'))) {
    const targets = detectTargets(projectDir).filter((t) => LIBRARY_OF_TARGET[t.platform]);
    const seen = new Set();
    const list = targets.filter((t) => !seen.has(t.platform) && seen.add(t.platform)).map((t) => ({ platform: t.platform, library: LIBRARY_OF_TARGET[t.platform] }));
    ops.push({
      type: 'config',
      dest: join(projectDir, 'appdimens.config.json'),
      content: {
        $schema: './.appdimens/schemas/appdimens.config.schema.json',
        targets: list.length ? list : [{ platform: 'android-compose', library: 'appdimens-dynamic' }],
        formFactors: ['phone'],
        design: { normalization: 'match-base' },
      },
    });
    if (!list.length) notes.push('No platform detected: appdimens.config.json was created with an android-compose placeholder target — edit it.');
  }
  return { projectDir, scope, kitAbs, ops, notes, skills: skills.map((s) => s.dir) };
}

// ---------------------------------------------------------------------------------------------
// Execute

function copyDir(src, dest, filter, written) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const s = join(src, name);
    const d = join(dest, name);
    if (filter && !filter(s)) continue;
    if (statSync(s).isDirectory()) copyDir(s, d, filter, written);
    else {
      cpSync(s, d);
      written.push(d);
    }
  }
}

function write(path, content, written) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  written.push(path);
}

function rewriteTree(dir, kitRef) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) rewriteTree(p, kitRef);
    else if (f.name.endsWith('.md')) writeFileSync(p, rewriteSkillCopy(readFileSync(p, 'utf8'), kitRef));
  }
}

const header = (src) => `<!-- appdimens-skills ${VERSION} — generated from ${src}. Reinstall to update. -->`;

function gateText(kitRef) {
  return [
    'In a project that depends on AppDimens (appdimens-*, webdimens, Bodenberg.AppDimens.*, AppDimens.Net), before writing or converting UI sizes:',
    '',
    `1. Base screen: use \`appdimens.config.json → design.baseScreen\`; else one unambiguous source (a design frame, ≥ 80 % of previews, a "designed at W×H" comment — \`node ${kitRef}/tools/appdimens-kit/cli.mjs detect <app folder>\`, or the platform default for new screens) stated as "assumed, unconfirmed"; else ask (one message, ≤ 5 questions).`,
    `2. Never re-label a number (\`16.dp\` → \`16.sdp\` grows 20–47 % on phones). Convert with \`node ${kitRef}/tools/appdimens-kit/cli.mjs normalize --device <base> --strategy <s> <values…>\` (\`--theme\` theme tokens, \`--text\` fonts (exact), \`--xml\` Android XML, \`--axis h\` hdp, \`--density\` px frames).`,
    '3. Decide each element\'s intent (role, fill/hug, scroll, fixed) before choosing tokens. Hairlines, elevation and platform chrome stay fixed; touch targets: visual size is a token, the hit area uses the platform API.',
    `4. Follow ${kitRef}/skills/appdimens-layout-intent/SKILL.md and the platform skill; validate with \`node ${kitRef}/tools/appdimens-kit/cli.mjs lint <files>\`.`,
  ].join('\n');
}

function agentsMdSection(skills, kitRef) {
  const all = catalog().filter((s) => skills.includes(s.dir));
  const core = all.find((s) => s.dir === 'appdimens-layout-intent');
  return [
    START,
    '## AppDimens — base screen, layout intent and responsive sizing',
    '',
    `This project uses AppDimens. The kit is in \`${kitRef}/\`. Before writing, converting, reviewing or editing UI sizes, follow the core workflow below, then **read the matching skill file** and follow it.`,
    '',
    '| When | Read |',
    '|---|---|',
    ...all.filter((s) => s !== core).map((s) => `| ${s.description.split('. ')[0].replace(/\|/g, '\\|')}. | \`${kitRef}/skills/${s.dir}/SKILL.md\` |`),
    '',
    `Validate every change: \`node ${kitRef}/tools/appdimens-kit/cli.mjs lint <changed files>\`.`,
    '',
    '### Core workflow (appdimens-layout-intent)',
    '',
    rewriteFlat(core.body, core.dir, kitRef).replace(/^# .*\n/, '').replace(/^## /gm, '#### '),
    END,
  ].join('\n');
}

function mergeSection(path, section, written) {
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const next = current.includes(START)
    ? current.slice(0, current.indexOf(START)) + section + current.slice(current.indexOf(END) + END.length)
    : `${current}${current && !current.endsWith('\n') ? '\n' : ''}${current ? '\n' : ''}${section}\n`;
  write(path, next, []);
  written.push(`${path}#appdimens-section`);
}

function mergeHook(path, command, written) {
  let settings = {};
  if (existsSync(path)) {
    try {
      settings = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      throw new Error(`${path} is not valid JSON; add the hook manually: ${command}`);
    }
  }
  settings.hooks ??= {};
  settings.hooks.PostToolUse ??= [];
  const exists = settings.hooks.PostToolUse.some((e) => (e.hooks || []).some((h) => String(h.command).includes('appdimens-kit/hook.mjs')));
  if (!exists) settings.hooks.PostToolUse.push({ matcher: 'Write|Edit|MultiEdit', hooks: [{ type: 'command', command, timeout: 15 }] });
  write(path, JSON.stringify(settings, null, 2) + '\n', []);
  written.push(`${path}#appdimens-hook`);
}

export function execute(p) {
  const written = [];
  const skillsSrc = join(ROOT, 'skills');
  for (const op of p.ops) {
    if (op.type === 'kit') {
      for (const s of op.skills) copyDir(join(skillsSrc, s), join(op.dest, 'skills', s), null, written);
      copyDir(join(ROOT, 'tools', 'appdimens-kit'), join(op.dest, 'tools', 'appdimens-kit'), (src) => !src.includes(`${join('appdimens-kit', 'test')}`), written);
      copyDir(join(ROOT, 'schemas'), join(op.dest, 'schemas'), null, written);
      // the kit's own copies of the skills point at the kit itself
      rewriteTree(join(op.dest, 'skills'), p.scope === 'project' ? '.appdimens' : op.dest);
      write(join(op.dest, 'package.json'), JSON.stringify({ type: 'module', private: true, name: 'appdimens-kit-local' }, null, 2) + '\n', written);
    } else if (op.type === 'skills') {
      for (const s of op.skills) {
        copyDir(join(skillsSrc, s), join(op.dest, s), null, written);
        rewriteTree(join(op.dest, s), op.kitRef);
      }
    } else if (op.type === 'cursor') {
      const skills = catalog().filter((s) => op.skills.includes(s.dir));
      write(join(op.dest, 'appdimens-00-gate.mdc'), ['---', 'description: AppDimens gate — base screen and layout intent before any responsive size', 'globs: ', 'alwaysApply: true', '---', header('skills/appdimens-layout-intent'), gateText(op.kitRef), ''].join('\n'), written);
      for (const s of skills)
        write(join(op.dest, `${s.dir}.mdc`), ['---', `description: ${s.description}`, `globs: ${GLOBS[s.dir] ?? ''}`, 'alwaysApply: false', '---', header(`skills/${s.dir}/SKILL.md`), '', rewriteFlat(s.body, s.dir, op.kitRef), ''].join('\n'), written);
    } else if (op.type === 'copilot') {
      const skills = catalog().filter((s) => op.skills.includes(s.dir));
      write(join(op.dest, 'appdimens-00-gate.instructions.md'), ['---', 'applyTo: "**/*.{kt,kts,xml,swift,dart,ts,tsx,js,jsx,css,scss,html,vue,svelte,astro,xaml,cs}"', 'description: AppDimens gate — base screen and layout intent before any responsive size', '---', header('skills/appdimens-layout-intent'), '', gateText(op.kitRef), ''].join('\n'), written);
      for (const s of skills)
        write(join(op.dest, `${s.dir}.instructions.md`), ['---', ...(GLOBS[s.dir] ? [`applyTo: "${GLOBS[s.dir]}"`] : []), `description: ${JSON.stringify(s.description)}`, '---', header(`skills/${s.dir}/SKILL.md`), '', rewriteFlat(s.body, s.dir, op.kitRef), ''].join('\n'), written);
    } else if (op.type === 'windsurf') {
      const skills = catalog().filter((s) => op.skills.includes(s.dir));
      write(join(op.dest, 'appdimens-00-gate.md'), ['---', 'trigger: always_on', 'description: AppDimens gate — base screen and layout intent before any responsive size', '---', '', gateText(op.kitRef), ''].join('\n'), written);
      for (const s of skills)
        write(join(op.dest, `${s.dir}.md`), ['---', GLOBS[s.dir] ? 'trigger: glob' : 'trigger: model_decision', `description: ${JSON.stringify(s.description)}`, ...(GLOBS[s.dir] ? [`globs: ${GLOBS[s.dir]}`] : []), '---', '', rewriteFlat(s.body, s.dir, op.kitRef), ''].join('\n'), written);
    } else if (op.type === 'agents-md') {
      mergeSection(op.dest, agentsMdSection(op.skills, op.kitRef), written);
    } else if (op.type === 'claude-hook') {
      mergeHook(op.dest, op.command, written);
    } else if (op.type === 'config') {
      write(op.dest, JSON.stringify(op.content, null, 2) + '\n', written);
    }
  }
  const manifest = { version: VERSION, scope: p.scope, projectDir: p.projectDir, skills: p.skills, ops: p.ops.map(({ type, dest }) => ({ type, dest })), files: written };
  write(join(p.kitAbs, 'install-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', []);
  return written;
}

// ---------------------------------------------------------------------------------------------
// Uninstall (uses the manifest written by execute)

export function uninstall(kitAbs) {
  const mf = join(kitAbs, 'install-manifest.json');
  if (!existsSync(mf)) throw new Error(`No install manifest at ${mf}.`);
  const m = JSON.parse(readFileSync(mf, 'utf8'));
  const removed = [];
  for (const f of m.files) {
    if (f.endsWith('#appdimens-section')) {
      const p = f.replace(/#appdimens-section$/, '');
      if (!existsSync(p)) continue;
      const s = readFileSync(p, 'utf8');
      if (s.includes(START)) {
        const next = (s.slice(0, s.indexOf(START)) + s.slice(s.indexOf(END) + END.length)).replace(/\n{3,}/g, '\n\n').trim();
        if (next) writeFileSync(p, next + '\n');
        else rmSync(p);
        removed.push(p);
      }
    } else if (f.endsWith('#appdimens-hook')) {
      const p = f.replace(/#appdimens-hook$/, '');
      if (!existsSync(p)) continue;
      const s = JSON.parse(readFileSync(p, 'utf8'));
      s.hooks.PostToolUse = (s.hooks?.PostToolUse || []).filter((e) => !(e.hooks || []).some((h) => String(h.command).includes('appdimens-kit/hook.mjs')));
      if (!s.hooks.PostToolUse.length) delete s.hooks.PostToolUse;
      if (!Object.keys(s.hooks).length) delete s.hooks;
      if (Object.keys(s).length) writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
      else rmSync(p);
      removed.push(p);
    } else if (existsSync(f) && !f.endsWith('appdimens.config.json')) {
      rmSync(f, { force: true });
      removed.push(f);
    }
  }
  // empty skill folders left behind
  for (const op of m.ops) if (op.type === 'skills') for (const s of m.skills) rmSync(join(op.dest, s), { recursive: true, force: true });
  rmSync(kitAbs, { recursive: true, force: true });
  // prune folders the install created and left empty (.claude/skills, .cursor/rules, …)
  const stop = new Set([resolve(m.projectDir), HOME, dirname(HOME)]);
  const prune = (dir) => {
    while (dir && !stop.has(dir) && existsSync(dir) && statSync(dir).isDirectory() && !readdirSync(dir).length) {
      rmSync(dir, { recursive: true, force: true });
      dir = dirname(dir);
    }
  };
  for (const f of [...m.files.map((x) => x.replace(/#appdimens-(section|hook)$/, '')), ...m.ops.map((o) => o.dest)]) prune(dirname(f));
  for (const o of m.ops) prune(o.dest);
  return removed;
}

export { AGENTS };
