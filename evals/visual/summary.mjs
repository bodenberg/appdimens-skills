// Before/after summary image: round 1 (skills before the fixes) vs round 2 (after).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const V = dirname(fileURLToPath(import.meta.url));
const r1 = JSON.parse(readFileSync(join(V, process.env.BEFORE || 'results/report-round1.json'), 'utf8'));
const r2 = JSON.parse(readFileSync(join(V, 'report.json'), 'utf8'));

const maxErr = (r) => Math.max(...r.rows.filter((x) => !x.missing).flatMap((x) => [Math.abs(x.errImpl.w), Math.abs(x.errImpl.h), Math.abs(x.errImpl.fs)]));
const naiveErr = (r) => { const v = r.rows.filter((x) => x.errNaive && Math.abs(x.errNaive.fs) > 0.5).map((x) => x.errNaive.fs).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] ?? 0; };
const cell = (v, good) => `<td class="${v <= good ? 'ok' : 'bad'}">${v.toFixed(2)} %</td>`;

const rows = Object.keys(r2)
  .map((id) => {
    const a = r1[id];
    const b = r2[id];
    return `<tr><td>${b.label}</td>${cell(a.diffImpl, 1)}${cell(b.diffImpl, 1)}${cell(maxErr(a), 3)}${cell(maxErr(b), 3)}<td class="bad">${b.diffNaive.toFixed(1)} % · textos +${naiveErr(b).toFixed(0)} % maiores</td></tr>`;
  })
  .join('');
const img = (dir, id, n, cap) => `<figure><img src="file://${join(V, dir, `${id}-${n}.png`)}"><figcaption>${cap}</figcaption></figure>`;
const strip = Object.keys(r2)
  .map((id) => `<h2>${r2[id].label}</h2><div class="row">${img('shots', id, 'ref', 'Referência')}${img('shots-v1', id, 'impl-base', 'Rodada 1 (antes)')}${img('shots-v1', id, 'diff-impl', 'Diferença rodada 1')}${img('shots', id, 'impl-base', 'Rodada 2 (depois)')}${img('shots', id, 'diff-impl', 'Diferença rodada 2')}</div>`)
  .join('');

const html = `<!doctype html><meta charset="utf-8"><style>
body{font-family:Inter,Arial,sans-serif;margin:24px;color:#111}h1{font-size:22px;margin:0 0 6px}h2{font-size:15px;margin:22px 0 8px}p{font-size:13px;color:#444;margin:2px 0}
table{border-collapse:collapse;font-size:13px;margin-top:10px}td,th{border:1px solid #ddd;padding:6px 10px;text-align:left}.ok{background:#DCFCE7}.bad{background:#FEE2E2}
.row{display:flex;gap:14px}figure{margin:0}img{width:230px;border:1px solid #ccc;display:block}figcaption{font-size:12px;margin-top:4px}</style>
<h1>Teste visual das skills — antes × depois das correções</h1>
<p>Três agentes cegos (sem ver a referência) implementaram cada template seguindo as skills. Medido na tela base de cada design.</p>
<table><tr><th>Template</th><th>Pixels diferentes — rodada 1</th><th>rodada 2</th><th>Maior erro de tamanho — rodada 1</th><th>rodada 2</th><th>Ingênuo "as-is" (pixels · tamanho)</th></tr>${rows}</table>
${strip}`;
const file = join(V, 'shots', 'SUMMARY.html');
writeFileSync(file, html);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1260, height: 900 } });
await page.goto('file://' + file, { waitUntil: 'load' });
await page.waitForTimeout(300);
await page.screenshot({ path: join(V, 'shots', 'SUMMARY.png'), fullPage: true });
await browser.close();
console.log('summary written');
