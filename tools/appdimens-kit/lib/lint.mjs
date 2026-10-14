import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findProject } from './project.mjs';
import { lintText } from './rules.mjs';

const SKIP_DIRS = new Set(['node_modules', '.git', 'build', 'dist', 'out', 'Pods', '.dart_tool', '.gradle', 'bin', 'obj', '.next', '.nuxt', 'DerivedData', '.idea']);

export function collectFiles(paths) {
  const files = [];
  const walk = (p) => {
    let st;
    try {
      st = statSync(p);
    } catch {
      return;
    }
    if (st.isDirectory()) {
      for (const name of readdirSync(p)) if (!SKIP_DIRS.has(name)) walk(join(p, name));
    } else files.push(p);
  };
  paths.forEach(walk);
  return files;
}

/**
 * Lints files. Files outside an AppDimens project are skipped unless `force` is set,
 * so the Claude Code hook stays silent in unrelated repositories.
 */
export function lintFiles(paths, { force = false } = {}) {
  const results = [];
  for (const file of collectFiles(paths)) {
    const project = findProject(file);
    if (!project.enabled && !force) continue;
    const config = project.config && !project.config.__error ? project.config : null;
    if (config?.lint?.ignore?.some((s) => file.includes(s))) continue;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const { lang, findings } = lintText(text, { file, config, project });
    if (!lang) continue;
    const strict = !!config?.lint?.warningsAsErrors;
    const list = strict ? findings.map((f) => ({ ...f, severity: 'error' })) : findings;
    if (project.config?.__error) list.unshift({ line: 1, col: 1, severity: 'error', rule: 'config', message: project.config.__error });
    results.push({ file, lang, findings: list, root: project.root });
  }
  return results;
}

export function formatText(results, cwd = process.cwd()) {
  const lines = [];
  let errors = 0;
  let warnings = 0;
  for (const r of results) {
    if (!r.findings.length) continue;
    lines.push(relative(cwd, r.file) || r.file);
    for (const f of r.findings) {
      if (f.severity === 'error') errors++;
      else warnings++;
      lines.push(`  ${f.line}:${f.col}  ${f.severity.padEnd(7)}  ${f.message}  [${f.rule}]`);
    }
  }
  lines.push(`${errors} error(s), ${warnings} warning(s) in ${results.length} file(s).`);
  return { text: lines.join('\n'), errors, warnings };
}
