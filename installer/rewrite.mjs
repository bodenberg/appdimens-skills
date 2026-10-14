// Path rewriting shared by the adapters build and the installer.
// Skills reference the kit as `<package>` (plugin root); a copy installed elsewhere must point
// at the kit folder it was installed with (`.appdimens/` in a project, `~/.appdimens/` globally).

const PATHS_LINE = /^Paths: `<package>` is the root of this kit[^\n]*\n\n/m;

/** For skill folders copied as-is (SKILL.md format): relative links keep working. */
export function rewriteSkillCopy(body, kitDir) {
  return body
    .replace(PATHS_LINE, '')
    .replace(/<(this-)?package>/g, kitDir)
    .replace(/`schemas\//g, `\`${kitDir}/schemas/`);
}

/**
 * For single-file formats (AGENTS.md, Cursor .mdc, Copilot instructions, Windsurf rules):
 * every link must resolve from the repository root, so they point into `<kitDir>/skills/`.
 */
export function rewriteFlat(body, skillDir, kitDir) {
  return body
    .replace(PATHS_LINE, '')
    .replace(/<(this-)?package>/g, kitDir)
    .replace(/(^|[\s(`])references\/([\w.-]+\.md)/gm, (m, pre, f) => (skillDir === 'appdimens-layout-intent' ? `${pre}${kitDir}/skills/appdimens-layout-intent/references/${f}` : m))
    .replace(/\]\((?!https?:|#)(\.\.\/)?([^)]+)\)/g, (_, up, path) => (up ? `](${kitDir}/skills/${path})` : `](${kitDir}/skills/${skillDir}/${path})`))
    .replace(/`\.\.\/appdimens-layout-intent\//g, `\`${kitDir}/skills/appdimens-layout-intent/`)
    .replace(/`schemas\//g, `\`${kitDir}/schemas/`);
}

/** Splits a SKILL.md into its frontmatter fields and body. */
export function parseSkill(raw, dir) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${dir}/SKILL.md has no frontmatter`);
  const meta = Object.fromEntries(
    m[1].split('\n').map((l) => {
      const i = l.indexOf(':');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  return { dir, name: meta.name, description: meta.description, body: m[2].trim() };
}
