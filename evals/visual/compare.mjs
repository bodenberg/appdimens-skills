// Visual + metric comparison: reference design vs skill-driven implementation vs naive "as-is".
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const V = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || 'outputs';
const SHOTS = join(V, process.env.SHOTS || 'shots');
const REPORT = process.env.REPORT || 'report.json';
mkdirSync(SHOTS, { recursive: true });
const WD = readFileSync(join(V, 'node_modules/webdimens/dist/webdimens.global.js'), 'utf8');

// Naive "as-is" conversion: every px (and rem) value becomes the same number of sdp, as an agent
// would do without the base-screen step. Hairlines (≤ 2px) and the 999px pill idiom stay px.
function naive(html, extraCss = '') {
  const css = (s) =>
    s
      .replace(/(\d*\.?\d+)rem\b/g, (_, n) => `${+(n * 16).toFixed(2)}px`)
      .replace(/(?<![\w.#-])(\d*\.?\d+)px\b/g, (m, n) => (+n <= 2 || +n >= 999 ? m : `${n}sdp`));
  return html
    .replace(/<style>([\s\S]*?)<\/style>/, (_, s) => `<style data-webdimens>${css(s)}${extraCss}</style>`)
    .replace(/style="([^"]*)"/g, (_, s) => `style="${s}"`) // inline styles left as-is
    .replace('</body>', `<script>${WD}</script></body>`);
}

const CASES = [
  {
    id: 'figma',
    label: 'Figma → web (frame "Android Compact" 412×917)',
    ref: { file: join(V, 'refs/figma-reference.html'), vw: 412, vh: 917 },
    impl: join(V, OUT, 'figma.html'),
    naive: () => naive(readFileSync(join(V, 'refs/figma-reference.html'), 'utf8').replace('width:412px;height:917px;', 'width:100%;min-height:100vh;')),
    base: { vw: 412, vh: 917 },
    elements: ['title', 'avatar', 'search', 'chip', 'section', 'card', 'cardimg', 'cardtitle', 'price', 'nav', 'navicon'],
  },
  {
    id: 'claude-design',
    label: 'Claude Design → web (iPhone 14 frame 390×844, app area 390×797)',
    ref: { file: join(V, 'inputs/claude-design/profile.html'), vw: 390, vh: 844, clip: { x: 0, y: 47, width: 390, height: 797 } },
    impl: join(V, OUT, 'claude-design.html'),
    naive: () =>
      naive(readFileSync(join(V, 'inputs/claude-design/profile.html'), 'utf8'), '.phone-frame{width:100%;height:auto;min-height:100vh}.status-bar,.home-indicator{display:none}body{background:#F9FAFB;display:block}'),
    base: { vw: 390, vh: 797 },
    elements: ['header', 'avatar', 'name', 'email', 'stats', 'statvalue', 'list', 'row', 'rowicon', 'rowlabel', 'button'],
  },
  {
    id: 'responsive',
    label: 'HTML responsivo existente → webdimens (base 375×667)',
    ref: { file: join(V, 'inputs/responsive/login.html'), vw: 375, vh: 667 },
    impl: join(V, OUT, 'responsive.html'),
    naive: () => naive(readFileSync(join(V, 'inputs/responsive/login.html'), 'utf8')),
    base: { vw: 375, vh: 667 },
    elements: ['logo', 'title', 'sub', 'label', 'input', 'button', 'link', 'social', 'footer'],
  },
];

const OTHER = [
  { name: '300', vw: 300, vh: 640 },
  { name: 'tablet 768', vw: 768, vh: 1024 },
  { name: 'tablet 1024', vw: 1024, vh: 1366 },
];

async function shot(browser, { file, html, vw, vh, clip, out }) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  if (html) await page.setContent(html, { waitUntil: 'load' });
  else await page.goto('file://' + file, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out, clip: clip || { x: 0, y: 0, width: vw, height: vh } });
  const metrics = await page.evaluate((offsetY) => {
    const r = {};
    for (const el of document.querySelectorAll('[data-k]')) {
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      r[el.dataset.k] = { x: b.x, y: b.y - offsetY, w: b.width, h: b.height, fs: parseFloat(cs.fontSize), pad: parseFloat(cs.paddingLeft), radius: parseFloat(cs.borderTopLeftRadius) };
    }
    return r;
  }, clip?.y || 0);
  await page.close();
  return metrics;
}

function diff(a, b, out) {
  const A = PNG.sync.read(readFileSync(a));
  const B = PNG.sync.read(readFileSync(b));
  const w = Math.min(A.width, B.width);
  const h = Math.min(A.height, B.height);
  const crop = (img) => {
    const o = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) img.data.copy(o.data, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4);
    return o;
  };
  const ca = crop(A);
  const cb = crop(B);
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(ca.data, cb.data, d.data, w, h, { threshold: 0.15, alpha: 0.25 });
  writeFileSync(out, PNG.sync.write(d));
  return (n / (w * h)) * 100;
}

