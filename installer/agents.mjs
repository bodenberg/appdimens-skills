// Agentic clients and IDEs the kit can be installed into, where each one reads skills or rules,
// and how to tell whether it is installed on this machine or already used by this project.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

export const HOME = homedir();
const home = (...p) => join(HOME, ...p);

/**
 * kind:
 *   skills   — Agent Skills folders (SKILL.md + references), copied as-is
 *   cursor   — Cursor rules (.cursor/rules/*.mdc)
 *   copilot  — GitHub Copilot path-specific instructions (.github/instructions/*.instructions.md)
 *   windsurf — Windsurf rules (.windsurf/rules/*.md)
 * project / global: where the files go for each scope (null = scope not supported).
 * agentsMd: also merge the AppDimens section into this AGENTS.md (Codex reads it).
 */
export const AGENTS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    kind: 'skills',
    project: '.claude/skills',
    global: home('.claude', 'skills'),
    hook: true,
    detect: { dirs: [home('.claude')], bins: ['claude'], project: ['.claude', 'CLAUDE.md'] },
    note: 'Also available as a plugin: /plugin marketplace add bodenberg/appdimens-skills',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    kind: 'skills',
    project: '.agents/skills',
    global: home('.agents', 'skills'),
    agentsMd: { project: 'AGENTS.md', global: home('.codex', 'AGENTS.md') },
    detect: { dirs: [home('.codex')], bins: ['codex'], project: ['AGENTS.md', '.codex'] },
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    kind: 'skills',
    project: '.agents/skills', // documented alias of .gemini/skills
    global: home('.agents', 'skills'),
    detect: { dirs: [home('.gemini')], bins: ['gemini'], project: ['.gemini', 'GEMINI.md'] },
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    kind: 'skills',
    project: '.agents/skills', // <workspace>/.agents/skills
    global: home('.openclaw', 'skills'),
    detect: { dirs: [home('.openclaw')], bins: ['openclaw'], project: ['.openclaw'] },
  },
  {
    id: 'hermes',
    name: 'Hermes Agent (Nous Research)',
    kind: 'skills',
    project: null, // Hermes reads skills only from ~/.hermes/skills
    global: home('.hermes', 'skills'),
    detect: { dirs: [home('.hermes')], bins: ['hermes'], project: [] },
  },
  {
    id: 'cursor',
    name: 'Cursor',
    kind: 'cursor',
    project: '.cursor/rules',
    global: null, // global Cursor rules live in the app settings, not on disk
    detect: {
      dirs: [home('.cursor'), '/Applications/Cursor.app', home('AppData', 'Local', 'Programs', 'cursor')],
      bins: ['cursor'],
      project: ['.cursor', '.cursorrules'],
    },
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot (VS Code)',
    kind: 'copilot',
    project: '.github/instructions',
    global: null,
    detect: { dirs: [], extensions: ['github.copilot'], bins: ['code'], project: ['.github/copilot-instructions.md', '.github/instructions'] },
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    kind: 'windsurf',
    project: '.windsurf/rules',
    global: null,
    detect: { dirs: [home('.codeium', 'windsurf'), '/Applications/Windsurf.app'], bins: ['windsurf'], project: ['.windsurf', '.windsurfrules'] },
  },
  {
    id: 'agents',
    name: 'Other agents (.agents/skills standard)',
    kind: 'skills',
    project: '.agents/skills',
    global: home('.agents', 'skills'),
    detect: { dirs: [], bins: [], project: ['.agents/skills'] },
  },
];

function onPath(bin) {
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  return (process.env.PATH || '').split(delimiter).some((d) => d && exts.some((e) => existsSync(join(d, bin + e))));
}

function hasExtension(prefix) {
  for (const dir of [home('.vscode', 'extensions'), home('.vscode-insiders', 'extensions'), home('.cursor', 'extensions')]) {
    try {
      if (readdirSync(dir).some((n) => n.toLowerCase().startsWith(prefix))) return true;
    } catch {
      /* not there */
    }
  }
  return false;
}

/** For each agent: installed on this machine? used in this project? and why. */
export function detectAgents(projectDir = process.cwd()) {
  return AGENTS.map((a) => {
    const evidence = [];
    for (const d of a.detect.dirs || []) if (existsSync(d)) evidence.push(d.replace(HOME, '~'));
    for (const b of a.detect.bins || []) if (onPath(b)) evidence.push(`${b} on PATH`);
    for (const e of a.detect.extensions || []) if (hasExtension(e)) evidence.push(`${e} extension`);
    const inProject = (a.detect.project || []).filter((p) => existsSync(join(projectDir, p)));
    // `code` alone doesn't prove Copilot is installed
    const installed = a.id === 'copilot' ? evidence.some((e) => e.includes('extension')) : evidence.length > 0;
    return { ...a, installed, inProject: inProject.length > 0, evidence: [...evidence, ...inProject.map((p) => `${p} in project`)] };
  });
}

export const findAgent = (id) => AGENTS.find((a) => a.id === id || a.name.toLowerCase() === String(id).toLowerCase());
