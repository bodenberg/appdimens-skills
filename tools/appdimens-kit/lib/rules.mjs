// Lint rules: catch the mistakes agents make most often when implementing AppDimens layouts.
// Every rule is line-based and conservative: a literal that is fixed on purpose is silenced
// with an `ad:fixed <reason>` marker on the same line or the line above.
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { nearestFile } from './project.mjs';
import { PREFIX, resolveStrategy } from './factors.mjs';

// Strategy prefixes, longest first so `pwsdp` is power and not percent.
const PREFIXES = [
  ['log', 'logarithmic'],
  ['pw', 'power'],
  ['dg', 'diagonal'],
  ['pr', 'perimeter'],
  ['ft', 'fit'],
  ['fl', 'fill'],
  ['a', 'auto'],
  ['f', 'fluid'],
  ['p', 'percent'],
  ['i', 'interpolated'],
  ['d', 'density'],
];
const PREFIX_ALT = PREFIXES.map(([p]) => p).join('|');
const capitalize = (s) => s[0].toUpperCase() + s.slice(1);

const OBSOLETE = [
  [/(?<!\.)\bbalanced\s*\(/, 'balanced(…) is obsolete → auto strategy (asdp / assp).'],
  [/\.balanced\(\)/, '.balanced() is obsolete → auto strategy (asdp / assp).'],
  [/\bwebdimens\.balanced\b/, 'webdimens.balanced is obsolete → auto tokens (16asdp).'],
  [/\bdefaultScaling\b/, 'defaultScaling is obsolete → scaled strategy (sdp / ssp).'],
  [/\.(fxdp|dydp)\b/, '.fxdp / .dydp are obsolete → .sdp (scaled) or .psdp (percent).'],
  [/\b(densdp|fillsdp|fitsdp)\b/, 'densdp / fillsdp / fitsdp are obsolete → dsdp / flsdp / ftsdp.'],
  [/\bAppDimens\.fixed\s*\(/, 'AppDimens.fixed(…) is obsolete → scaled strategy (16.sdp).'],
  [/\bAppDimens\.shared\.[\w.]*toPoints\s*\(/, 'AppDimens.shared…toPoints() is obsolete → 16.sdp.'],
];

const FIXED_MARKER = /ad:fixed/;

/** Numeric literals in `segment` that are not part of `16.sdp`, `16f`, `16.0.dp`, identifiers… */
function literals(segment) {
  const out = [];
  const re = /(?<![\w.$])(-?\d+(?:\.\d+)?)(?![\d.]*[A-Za-z_$])(?!\s*\.\s*[A-Za-z_$])(?!\.?\d)/g;
  let m;
  while ((m = re.exec(segment))) out.push({ value: Number(m[1]), index: m.index });
  return out;
}

function languageOf(file, text) {
  const ext = extname(file).toLowerCase();
  const norm = file.replace(/\\/g, '/');
  if (ext === '.kt') return 'kotlin';
  if (ext === '.xml') return /\/res\//.test(norm) ? 'android-xml' : null;
  if (ext === '.swift') return 'swift';
  if (ext === '.dart') return 'dart';
  if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
    return /from\s+['"]react-native['"]|require\(\s*['"]react-native['"]\s*\)/.test(text) ? 'react-native' : 'web-js';
  }
  if (['.css', '.scss', '.sass', '.less', '.pcss'].includes(ext)) return 'css';
  if (['.vue', '.svelte', '.html', '.htm', '.astro'].includes(ext)) return 'web-markup';
  if (ext === '.xaml') return 'xaml';
  if (ext === '.cs') return 'csharp';
  return null;
}

function prefixFor(name) {
  return name ? PREFIX[resolveStrategy(name)] : undefined;
}

function policyPrefix(config) {
  const p = prefixFor(config?.strategy?.layout);
  if (p !== undefined) return p;
  const ff = config?.formFactors;
  if (Array.isArray(ff) && ff.some((f) => f !== 'phone')) return 'a';
  return '';
}

function textPrefix(config) {
  const p = prefixFor(config?.strategy?.text);
  return p !== undefined ? p : policyPrefix(config);
}

const suggest = {
  kotlin: (n, text, c) => (text ? `${n}.${textPrefix(c)}ssp` : `${n}.${policyPrefix(c)}sdp`),
  swift: (n, text, c) => (text ? `.font(.system(size: ${n}.${textPrefix(c)}ssp))` : `${n}.${policyPrefix(c)}sdp`),
  dart: (n, text, c) => (text ? `${n}.${textPrefix(c)}ssp` : `${n}.${policyPrefix(c)}sdp`),
  'react-native': (n, text, c) => (text ? `${textPrefix(c)}ssp(${n})` : `${policyPrefix(c)}sdp(${n})`),
  css: (n, text, c) => (text ? `${n}${textPrefix(c)}ssp` : `${n}${policyPrefix(c)}sdp`),
  'android-xml': (n, text) => (text ? `@dimen/_${Math.round(n)}ssp` : `@dimen/_${Math.round(n)}sdp`),
  xaml: (n, text) => (text ? `{ssp:${n}}` : `{sdp:${n}}`),
};

// ---------------------------------------------------------------------------------------------
// Per-language checks. Each returns findings for one line: { col, severity, rule, message }.

function kotlinLine(line, ctx) {
  const out = [];
  if (/^\s*(import|package)\b/.test(line)) return out;
  const re = /(?<![\w.])(\d+(?:\.\d+)?)f?\.(dp|sp)\b/g;
  let m;
  while ((m = re.exec(line))) {
    const n = Number(m[1]);
    if (n <= ctx.threshold) continue;
    const text = m[2] === 'sp';
    out.push({
      col: m.index + 1,
      severity: 'warning',
      rule: 'raw-unit',
      message: `${m[0]} is a fixed ${m[2]}. Use ${suggest.kotlin(m[1], text, ctx.config)} for a scaled ${text ? 'text size' : 'dimension'}, or mark the line "// ad:fixed <reason>".`,
      fixable: true,
    });
  }
  return out;
}

function swiftLine(line, ctx) {
  const out = [];
  const push = (index, n, text, what) =>
    out.push({
      col: index + 1,
      severity: 'warning',
      rule: 'raw-unit',
      message: `${what} uses the fixed literal ${n}. Use ${suggest.swift(n, text, ctx.config)}, or mark "// ad:fixed <reason>".`,
    });
  let m;
  const font = /\.system\(\s*size:\s*(\d+(?:\.\d+)?)(?![\w.])/g;
  while ((m = font.exec(line))) if (Number(m[1]) > ctx.threshold) push(m.index, m[1], true, '.system(size:)');
  const keyed = /\b(spacing|cornerRadius|width|height|minWidth|maxWidth|minHeight|maxHeight|idealWidth|idealHeight|constant|minimum|maximum|leading|trailing|top|bottom)\s*:\s*(-?\d+(?:\.\d+)?)(?![\w.])/g;
  while ((m = keyed.exec(line))) if (Math.abs(Number(m[2])) > ctx.threshold) push(m.index, m[2], false, `${m[1]}:`);
  const call = /\.(padding|cornerRadius|offset)\(\s*(?:\.[A-Za-z]+\s*,\s*)?(-?\d+(?:\.\d+)?)\s*\)/g;
  while ((m = call.exec(line))) if (Math.abs(Number(m[2])) > ctx.threshold) push(m.index, m[2], false, `.${m[1]}()`);
  return out;
}

function dartLine(line, ctx) {
  const out = [];
  const push = (index, n, text, what) =>
    out.push({
      col: index + 1,
      severity: 'warning',
      rule: 'raw-unit',
      message: `${what} uses the fixed literal ${n}. Use ${suggest.dart(n, text, ctx.config)}, or mark "// ad:fixed <reason>".`,
    });
  let m;
  const calls = /\b(EdgeInsets\.(?:all|symmetric|only|fromLTRB|directional)|EdgeInsetsDirectional\.\w+|BorderRadius\.circular|Radius\.circular|SizedBox(?:\.square)?|BorderRadius\.only)\(([^()]*)\)/g;
  while ((m = calls.exec(line))) {
    for (const lit of literals(m[2])) if (Math.abs(lit.value) > ctx.threshold) push(m.index, lit.value, false, m[1]);
  }
  const keyed = /\b(fontSize|letterSpacing)\s*:\s*(\d+(?:\.\d+)?)(?![\w.])/g;
  while ((m = keyed.exec(line))) if (Number(m[2]) > ctx.threshold) push(m.index, m[2], true, `${m[1]}:`);
  const spacing = /\b(spacing|runSpacing|mainAxisSpacing|crossAxisSpacing|maxCrossAxisExtent)\s*:\s*(\d+(?:\.\d+)?)(?![\w.])/g;
  while ((m = spacing.exec(line))) if (Number(m[2]) > ctx.threshold) push(m.index, m[2], false, `${m[1]}:`);
  return out;
}

function reactNativeLine(line, ctx) {
  const out = [];
  let m;
  const keyed = /\b(padding\w*|margin\w*|gap|rowGap|columnGap|width|height|minWidth|maxWidth|minHeight|maxHeight|borderRadius|border\w+Radius|fontSize|lineHeight|letterSpacing|top|left|right|bottom)\s*:\s*(-?\d+(?:\.\d+)?)(?![\w.%])/g;
  while ((m = keyed.exec(line))) {
    const n = Number(m[2]);
    if (Math.abs(n) <= ctx.threshold) continue;
    const text = /^(fontSize|lineHeight|letterSpacing)$/.test(m[1]);
    out.push({
      col: m.index + 1,
      severity: 'warning',
      rule: 'raw-unit',
      message: `${m[1]}: ${m[2]} is a fixed dp value. Use ${suggest['react-native'](m[2], text, ctx.config)} (inside createDimenStyles or with useDimenMetrics), or mark "// ad:fixed <reason>".`,
    });
  }
  const pxFont = /\bfontSize\s*:\s*\w*Px\s*\(/g;
  while ((m = pxFont.exec(line)))
    out.push({ col: m.index + 1, severity: 'error', rule: 'px-font-size', message: 'A *Px value in fontSize applies the font scale twice. Use ssp()/sem().' });
  return out;
}

const CSS_PROPS = /(?<![\w-])(padding|margin|gap|row-gap|column-gap|font-size|border-radius|width|height|min-width|max-width|min-height|max-height|top|left|right|bottom|inset|line-height|letter-spacing|flex-basis)((?:-[a-z]+)*)\s*:\s*([^;{}]*)/g;

// webdimens class aliases (subset), used only to make suggestions concrete.
const CSS_ALIAS = {
  padding: 'p', 'padding-top': 'pt', 'padding-right': 'pr', 'padding-bottom': 'pb', 'padding-left': 'pl',
  margin: 'm', 'margin-top': 'mt', 'margin-right': 'mr', 'margin-bottom': 'mb', 'margin-left': 'ml',
  width: 'w', height: 'h', 'min-width': 'minw', 'min-height': 'minh', 'max-width': 'maxw', 'max-height': 'maxh',
  'font-size': 'fs', 'line-height': 'lh', 'letter-spacing': 'ls', gap: 'gap', 'border-radius': 'r', 'flex-basis': 'basis',
};

function cssLine(line, ctx) {
  const out = [];
  if (/^\s*@(media|container|supports|dimen)\b/.test(line)) return out;
  let m;
  while ((m = CSS_PROPS.exec(line))) {
    const prop = m[1] + m[2];
    const px = /(?<![\w.])(\d+(?:\.\d+)?)px\b/g;
    let p;
    while ((p = px.exec(m[3]))) {
      const n = Number(p[1]);
      if (n <= ctx.threshold || n >= 999) continue; // hairlines and the 9999px pill idiom
      const text = /^(font-size|line-height|letter-spacing)$/.test(prop);
      out.push({
        col: m.index + 1,
        severity: 'warning',
        rule: 'raw-unit',
        message: `${prop}: ${p[0]} does not scale. Use ${suggest.css(p[1], text, ctx.config)} (PostCSS / <style data-webdimens>)${CSS_ALIAS[prop] ? ` or the class ${CSS_ALIAS[prop]}:${suggest.css(p[1], text, ctx.config)}` : ''}, or mark "/* ad:fixed <reason> */".`,
      });
    }
  }
  out.push(...pxTokenInCss(line));
  return out;
}

function pxTokenInCss(line) {
  const out = [];
  const re = /(?<![\w.])\d+(?:\.\d+)?[a-z]*(?:dp|sp|em)[A-Za-z]*Px\b/g;
  let m;
  while ((m = re.exec(line)))
    out.push({ col: m.index + 1, severity: 'error', rule: 'px-token-in-css', message: `${m[0]} is a JS-only token (device pixels). Use the token without "Px" in CSS, classes or data-dimen.` });
  return out;
}

function webMarkupLine(line, ctx, state) {
  const out = [];
  // class / className / data-dimen attributes: Px tokens and inverted sp/em tokens are JS-only
  const attr = /\b(class|className|data-dimen)\s*=\s*(["'`{])([^"'`}]*)/g;
  let m;
  while ((m = attr.exec(line))) {
    for (const f of pxTokenInCss(m[3])) out.push({ ...f, col: m.index + 1 });
    const inv = /\b\d+(?:\.\d+)?[a-z]*(?:sp|em)(?:Ph|Lh|Pw|Lw)\b/g;
    let i;
    while ((i = inv.exec(m[3])))
      out.push({ col: m.index + 1, severity: 'error', rule: 'js-only-token', message: `${i[0]} (sp/em with an inverter) is JS-only. Use dimen('${i[0]}') or a non-inverted token in markup.` });
  }
  if (state.inStyle || state.isCss) out.push(...cssLine(line, ctx));
  return out;
}

const XML_ATTR = /\b(?:android|app):([A-Za-z_]+)="(-?\d+(?:\.\d+)?)(dp|dip|sp|px)"/g;
const XML_SIZED = /(padding|margin|layout_width|layout_height|minwidth|minheight|maxwidth|maxheight|textsize|drawablepadding|linespacingextra|lineheight|cornerradius|spacing|size)/i;

function androidXmlLine(line, ctx) {
  const out = [];
  let m;
  while ((m = XML_ATTR.exec(line))) {
    const [, attr, num, unit] = m;
    if (!XML_SIZED.test(attr) || Math.abs(Number(num)) <= ctx.threshold) continue;
    const text = unit === 'sp';
    out.push({
      col: m.index + 1,
      severity: 'warning',
      rule: 'raw-unit',
      message: `${attr}="${num}${unit}" does not scale. Use ${suggest['android-xml'](Number(num), text)}, or mark "<!-- ad:fixed <reason> -->".`,
    });
  }
  const dimen = /<dimen\s+name="[^"]+"\s*>\s*(-?\d+(?:\.\d+)?)(dp|sp)\s*<\/dimen>/g;
  while ((m = dimen.exec(line))) {
    if (Math.abs(Number(m[1])) <= ctx.threshold) continue;
    out.push({
      col: m.index + 1,
      severity: 'warning',
      rule: 'raw-unit',
      message: `Theme dimen ${m[1]}${m[2]} does not scale. Point it at ${suggest['android-xml'](Number(m[1]), m[2] === 'sp')}, or mark "<!-- ad:fixed <reason> -->".`,
    });
  }
  const ref = /@dimen\/_(minus)?(\d+)(sdp|hdp|wdp|ssp|hsp|wsp)\b/g;
  while ((m = ref.exec(line))) {
    const n = (m[1] ? -1 : 1) * Number(m[2]);
    const isText = /sp$/.test(m[3]);
    const ok = isText ? n >= 1 && n <= 600 : n >= -300 && n <= 600;
    if (!ok)
      out.push({ col: m.index + 1, severity: 'error', rule: 'dimen-range', message: `${m[0]} does not exist: ${isText ? '_Nssp/_Nhsp/_Nwsp go from 1 to 600' : '_Nsdp/_Nhdp/_Nwdp go from -300 (_minus300sdp) to 600'}.` });
  }
  const dec = /@dimen\/_\d+[._]\d+(?:sdp|hdp|wdp|ssp|hsp|wsp)\b/g;
  while ((m = dec.exec(line)))
    out.push({ col: m.index + 1, severity: 'error', rule: 'dimen-decimal', message: `${m[0]} does not exist: XML resources are integers. Round the base value (normalize --rounding 1).` });
  return out;
}

const XAML_ATTR = /\b(Padding|Margin|Spacing|RowSpacing|ColumnSpacing|FontSize|WidthRequest|HeightRequest|MinimumWidthRequest|MinimumHeightRequest|CornerRadius|Width|Height|MinWidth|MinHeight|MaxWidth|MaxHeight)="([-\d.,\s]+)"/g;

function xamlLine(line, ctx) {
  const out = [];
  let m;
  while ((m = XAML_ATTR.exec(line))) {
    const nums = m[2].split(/[,\s]+/).filter(Boolean).map(Number);
    const big = nums.find((n) => Math.abs(n) > ctx.threshold);
    if (big === undefined) continue;
    out.push({
      col: m.index + 1,
      severity: 'warning',
      rule: 'raw-unit',
      message: `${m[1]}="${m[2]}" does not scale. Use a markup extension such as ${suggest.xaml(big, m[1] === 'FontSize')} (SDPS) or {ad:${m[1] === 'FontSize' ? 'Ssp' : 'Sdp'} ${big}} (AppDimens.Net), or mark "<!-- ad:fixed <reason> -->".`,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// File-level checks

function strategyTokens(text, lang) {
  const used = new Map(); // strategy -> first index
  const add = (strategy, index) => {
    if (!used.has(strategy)) used.set(strategy, index);
  };
  let re;
  if (['kotlin', 'swift', 'dart'].includes(lang)) {
    re = new RegExp(`\\.(${PREFIX_ALT})(s|h|w)(dp|sp|em)`, 'g');
    let m;
    while ((m = re.exec(text))) add(PREFIXES.find(([p]) => p === m[1])[1], m.index);
    const space = /\.space(W|H|Sw)\b/g;
    while ((m = space.exec(text))) add('percent', m.index);
  } else if (lang === 'react-native') {
    re = new RegExp(`(?<![\\w.])(${PREFIX_ALT})(s|h|w)(dp|sp|em)[A-Za-z]*\\s*\\(`, 'g');
    let m;
    while ((m = re.exec(text))) add(PREFIXES.find(([p]) => p === m[1])[1], m.index);
    const space = /(?<![\w.])space(W|H|Sw)\w*\s*\(/g;
    while ((m = space.exec(text))) add('percent', m.index);
  }
  return used;
}

function hasStrategyImport(text, lang, strategy) {
  switch (lang) {
    case 'kotlin':
      return new RegExp(`^\\s*import\\s+com\\.appdimens\\.[\\w.]*\\.${strategy}\\b`, 'm').test(text);
    case 'dart':
      return new RegExp(`package:appdimens_(${strategy}|bom)/`).test(text);
    case 'swift':
      return new RegExp(`^\\s*import\\s+AppDimens(Dynamic|${capitalize(strategy)})\\b`, 'm').test(text);
    case 'react-native':
      return new RegExp(`['"]appdimens-react-native/${strategy}(/number)?['"]`).test(text);
    default:
      return true;
  }
}

const importHint = {
  kotlin: (s) => `import com.appdimens.dynamic.compose.${s}.* (or …kmp.compose.${s}, …code.${s})`,
  dart: (s) => `import 'package:appdimens_${s}/appdimens_${s}.dart';`,
  swift: (s) => `import AppDimensDynamic (or AppDimens${capitalize(s)})`,
  'react-native': (s) => `import { … } from 'appdimens-react-native/${s}';`,
};

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function gradleHasModule(file, strategy, project) {
  const gradle = nearestFile(file, ['build.gradle.kts', 'build.gradle'], project?.root);
  if (!gradle) return null; // unknown
  const content = readFileSync(gradle, 'utf8');
  if (!/appdimens/i.test(content)) return null;
  const re = new RegExp(`appdimens-[a-z]+-${strategy}\\b|appdimens[.-]${strategy}\\b`, 'i');
  if (re.test(content)) return true;
  if (project?.root) {
    const toml = join(project.root, 'gradle', 'libs.versions.toml');
    if (existsSync(toml) && re.test(readFileSync(toml, 'utf8'))) return true;
  }
  return false;
}

export function lintText(text, { file, config = null, project = null } = {}) {
  const lang = languageOf(file, text);
  if (!lang) return { lang: null, findings: [] };
  const threshold = config?.lint?.fixedThreshold ?? 2;
  const ctx = { threshold, config };
  const findings = [];
  const lines = text.split(/\r?\n/);
  const state = { inStyle: false, isCss: lang === 'css' };

  const perLine = {
    kotlin: kotlinLine,
    swift: swiftLine,
    dart: dartLine,
    'react-native': reactNativeLine,
    css: cssLine,
    'web-markup': webMarkupLine,
    'web-js': webMarkupLine,
    'android-xml': androidXmlLine,
    xaml: xamlLine,
    csharp: () => [],
  }[lang];

  lines.forEach((line, i) => {
    if (lang === 'web-markup') {
      if (/<style\b/i.test(line)) state.inStyle = true;
    }
    const fixed = FIXED_MARKER.test(line) || (i > 0 && FIXED_MARKER.test(lines[i - 1]) && !/\S/.test(lines[i - 1].replace(/^\s*(\/\/|#|\/\*|<!--|\*).*$/, '')));
    for (const f of perLine(line, ctx, state)) {
      if (fixed && f.severity === 'warning') continue;
      findings.push({ line: i + 1, ...f });
    }
    for (const [re, message] of OBSOLETE) {
      const m = re.exec(line);
      if (m) findings.push({ line: i + 1, col: m.index + 1, severity: 'error', rule: 'obsolete-api', message });
    }
    if (lang === 'web-markup' && /<\/style>/i.test(line)) state.inStyle = false;
  });

  // Strategy tokens need their module/package/import (web registers strategies automatically).
  for (const [strategy, index] of strategyTokens(text, lang)) {
    if (!hasStrategyImport(text, lang, strategy)) {
      findings.push({
        line: lineOf(text, index),
        col: 1,
        severity: 'error',
        rule: 'strategy-import',
        message: `The ${strategy} strategy is used but not imported. Add: ${importHint[lang](strategy)} and its dependency.`,
      });
    } else if (lang === 'kotlin' && strategy !== 'scaled') {
      const has = gradleHasModule(file, strategy, project);
      if (has === false)
        findings.push({
          line: lineOf(text, index),
          col: 1,
          severity: 'warning',
          rule: 'strategy-module',
          message: `The ${strategy} strategy needs its Gradle module (e.g. "io.github.bodenberg:appdimens-dynamic-${strategy}" / "appdimens-kmp-${strategy}"). It was not found in the nearest build file or gradle/libs.versions.toml.`,
        });
    }
  }

  // .NET: SDPS and AppDimens.Net are two families; don't mix them in one file.
  if (lang === 'csharp' || lang === 'xaml') {
    const net = /\bAppDimens\.Net\b/.test(text);
    const sdps = /\bAppDimens\.(Maui|Sdps)\b/.test(text);
    if (net && sdps)
      findings.push({ line: 1, col: 1, severity: 'error', rule: 'dotnet-family-mix', message: 'This file mixes the SDPS family (AppDimens.Maui / AppDimens.Sdps.*) with AppDimens.Net. Pick one family per project.' });
  }

  findings.sort((a, b) => a.line - b.line || a.col - b.col);
  return { lang, findings };
}
