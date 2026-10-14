// Finds the AppDimens project a file belongs to and what it targets.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadConfig } from './config.mjs';

const cache = new Map();

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function listDir(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

// Marker files and the text that proves AppDimens is in use.
const markers = [
  { file: 'package.json', test: (t) => /"(webdimens|appdimens-react-native)"/.test(t) },
  { file: 'pubspec.yaml', test: (t) => /\bappdimens_/.test(t) },
  { file: 'build.gradle.kts', test: (t) => /appdimens/i.test(t) },
  { file: 'build.gradle', test: (t) => /appdimens/i.test(t) },
  { file: 'settings.gradle.kts', test: (t) => /appdimens/i.test(t) },
  { file: 'gradle/libs.versions.toml', test: (t) => /appdimens/i.test(t) },
  { file: 'Package.swift', test: (t) => /appdimens-ios/i.test(t) },
  { file: 'Package.resolved', test: (t) => /appdimens-ios/i.test(t) },
];

function dirUsesAppDimens(dir) {
  for (const m of markers) {
    const p = join(dir, m.file);
    if (existsSync(p) && m.test(read(p))) return true;
  }
  for (const name of listDir(dir)) {
    if (name.endsWith('.csproj') && /AppDimens/.test(read(join(dir, name)))) return true;
    if (name.endsWith('.xcodeproj') && /appdimens-ios/i.test(read(join(dir, name, 'project.pbxproj')))) return true;
  }
  return false;
}

/** Walks up from `start` to the git root (or filesystem root). */
export function findProject(start) {
  let dir = resolve(start);
  try {
    if (!statSync(dir).isDirectory()) dir = dirname(dir);
  } catch {
    dir = dirname(dir);
  }
  if (cache.has(dir)) return cache.get(dir);

  // config is the validated contract, or null; configErrors lists why a found config was rejected.
  let result = { enabled: false, root: null, config: null, configPath: null, configErrors: [] };
  let current = dir;
  while (true) {
    const configPath = join(current, 'appdimens.config.json');
    if (existsSync(configPath)) {
      result = { enabled: true, root: current, configPath, ...loadConfig(configPath) };
      result.configErrors = result.errors;
      delete result.errors;
      break;
    }
    if (dirUsesAppDimens(current)) {
      result = { enabled: true, root: current, config: null, configPath: null, configErrors: [] };
      // keep walking for a config at the repo root, but remember we're enabled
      const above = findConfigUpwards(dirname(current));
      if (above) result = above;
      break;
    }
    if (existsSync(join(current, '.git'))) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  if (result.enabled) result.isReactNative = isReactNativeRoot(dir, result.root);
  cache.set(dir, result);
  return result;
}

/** Nearest package.json (up to the project root) declares react-native or expo. */
function isReactNativeRoot(dir, root) {
  let current = dir;
  while (true) {
    const p = join(current, 'package.json');
    if (existsSync(p)) return /"(react-native|expo)"\s*:/.test(read(p));
    if (current === root || existsSync(join(current, '.git'))) return false;
    const parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

function findConfigUpwards(dir) {
  let current = dir;
  while (true) {
    const configPath = join(current, 'appdimens.config.json');
    if (existsSync(configPath)) {
      const { config, errors } = loadConfig(configPath);
      return { enabled: true, root: current, config, configPath, configErrors: errors };
    }
    if (existsSync(join(current, '.git'))) return null;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** Nearest ancestor file named one of `names`, stopping at the project root. */
export function nearestFile(start, names, stopAt) {
  let current = dirname(resolve(start));
  const stop = stopAt ? resolve(stopAt) : null;
  while (true) {
    for (const n of names) {
      const p = join(current, n);
      if (existsSync(p)) return p;
    }
    if (stop && current === stop) return null;
    if (existsSync(join(current, '.git'))) return null;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/** Platform targets detected from build files in `dir` (used by `cli.mjs detect`). */
export function detectTargets(dir) {
  const root = resolve(dir);
  const found = [];
  const walk = (d, depth) => {
    if (depth > 4) return;
    for (const name of listDir(d)) {
      if (['node_modules', '.git', 'build', 'dist', 'Pods', '.dart_tool', '.gradle', 'bin', 'obj'].includes(name)) continue;
      const p = join(d, name);
      let isDir = false;
      try {
        isDir = statSync(p).isDirectory();
      } catch {
        continue;
      }
      if (isDir) {
        if (name.endsWith('.xcodeproj')) found.push({ platform: 'apple', library: 'appdimens-ios', evidence: p });
        else if (name === 'layout' && d.endsWith('res')) found.push({ platform: 'android-xml', library: 'appdimens-sdps + appdimens-ssps', evidence: p });
        else walk(p, depth + 1);
        continue;
      }
      const text = () => read(p);
      if (name === 'build.gradle.kts' || name === 'build.gradle') {
        const t = text();
        if (/kotlin\("multiplatform"\)|org\.jetbrains\.kotlin\.multiplatform|kotlin-multiplatform/.test(t))
          found.push({ platform: 'kmp', library: 'appdimens-kmp', evidence: p });
        else if (/appdimens-games/.test(t)) found.push({ platform: 'games', library: 'appdimens-games', evidence: p });
        else if (/com\.android\.(application|library)/.test(t))
          found.push({
            platform: /compose\s*=\s*true|androidx\.compose|kotlin\.plugin\.compose/.test(t) ? 'android-compose' : 'android-views',
            library: 'appdimens-dynamic',
            evidence: p,
          });
      } else if (name === 'Package.swift') found.push({ platform: 'apple', library: 'appdimens-ios', evidence: p });
      else if (name === 'pubspec.yaml' && /^\s*flutter\s*:/m.test(text())) found.push({ platform: 'flutter', library: 'appdimens_flutter', evidence: p });
      else if (name === 'package.json') {
        const t = text();
        if (/"(react-native|expo)"\s*:/.test(t)) found.push({ platform: 'react-native', library: 'appdimens-react-native', evidence: p });
        else if (/"(react|vue|svelte|@angular\/core|next|nuxt|vite|astro)"\s*:/.test(t) || /"webdimens"/.test(t))
          found.push({ platform: 'web', library: 'webdimens', evidence: p });
      } else if (name.endsWith('.csproj')) {
        const t = text();
        if (/<UseMaui>\s*true/i.test(t)) found.push({ platform: 'dotnet-maui', library: 'Bodenberg.AppDimens.Maui.Sdps | AppDimens.Net.Maui', evidence: p });
        else if (/<Use(WPF|WindowsForms)>\s*true|WindowsAppSDK/i.test(t))
          found.push({ platform: 'dotnet-desktop', library: 'Bodenberg.AppDimens.Sdps.Wpf/.WinForms/.WinUI | AppDimens.Net.*', evidence: p });
        else if (/net\d+\.\d+-android/.test(t)) found.push({ platform: 'dotnet-android', library: 'Bodenberg.AppDimens.Sdps | .Dynamic', evidence: p });
      }
    }
  };
  walk(root, 0);
  return found;
}

export function clearProjectCache() {
  cache.clear();
}