const pct = (v, r) => (r ? ((v - r) / r) * 100 : 0);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const report = {};
for (const c of CASES) {
  if (!existsSync(c.impl)) {
    console.log(`skip ${c.id}: ${c.impl} missing`);
    continue;
  }
  const P = (n) => join(SHOTS, `${c.id}-${n}.png`);
  const ref = await shot(browser, { file: c.ref.file, vw: c.ref.vw, vh: c.ref.vh, clip: c.ref.clip, out: P('ref') });
  const impl = await shot(browser, { file: c.impl, vw: c.base.vw, vh: c.base.vh, out: P('impl-base') });
  const nv = await shot(browser, { html: c.naive(), vw: c.base.vw, vh: c.base.vh, out: P('naive-base') });
  const diffImpl = diff(P('ref'), P('impl-base'), P('diff-impl'));
  const diffNaive = diff(P('ref'), P('naive-base'), P('diff-naive'));
  const rows = c.elements.map((k) => {
    const r = ref[k];
    const i = impl[k];
    const n = nv[k];
    if (!r || !i) return { k, missing: !i ? 'impl' : 'ref' };
    return {
      k,
      ref: { w: r.w, h: r.h, fs: r.fs },
      impl: { w: i.w, h: i.h, fs: i.fs },
      naive: n ? { w: n.w, h: n.h, fs: n.fs } : null,
      errImpl: { w: pct(i.w, r.w), h: pct(i.h, r.h), fs: pct(i.fs, r.fs), y: i.y - r.y },
      errNaive: n ? { w: pct(n.w, r.w), h: pct(n.h, r.h), fs: pct(n.fs, r.fs) } : null,
    };
  });
  const other = {};
  for (const o of OTHER) {
    other[o.name] = {
      impl: await shot(browser, { file: c.impl, vw: o.vw, vh: o.vh, out: P(`impl-${o.vw}`) }),
      ref: await shot(browser, { file: c.ref.file, vw: o.vw, vh: o.vh, out: P(`ref-${o.vw}`) }),
    };
  }
  report[c.id] = { label: c.label, base: c.base, diffImpl, diffNaive, rows, other };
  console.log(`${c.id}: pixel diff impl ${diffImpl.toFixed(2)} % · naive ${diffNaive.toFixed(2)} %`);
}
writeFileSync(join(V, REPORT), JSON.stringify(report, null, 2));

// Composite images (one per case) for the user.
const f = (n) => (Math.abs(n) < 0.05 ? '0' : (n > 0 ? '+' : '') + n.toFixed(1));
for (const [id, r] of Object.entries(report)) {
  const img = (n, cap, w) => `<figure><img src="file://${join(SHOTS, `${id}-${n}.png`)}" style="width:${w}px"><figcaption>${cap}</figcaption></figure>`;
  const okRows = r.rows.filter((x) => !x.missing);
  const maxImpl = Math.max(...okRows.flatMap((x) => [Math.abs(x.errImpl.w), Math.abs(x.errImpl.h), Math.abs(x.errImpl.fs)]));
  const table = okRows
    .map((x) => `<tr><td>${x.k}</td><td>${x.ref.w.toFixed(0)}×${x.ref.h.toFixed(0)} · ${x.ref.fs}px</td><td>${x.impl.w.toFixed(1)}×${x.impl.h.toFixed(1)} · ${x.impl.fs.toFixed(1)}px</td><td class="${Math.max(Math.abs(x.errImpl.w), Math.abs(x.errImpl.h)) <= 3 ? 'ok' : 'bad'}">${f(x.errImpl.w)}% / ${f(x.errImpl.h)}% / ${f(x.errImpl.fs)}%</td><td class="bad">${x.errNaive ? `${f(x.errNaive.w)}% / ${f(x.errNaive.h)}% / ${f(x.errNaive.fs)}%` : '—'}</td></tr>`)
    .join('');
  const missing = r.rows.filter((x) => x.missing).map((x) => x.k);
  const W = 300;
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{font-family:Inter,Arial,sans-serif;margin:24px;background:#fff;color:#111}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px}p{margin:4px 0;font-size:13px;color:#444}
    .row{display:flex;gap:16px;align-items:flex-start;flex-wrap:nowrap}figure{margin:0}img{border:1px solid #ccc;display:block}figcaption{font-size:12px;margin-top:4px;color:#333;max-width:320px}
    table{border-collapse:collapse;font-size:12px;margin-top:8px}td,th{border:1px solid #ddd;padding:4px 8px;text-align:left}.ok{background:#DCFCE7}.bad{background:#FEE2E2}</style>
    <h1>${r.label}</h1>
    <p>Tela base ${r.base.vw}×${r.base.vh}. Diferença de pixels vs referência: <b>implementação com as skills ${r.diffImpl.toFixed(2)} %</b> · conversão ingênua "as-is" ${r.diffNaive.toFixed(2)} %. Maior erro de tamanho da implementação nos elementos medidos: <b>${maxImpl.toFixed(1)} %</b>.${missing.length ? ` Sem data-k na implementação: ${missing.join(', ')}.` : ''}</p>
    <h2>1. Na tela base (deve ficar igual ao design)</h2>
    <div class="row">${img('ref', 'Referência (design)', W)}${img('impl-base', 'Implementação gerada pelas skills', W)}${img('diff-impl', 'Diferença ref × skills (vermelho = pixels diferentes)', W)}${img('naive-base', 'Conversão ingênua: mesmo número → sdp', W)}</div>
    <h2>2. Em outras telas (a implementação escala; a referência em px não)</h2>
    <div class="row">${img('impl-300', 'Skills @ 300 px', 220)}${img('ref-768', 'Original em px @ 768', 300)}${img('impl-768', 'Skills @ 768 (tablet)', 300)}${img('impl-1024', 'Skills @ 1024', 300)}</div>
    <h2>3. Medidas na tela base (largura / altura / fonte, erro vs referência)</h2>
    <table><tr><th>elemento</th><th>referência</th><th>skills</th><th>erro skills</th><th>erro ingênuo</th></tr>${table}</table>`;
  const page = await browser.newPage({ viewport: { width: 1340, height: 800 } });
  const htmlFile = join(SHOTS, `COMPARE-${id}.html`);
  writeFileSync(htmlFile, html);
  await page.goto('file://' + htmlFile, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(SHOTS, `COMPARE-${id}.png`), fullPage: true });
  await page.close();
}
await browser.close();
console.log('done');
