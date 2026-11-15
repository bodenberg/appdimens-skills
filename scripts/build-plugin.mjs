// Builds plugin/ — the folder submitted to the Claude plugin directory (Plugin path: "plugin").
// It holds only what the directory lists: the manifest, the icon, the skills (Markdown), README and
// LICENSE. No hooks, scripts or executables: the validation hook and the CLIs stay in the npm
// package and the root marketplace plugin. `--check` fails when plugin/ is stale.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const manifest = JSON.parse(readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8'));

const README = `# AppDimens skills

Skills that teach Claude how to implement responsive layouts with the AppDimens libraries. Claude first reads the
layout intent of a screen (base screen, which elements scale, which stay fixed, how text grows), then writes it
with the right AppDimens library, unit and strategy for the project: Android (Compose, Views, XML), Kotlin
Multiplatform, SwiftUI / UIKit, Flutter, React Native, Web, .NET, Qt, GTK, LVGL, Roku, Python / Blender and games
(Unity, Unreal, Godot, C/C++).

Included skills: layout intent and the decision table, design-to-code (Figma, screenshots, specs), Claude Design,
editing existing screens, creating new screens, custom scaling strategies, and one skill per AppDimens library.

The skills are plain Markdown. The optional validation CLI and Claude Code hook are installed separately with
\`npx appdimens-skills\` (see https://github.com/bodenberg/appdimens-skills).

License: Apache-2.0.
`;

function build(out) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, '.claude-plugin'), { recursive: true });
  const m = { ...manifest };
  writeFileSync(join(out, '.claude-plugin', 'plugin.json'), JSON.stringify(m, null, 2) + '\n');
  cpSync(join(root, '.claude-plugin', 'icon.png'), join(out, '.claude-plugin', 'icon.png'));
  cpSync(join(root, 'skills'), join(out, 'skills'), { recursive: true });
  cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'));
  writeFileSync(join(out, 'README.md'), README);
}

function files(dir) {
  const out = [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

const target = join(root, 'plugin');
if (check) {
  const tmp = join(tmpdir(), `appdimens-plugin-${process.pid}`);
  build(tmp);
  const a = files(tmp), b = files(target);
  const stale = a.length !== b.length || a.some((f, i) => f !== b[i] || !readFileSync(join(tmp, f)).equals(readFileSync(join(target, f))));
  rmSync(tmp, { recursive: true, force: true });
  if (stale) {
    console.error('plugin/ is stale: run node scripts/build-plugin.mjs');
    process.exit(1);
  }
  console.log(`plugin/ up to date (${b.length} files)`);
} else {
  build(target);
  const f = files(target);
  const big = f.filter((x) => !x.endsWith('.png') && statSync(join(target, x)).size > 256 * 1024);
  if (f.length > 512 || big.length) {
    console.error(`plugin/ breaks the directory limits: ${f.length} files, too large: ${big.join(', ')}`);
    process.exit(1);
  }
  console.log(`wrote plugin/ (${f.length} files)`);
}
