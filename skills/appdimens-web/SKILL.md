---
name: appdimens-web
description: Implement layout intent on the web with webdimens (appdimens-web) — utility classes (class="p:16sdp fs:16ssp"), data-dimen, the PostCSS plugin (padding: 16sdp), Sass, dimens() inline styles and JS helpers — in plain HTML/CSS, React, Next, Vue, Nuxt, Svelte or Angular, including SSR. Use when writing or editing web UI in an AppDimens project, installing webdimens, porting Android/iOS AppDimens layouts to CSS, or making a Claude Design/HTML mockup responsive.
---

# Web — `webdimens` 3.2.1

Same math as Android: `16sdp = 16 × min(viewportW, viewportH) / 300` CSS px. Decide intent first with `appdimens-layout-intent`. Upstream skill: `bodenberg/appdimens-web/skills/SKILL.md` (+ `reference.md`).

## Install and start

```bash
npm install webdimens
```
```ts
import { install } from 'webdimens';
install();                                  // once, in the app entry
// React: useWebDimens() · Vue: app.use(WebDimens) · Angular: provideWebDimens() · Svelte: install() in main
```
No build: `<script src="https://cdn.jsdelivr.net/npm/webdimens@3.2.1/dist/webdimens.global.js"></script>` (installs itself; pin the exact version).

Strategies register automatically the first time a token is seen (`p:16asdp`, `dimen('16fsdp')`). Tokens the runtime never sees — hand-written `var(--asdp)` or PostCSS output — need `install({ strategies: ['auto'] })` (or `'all'`).

## Pick the usage form (first that fits)

| Situation | Form | Example |
|---|---|---|
| Markup you control | classes | `class="p:16sdp gap:12sdp fs:16ssp fs@sw600:20ssp"` |
| Many declarations on one element | `data-dimen` | `data-dimen="padding: 8sdp 16sdp; font-size@landscape: 18ssp"` |
| CSS files with a build (Vite/Next/webpack) | PostCSS `webdimens/postcss` | `padding: 16sdp; @dimen sw600 { padding: 24sdp; }` |
| Hand-written CSS without a build (single-file pages, prototypes, Claude Design exports) | **`<style data-webdimens>`**: tokens inside are compiled by the runtime and strategies self-register | `<style data-webdimens> .card { padding: 11.5asdp; } </style>` |
| CSS variables only | `calc(16 * var(--sdp))` + `install({ strategies: [...] })` for non-scaled prefixes | |
| Sass | `@use 'webdimens/scss' as d;` | `padding: d.sdp(16)` |
| React/Vue inline style, SSR-safe | `dimens()` | `style={dimens({ padding: '16sdp' })}` |
| Canvas / measurement | JS | `dimen('2sdpPx')`, `sdp(16)` + `useDimens()` to re-render |

**SSR (Next/Nuxt/SvelteKit/Angular SSR): prefer the CSS forms**, not JS numbers.

## Tokens

Grammar `<prefix><axis><kind><inverter?><flags?><Px?>` — prefixes `''` scaled, `a` auto, `f` fluid, `p` percent, `pw`, `i`, `log`, `dg`, `pr`, `fl`, `ft`, `d`; axis `s` / `h` / `w`; kind `dp` / `sp` (× font scale) / `em` (no font scale).
`Px` tokens (device pixels) and `sp`/`em` with an inverter (`14sspLw`) are **JS only**: never in classes, `data-dimen`, `dimens()` or CSS.

## Web-specific scale advice

The smallest side of a desktop browser is often 800–1000, so `sdp` grows 2.7–3.3× there. For sites that run on desktop:
- layout: `asdp` (damped after 480), or mobile tokens + `@w840` / `@w1200` overrides;
- text: `fssp` (bounded 0.8–1.2×) or `assp`;
- content width: `max-width: 1200px` `/* ad:fixed max-content-width */` plus `margin-inline: auto`.

## Intent → HTML/CSS

| Intent | CSS |
|---|---|
| `stack-v` / `stack-h` | `display:flex; flex-direction:column; gap:16sdp` / row |
| `overlay` | `position:relative` parent + `position:absolute` child (true overlays only), or grid stacking `grid-area: 1/1` |
| `list` | semantic `<ul>` + `display:flex; flex-direction:column; gap:8sdp` |
| `grid` | `display:grid; grid-template-columns: repeat(auto-fill, minmax(160sdp, 1fr)); gap:12sdp` (PostCSS) |
| `carousel` | `display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:12sdp` + children `scroll-snap-align:start` |
| `sizing: fill` / `hug` | `flex:1` / `width:100%` (of parent) · `width:max-content` / default |
| `sizing: ratio` | `aspect-ratio: 4 / 3; width:100%` |
| `sizing: clamp` | `width: clamp(280px, 100%, 600px)` `/* ad:fixed clamp */` |
| `sizing: fraction` | CSS `50vw` / `40vh` (`50dvh` on mobile), or `spaceW(50)` from `webdimens/percent` in JS |
| line height | unitless ratio of the font size (`line-height: 1.375` for 22/16), never a px or separate `ssp` value | |
| `truncate` | `display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden` |
| `fit-text` | `autoResizeText(el, { min: 12, max: 34, maxLines: 2 })` from `webdimens/resize` (box must be constrained: `min-width:0`) |
| `divider` | `border-top: 1px solid …` `/* ad:fixed hairline */` |
| touch target | visual size as a token + hit area via padding or a `::before` overlay reaching `44px` (`/* ad:fixed touch-min */`; WCAG 2.2 AA minimum 24px) — never clamp the visual |
| `adapt` | conditions `@sw600` `@w840` `@landscape` `@tv` in classes/`data-dimen`/`@dimen`; structural changes with regular media/container queries |

## Lint (what `appdimens-kit lint` flags here)

- In CSS/SCSS/Vue/Svelte styles: `padding|margin|gap|font-size|border-radius|width|height|top|…: Npx` with N > 2 → `Nsdp` (PostCSS) or the class form. Media-query thresholds are not flagged.
- `Px` tokens or inverted `sp/em` tokens inside `class=`, `data-dimen` or CSS.

## Verify

`npm test` / typecheck; open the page at 300, 360/390, 768 and 1280×800 viewports (Playwright or devtools), and check SSR output contains the CSS forms.
