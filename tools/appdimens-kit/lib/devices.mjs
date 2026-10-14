// Base-device catalog: logical size (portrait, dp / pt / CSS px) of the screens designs and
// previews are usually made for. The base device is the denominator of every conversion:
// a value that looks right on the base device must still look right there after migration.
//
// Sources: Android Studio device definitions (px ÷ density), Compose `Devices.*` specs,
// Figma frame presets, Apple point sizes. Verify unusual devices before relying on them.

export const devices = [
  // Android Studio / Compose
  { id: 'small-phone', name: 'Small Phone (Android Studio)', platform: 'android', width: 360, height: 640, density: 2 },
  { id: 'medium-phone', name: 'Medium Phone (Android Studio)', platform: 'android', width: 411, height: 914, density: 2.625, aliases: ['pixel-7', 'pixel-8', 'medium phone'] },
  { id: 'compose-phone', name: 'Compose Devices.PHONE', platform: 'android', width: 411, height: 891, density: 2.625, aliases: ['devices.phone'] },
  { id: 'compose-foldable', name: 'Compose Devices.FOLDABLE (unfolded)', platform: 'android', width: 673, height: 841, density: 2.625, aliases: ['devices.foldable'] },
  { id: 'medium-tablet', name: 'Medium Tablet / Compose Devices.TABLET (landscape)', platform: 'android', width: 1280, height: 800, density: 2, aliases: ['devices.tablet', 'pixel-tablet', 'medium tablet'] },
  { id: 'compose-desktop', name: 'Compose Devices.DESKTOP', platform: 'android', width: 1920, height: 1080, density: 1, aliases: ['devices.desktop'] },
  // Figma presets
  { id: 'figma-android-compact', name: 'Figma "Android Compact"', platform: 'android', width: 412, height: 917, aliases: ['android compact'] },
  { id: 'figma-android-medium', name: 'Figma "Android Medium"', platform: 'android', width: 700, height: 840, aliases: ['android medium'] },
  { id: 'figma-android-expanded', name: 'Figma "Android Expanded"', platform: 'android', width: 1280, height: 800, aliases: ['android expanded'] },
  { id: 'android-360x800', name: 'Android 360×800 (legacy Figma "Android Large", most common Android web viewport)', platform: 'android', width: 360, height: 800, aliases: ['android large'] },
  // Apple (points)
  { id: 'iphone-se', name: 'iPhone SE (2nd/3rd gen)', platform: 'apple', width: 375, height: 667, density: 2 },
  { id: 'iphone-mini', name: 'iPhone 12/13 mini', platform: 'apple', width: 375, height: 812, density: 3 },
  { id: 'iphone-14', name: 'iPhone 12/13/14', platform: 'apple', width: 390, height: 844, density: 3, aliases: ['iphone 13', 'iphone 14', 'iphone 12'] },
  { id: 'iphone-15', name: 'iPhone 14 Pro / 15 / 15 Pro / 16', platform: 'apple', width: 393, height: 852, density: 3, aliases: ['iphone 15', 'iphone 16', 'iphone 15 pro', 'iphone 14 pro'] },
  { id: 'iphone-16-pro', name: 'iPhone 16 Pro', platform: 'apple', width: 402, height: 874, density: 3, aliases: ['iphone 16 pro'] },
  { id: 'iphone-plus', name: 'iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus', platform: 'apple', width: 430, height: 932, density: 3, aliases: ['iphone 15 pro max', 'iphone 16 plus', 'iphone 15 plus'] },
  { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', platform: 'apple', width: 440, height: 956, density: 3, aliases: ['iphone 16 pro max'] },
  { id: 'ipad-mini', name: 'iPad mini (6th gen)', platform: 'apple', width: 744, height: 1133, density: 2 },
  { id: 'ipad', name: 'iPad (10th gen) / iPad Air 11"', platform: 'apple', width: 820, height: 1180, density: 2 },
  { id: 'ipad-pro-11', name: 'iPad Pro 11"', platform: 'apple', width: 834, height: 1194, density: 2 },
  { id: 'ipad-pro-13', name: 'iPad Pro 12.9"', platform: 'apple', width: 1024, height: 1366, density: 2 },
  // Web (CSS px)
  { id: 'web-mobile', name: 'Web mobile 390×844', platform: 'web', width: 390, height: 844 },
  { id: 'web-laptop', name: 'Web laptop 1280×800', platform: 'web', width: 1280, height: 800 },
  { id: 'web-1366', name: 'Web 1366×768', platform: 'web', width: 1366, height: 768 },
  { id: 'web-desktop', name: 'Web / Figma "Desktop" 1440×1024', platform: 'web', width: 1440, height: 1024, aliases: ['desktop'] },
  { id: 'web-fhd', name: 'Web 1920×1080', platform: 'web', width: 1920, height: 1080 },
  // AppDimens reference
  { id: 'appdimens-reference', name: 'AppDimens reference 300×533', platform: 'any', width: 300, height: 533, aliases: ['reference', 'design-at-300'] },
];

const norm = (s) => String(s).toLowerCase().replace(/[_\s]+/g, '-');

export function findDevice(query) {
  const q = norm(query);
  return devices.find((d) => d.id === q || norm(d.name) === q || (d.aliases || []).some((a) => norm(a) === q)) || null;
}

/** Parses "411x914", "411×914", "spec:width=411dp,height=891dp". */
export function parseSize(text) {
  const spec = /width\s*=\s*([\d.]+)\s*dp\s*,\s*height\s*=\s*([\d.]+)\s*dp/i.exec(text);
  if (spec) return { width: Number(spec[1]), height: Number(spec[2]) };
  const wh = /([\d.]+)\s*[x×]\s*([\d.]+)/.exec(text);
  if (wh) return { width: Number(wh[1]), height: Number(wh[2]) };
  return null;
}

export const smallestSide = (d) => Math.min(d.width, d.height);

/**
 * Converts a physical-pixel size to logical units. Typical case: a Figma frame drawn at
 * 1080×2400 "px" for a 420-dpi phone is really 411×914 dp (÷ 2.625).
 */
export function pxToLogical(px, density) {
  if (!(density > 0)) throw new Error('density must be > 0 (e.g. 2.625 for 420 dpi, 3 for @3x)');
  return px / density;
}

/**
 * Heuristic: a portrait, phone-shaped frame 640+ wide is almost certainly physical px
 * (1080×2400, 1170×2532), not dp/pt. Landscape desktop frames (1920×1080) are not flagged.
 */
export function looksLikePhysicalPx({ width, height }) {
  return height > width && width >= 640 && height / width >= 1.7;
}
