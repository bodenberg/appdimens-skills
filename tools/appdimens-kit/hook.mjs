#!/usr/bin/env node
// Claude Code PostToolUse hook: lints the file that Write/Edit/MultiEdit just changed.
// - errors   → exit 2, message on stderr (Claude sees it and must fix it)
// - warnings → exit 0 with additionalContext (Claude sees it, the edit is not blocked)
// - files outside an AppDimens project → silent
import { lintFiles } from './lib/lint.mjs';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input || '{}');
  } catch {
    process.exit(0);
  }
  const file = payload?.tool_input?.file_path || payload?.tool_input?.notebook_path;
  if (!file) process.exit(0);

  let results;
  try {
    results = lintFiles([file]);
  } catch {
    process.exit(0); // never break the session because of the linter
  }
  const findings = results.flatMap((r) => r.findings);
  if (!findings.length) process.exit(0);

  const fmt = (f) => `  ${f.line}:${f.col} ${f.severity} ${f.message} [${f.rule}]`;
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity !== 'error');

  if (errors.length) {
    process.stderr.write(
      `appdimens-kit found ${errors.length} error(s) in ${file}:\n${errors.map(fmt).join('\n')}` +
        (warnings.length ? `\nand ${warnings.length} warning(s):\n${warnings.map(fmt).join('\n')}` : '') +
        `\nFix them (see the appdimens-layout-intent skill), or mark a deliberate fixed value with "ad:fixed <reason>".\n`,
    );
    process.exit(2);
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          `appdimens-kit: ${warnings.length} warning(s) in ${file}:\n${warnings.map(fmt).join('\n')}\n` +
          'Use the project policy tokens, or mark deliberate fixed values with "ad:fixed <reason>".',
      },
    }),
  );
  process.exit(0);
});
