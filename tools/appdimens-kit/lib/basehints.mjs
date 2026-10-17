// Finds evidence in existing code of the device the screens were built and previewed on.
// That device is the base for migrating fixed values to AppDimens without changing their look.
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { collectFiles } from './lint.mjs';
import { findDevice, parseSize } from './devices.mjs';

// Compose `Devices.*` constants and `id:` device ids → catalog ids.
const COMPOSE_DEVICES = {
  PHONE: 'compose-phone',
  FOLDABLE: 'compose-foldable',
  TABLET: 'compose-tablet',
  DESKTOP: 'compose-desktop',
  PIXEL_7: 'medium-phone',
  PIXEL_7_PRO: 'medium-phone',
  PIXEL_8: 'medium-phone',
  PIXEL_TABLET: 'compose-tablet',
  small_phone: 'small-phone',
  medium_phone: 'medium-phone',
  medium_tablet: 'medium-tablet',
  pixel_7: 'medium-phone',
  pixel_8: 'medium-phone',
  pixel_tablet: 'medium-tablet',
};

const RULES = [
  {
    exts: ['.kt'],
    kind: 'compose-preview-spec',
    re: /device\s*=\s*"spec:([^"]+)"/g,
    size: (m) => parseSize(m[1]),
  },
  {
    exts: ['.kt'],
    kind: 'compose-preview-device',
    re: /device\s*=\s*(?:Devices\.(\w+)|"id:(\w+)")/g,
    device: (m) => findDevice(COMPOSE_DEVICES[m[1] || m[2]] || m[1] || m[2]),
  },
  {
    exts: ['.kt'],
    kind: 'compose-preview-width',
    re: /@Preview\([^)]*?widthDp\s*=\s*(\d+)(?:[^)]*?heightDp\s*=\s*(\d+))?/g,
    size: (m) => ({ width: Number(m[1]), height: m[2] ? Number(m[2]) : undefined }),
  },
  {
    exts: ['.swift'],
    kind: 'swiftui-preview-device',
    re: /previewDevice\(\s*(?:PreviewDevice\(\s*rawValue:\s*)?"([^"]+)"/g,
    device: (m) => findDevice(m[1]),
    label: (m) => m[1],
  },
  {
    exts: ['.swift'],
    kind: 'swiftui-preview-fixed',
    re: /previewLayout\(\s*\.fixed\(\s*width:\s*([\d.]+)\s*,\s*height:\s*([\d.]+)/g,
    size: (m) => ({ width: Number(m[1]), height: Number(m[2]) }),
  },
  {
    exts: ['.dart'],
    kind: 'flutter-screenutil-designSize',
    re: /designSize\s*:\s*(?:const\s+)?Size\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g,
    size: (m) => ({ width: Number(m[1]), height: Number(m[2]) }),
  },
  {
    exts: ['.dart'],
    kind: 'flutter-test-surface',
    re: /(?:setSurfaceSize|physicalSize\s*=)\s*\(?\s*(?:const\s+)?Size\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g,
    size: (m) => ({ width: Number(m[1]), height: Number(m[2]) }),
  },
  {
    exts: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.kt', '.swift', '.dart', '.cs'],
    kind: 'design-base-constant',
    re: /\b(?:const|let|var|val|static\s+(?:final\s+)?(?:double|float|int|let|var)?|final)\s+\w*(?:guideline|design|base|reference)\w*Width\w*\s*(?::\s*\w+\s*)?=\s*([\d.]+)/gi,
    size: (m) => ({ width: Number(m[1]) }),
  },
  {
    exts: ['.json'],
    kind: 'figma-frame',
    re: /"type"\s*:\s*"FRAME"[^{}]*?"absoluteBoundingBox"\s*:\s*\{[^}]*?"width"\s*:\s*([\d.]+)\s*,\s*"height"\s*:\s*([\d.]+)/g,
    size: (m) => ({ width: Number(m[1]), height: Number(m[2]) }),
    once: true, // the first (top-level) frame of the export
  },
  {
    exts: ['.html', '.htm', '.vue', '.svelte', '.astro', '.jsx', '.tsx', '.css'],
    kind: 'html-device-frame',
    re: /\.(?:phone-frame|phone|device|device-frame|mockup|screen-frame)\s*\{[^}]*?width\s*:\s*(\d+)px\s*;\s*height\s*:\s*(\d+)px/g,
    size: (m) => ({ width: Number(m[1]), height: Number(m[2]) }),
  },
  {
    exts: ['.html', '.htm', '.vue', '.svelte', '.astro', '.jsx', '.tsx'],
    kind: 'html-device-frame',
    re: /class(?:Name)?="[^"]*(?:phone-frame|device-frame|mockup)[^"]*"[^>]*style=["{][^"}]*width:\s*['"]?(\d+)px['"]?\s*[;,]\s*height:\s*['"]?(\d+)px/g,
    size: (m) => ({ width: Number(m[1]), height: Number(m[2]) }),
  },
  {
    exts: ['.html', '.htm'],
    kind: 'fixed-meta-viewport',
    re: /<meta[^>]+name=["']viewport["'][^>]+content=["'][^"']*width=(\d+)/g,
    size: (m) => ({ width: Number(m[1]) }),
  },
  {
    exts: ['.html', '.htm', '.css', '.scss', '.js', '.jsx', '.ts', '.tsx', '.kt', '.swift', '.dart', '.vue', '.svelte', '.xml', '.xaml', '.md'],
    kind: 'design-comment',
    re: /(?:<!--|\/\/|\/\*|#)[^\n]*?\b(?:designed|design|qa'?d|tuned|built)\b[^\n]*?(\d{3,4})\s*[x×]\s*(\d{3,4})/gi,
    size: (m) => ({ width: Number(m[1]), height: Number(m[2]) }),
  },
  {
    exts: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
    kind: 'test-viewport',
    re: /viewport\s*:\s*\{\s*width\s*:\s*(\d+)\s*,\s*height\s*:\s*(\d+)/g,
    size: (m) => ({ width: Number(m[1]), height: Number(m[2]) }),
  },
];

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

export function scanBaseHints(paths) {
  const hints = [];
  for (const file of collectFiles(paths)) {
    const ext = extname(file).toLowerCase();
    const rules = RULES.filter((r) => r.exts.includes(ext));
    if (!rules.length) continue;
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const r of rules) {
      r.re.lastIndex = 0;
      let m;
      while ((m = r.re.exec(text))) {
        if (r.once && hints.some((h) => h.file === file && h.kind === r.kind)) break;
        const device = r.device ? r.device(m) : null;
        const size = device ? { width: device.width, height: device.height } : r.size ? r.size(m) : null;
        if (!size && !device) {
          hints.push({ file, line: lineOf(text, m.index), kind: r.kind, label: r.label?.(m) ?? m[0], unknown: true });
          continue;
        }
        hints.push({ file, line: lineOf(text, m.index), kind: r.kind, device: device?.id, name: device?.name, ...size });
      }
    }
  }
  return hints;
}

/** Groups hints by size so the most used base device comes first. */
export function summarizeHints(hints) {
  const groups = new Map();
  for (const h of hints) {
    if (h.unknown) continue;
    const size = `${h.width}x${h.height ?? '?'}`;
    const g = groups.get(size) || { width: h.width, height: h.height, count: 0, devices: new Set(), kinds: new Set() };
    g.count++;
    if (h.device) g.devices.add(h.name);
    g.kinds.add(h.kind);
    groups.set(size, g);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count).map((g) => ({ ...g, devices: [...g.devices], kinds: [...g.kinds] }));
}
