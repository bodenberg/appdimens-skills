#!/usr/bin/env node
// Claude Code PostToolUse hook: lints what Write/Edit/MultiEdit just changed.
// - only findings on the lines this edit wrote (legacy code elsewhere never blocks an edit)
// - errors on changed lines → exit 2, message on stderr (Claude must fix them)
// - warnings on changed lines → exit 0 with additionalContext (Claude sees them, not blocked)
// - at most 10 findings are printed; files outside an AppDimens project → silent
// - an invalid appdimens.config.json (the edited one, or the project's) → exit 2: nothing is
//   linted against a contract that fails the schema
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { ConfigError, loadConfig } from './lib/config.mjs';
import { lintFiles } from './lib/lint.mjs';

const MAX = 10;

function changedText(input) {
  if (!input) return null;
  if (typeof input.content === 'string') return input.content; // Write
  if (typeof input.new_string === 'string') return input.new_string; // Edit
  if (Array.isArray(input.edits)) return input.edits.map((e) => e.new_string ?? '').join('\n'); // MultiEdit
  return null;
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.exit(0);
  }
  const file = payload?.tool_input?.file_path;
  if (!file) process.exit(0);

  const configFailed = (e) => {
    process.stderr.write(`appdimens-kit: ${e.message}\nFix appdimens.config.json first (schemas/appdimens.config.schema.json); AppDimens checks are paused until it is valid.\n`);
    process.exit(2);
  };
  if (basename(file) === 'appdimens.config.json') {
    const { errors } = loadConfig(file);
    if (errors.length) configFailed(new ConfigError(file, errors));
    process.exit(0);
  }

  let results;
  let lines;
  try {
    results = lintFiles([file]);
    lines = readFileSync(file, 'utf8').split(/\r?\n/);
  } catch (e) {
    if (e instanceof ConfigError) configFailed(e);
    process.exit(0); // never break the session because of the linter
  }

  const changed = changedText(payload.tool_input);
  const changedSet = changed === null ? null : new Set(changed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  const onChanged = (f) => changedSet === null || changedSet.has((lines[f.line - 1] ?? '').trim());
  const findings = results.flatMap((r) => r.findings).filter(onChanged);
  if (!findings.length) process.exit(0);

  const fmt = (f) => `  ${f.line}:${f.col} ${f.severity} ${f.message} [${f.rule}]`;
  const list = (arr) => arr.slice(0, MAX).map(fmt).join('\n') + (arr.length > MAX ? `\n  … and ${arr.length - MAX} more (run the lint CLI on the file)` : '');
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity !== 'error');

  if (errors.length) {
    process.stderr.write(
      `appdimens-kit: ${errors.length} error(s) in the lines you just wrote in ${file}:\n${list(errors)}` +
        (warnings.length ? `\nand ${warnings.length} warning(s):\n${list(warnings)}` : '') +
        '\nFix them (appdimens-layout-intent skill). Deliberate fixed values carry "ad:fixed <reason>".\n',
    );
    process.exit(2);
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          `appdimens-kit: ${warnings.length} warning(s) in the lines you just wrote in ${file}:\n${list(warnings)}\n` +
          'Convert values from the base screen (never the same number), or mark deliberate fixed values with "ad:fixed <reason>".',
      },
    }),
  );
  process.exit(0);
});
