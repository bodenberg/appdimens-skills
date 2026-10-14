# login.html → webdimens: intent sheet and migration table

```
Target: web · webdimens 3.2.1 (global build, <style data-webdimens>) · strategy auto (formFactors: phone, tablet)
Base screen: iPhone SE 375×667 CSS px · portrait · font 1.0 (assumed, unconfirmed) · match-base
Factors (cli normalize): asdp / assp ×1.2500 on the base · ×1.0 at 300 · ×1.869 at 768-wide (smallest side 768)
```

## Base screen: what I decided and how

- `appdimens.config.json` has no `baseScreen`, so rule 1 of Step 3 did not apply.
- `cli detect inputs/responsive` found one piece of evidence: the comment "Designed and QA'd at 375×667 (iPhone SE)", `375×667 ×1 (100 %) (design-comment)`, dominant (≥ 80 %). That is rule 2 (one unambiguous source), so I used **375×667, assumed, unconfirmed**, and did not ask. The web default (390×844) is not used because a declared design size wins over a platform default.
- CSS px are already logical (dpr 2 only affects device pixels), so no density division.
- Proposed config addition, not written because the input folder is read-only for this task: `"design": { "normalization": "match-base", "baseScreen": { "name": "iPhone SE", "width": 375, "height": 667, "orientation": "portrait", "fontScale": 1 } }`.
- Note: `detect` reported "Targets: none detected", because the input folder has no package.json. The target comes from the config (web/webdimens 3.2.1).

## Strategy

`formFactors` = phone + tablet, and the config sets no strategy, so the decision table defaults apply: layout **auto (`asdp`)**, text **auto (`assp`)**. The whole screen uses one strategy. Font sizes are exact (`--text`, 0.01). Layout values use rounding 0.5. Line heights became unitless ratios of the font size. Tokens are written inside `<style data-webdimens>`, where the runtime compiles them and auto-registers the `auto` strategy (I checked this with `compileCssText` from the installed package, negative values and tokens inside `@media` included).

## Intent per element

| Node | Role | Sizing W/H | Overflow | Scale | Conf |
|---|---|---|---|---|---|
| body / .wrap | screen, stack-v (flex column) | fill / min 100vh | page scroll | spacing auto | 0.95 |
| .logo | icon/media box | fixed / fixed | none | auto | 0.9 |
| h1, .sub, label, .link, footer | text | fill / hug | wrap | text auto (assp), line height as ratio | 0.95 |
| form | stack-v (flex column) | fill / hug | none | gap auto | 0.95 |
| input | input | fill (100%) / fixed | none | auto; border fixed | 0.95 |
| .btn, .social button | button (touch target) | fill / fixed | none | visual auto; hit area fixed ≥ 44 | 0.9 |
| .social | grid 2 cols (1fr 1fr) | fill / hug | none | gap auto; column count unchanged | 0.95 |
| footer | text pinned to bottom (margin-top:auto) | fill / hug | wrap | text auto | 0.9 |
| @media ≥768 .wrap | card (adapt) | max-width / hug | none | same strategy as content (rule 20c); shadow fixed | 0.75, needs review |

## Migration table (base 375×667 · auto · asdp ×1.25)

| Selector / property | Before | Intent | After | On base screen (375) | at 300 | at 768 |
|---|---|---|---|---|---|---|
| .wrap padding (V) | 32px | spacing | 25.5asdp | 31.88 | 25.5 | 47.7 |
| .wrap padding (H) | 20px | spacing | 16asdp | 20 | 16 | 29.9 (phone rule; card overrides) |
| .wrap gap | 20px | spacing | 16asdp | 20 | 16 | 29.9 |
| .wrap min-height | 100vh | fraction | unchanged (`ad:fixed fraction`) | 100vh | | |
| .logo width/height | 64px | icon box | 51asdp | 63.75 | 51 | 95.3 |
| .logo border-radius | 16px | radius | 13asdp | 16.25 | 13 | 24.3 |
| h1 font-size | 28px | text | 22.4assp | 28 | 22.4 | 41.9 |
| h1 line-height | 34px | follows text | 1.2143 (34/28) | 34 | | |
| .sub font-size | 15px | text | 12assp | 15 | 12 | 22.4 |
| .sub line-height | 22px | follows text | 1.4667 (22/15) | 22 | | |
| .sub margin-top | -12px | spacing | -9.5asdp | -11.88 | | |
| form gap | 12px | spacing | 9.5asdp | 11.88 | | |
| label font-size | 13px | text | 10.4assp | 13 | 10.4 | 19.4 |
| label line-height | 18px | follows text | 1.3846 | 18 | | |
| input height | 48px | control height | 38.5asdp | 48.13 | 38.5 | 72 |
| input border | 1px | hairline | unchanged (`ad:fixed hairline`) | 1 | 1 | 1 |
| input border-radius | 10px | radius | 8asdp | 10 | | |
| input padding | 0 14px | spacing | 0 11asdp | 13.75 | | |
| input font-size | 16px | text | 12.8assp | 16 | 12.8 | 23.9 |
| input width | 100% | fill | unchanged | | | |
| .btn height | 52px | touch target visual | 41.5asdp + fixed 44px hit overlay | 51.88 | 41.5 | 77.6 |
| .btn border-radius | 12px | radius | 9.5asdp | 11.88 | | |
| .btn font-size | 16px | text | 12.8assp | 16 | | |
| .btn margin-top | 8px | spacing | 6.5asdp | 8.13 | | |
| .link font-size / lh | 14px / 20px | text | 11.2assp / 1.4286 | 14 / 20 | | |
| .social gap | 12px | spacing | 9.5asdp | 11.88 | | |
| .social columns | 1fr 1fr | grid count | unchanged (counts never scale) | | | |
| .social button height | 44px | touch target visual | 35asdp + fixed 44px hit overlay | 43.75 | 35 | 65.4 |
| .social button border | 1px | hairline | unchanged (`ad:fixed hairline`) | 1 | | |
| .social button radius | 10px | radius | 8asdp | 10 | | |
| .social button font-size | 14px | text | 11.2assp | 14 | | |
| footer font-size / lh | 13px / 18px | text | 10.4assp / 1.3846 | 13 / 18 | | |
| footer margin-top | auto | pinned bottom | unchanged | | | |
| button::before | (new) | hit area | min-height 44px (`ad:fixed touch-min`) | | | |

## What stayed fixed, and why

- 1px borders on the inputs and social buttons are hairlines (rule 1).
- The card `box-shadow: 0 8px 24px` stays fixed (rule 2, shadows).
- `min-height: 100vh` is a literal share of the window (fraction), not a designed size.
- The 2-column `1fr 1fr` grid and `width: 100%` are layout primitives, not numbers.
- Colours, fonts, weights and content are unchanged. All `data-k` attributes are on the same elements.
- `@media (min-width: 768px)` keeps its threshold: it is an existing structural breakpoint, and I invented none.
- Touch hit areas: the visuals scale and are never clamped, so at 300 the social button is 35px and the primary button 41.5px. A fixed `::before` overlay with `min-height: 44px` keeps a 44px hit area on buttons. Inputs cannot have pseudo-elements. They are 38.5px at 300, which is above the WCAG 24px minimum.

## The tablet media query

The override (`max-width: 440px; margin: 40px auto; border-radius: 20px; padding: 40px 32px; grey body; shadow`) turns the page into a centered card. The breakpoint is kept as a structural `adapt` (a plain media query, since there is no matching qualifier and I did not invent breakpoints). The card values are converted.

I ran `compare` for every value against a 768×1024 tablet frame:

| Value | Phone → tablet | compare verdict (tablet-frame base) |
|---|---|---|
| padding V | 32 → 40 | keep-as-adapt, 21.5asdp |
| padding H | 20 → 32 | delete-override (auto already gives 29.9) |
| border-radius | 0 → 20 | keep-as-adapt, 10.5asdp |
| max-width | (375 viewport) → 440 | keep-as-adapt, 235.5asdp |
| margin | 0 → 40 | keep-as-adapt, 21.5asdp |

I **did not adopt** those tablet-frame bases. The reason is decision-table rule 20c. The content inside the card is not overridden at 768, so it grows 1.495× with `auto`. A card at 235.5asdp resolves to exactly 440px at 768, so it would be the "fixed 440 container with ~1.5× content" that 20c forbids. To scale the container **with the same strategy as its content and keep its proportions**, I normalized the card values against the same 375 base as the content. They were authored in the same CSS-px space as the unchanged phone content:

- `max-width: 440px` → `352asdp`
- `margin: 40px auto` → `32asdp auto`
- `border-radius: 20px` → `16asdp`
- `padding: 40px 32px` → `32asdp 25.5asdp`

Result at 768 and 1024 (both have a 768 smallest side): the card is 658px wide and every element is exactly 1.496× the original tablet render. Inner width is 563 vs 376, title 41.9 vs 28. So the original tablet composition is kept, just larger, and nothing is cramped. On a 1024×1366 portrait tablet the card would be about 709px. Needs review: if the team wants the card to stay about 440px on tablets, the content inside it has to stop growing too (fixed or bounded), which goes against the project's `auto` choice.

## Validation

- `lint --force --config inputs/responsive/appdimens.config.json outputs/responsive.html` gives 0 errors and 0 warnings. The input gives 35 warnings.
- Rendered with Playwright (local chromium headless shell) and measured the `data-k` elements:
  - **375×667**: matches the input within rounding (logo 63.8 vs 64, button 51.9 vs 52, every font size exact, title box 335×34 in both).
  - **300×533**: everything is 0.8× of the base, no horizontal scroll.
  - **768×1024 and 1024×768**: centered 658px card, the tablet design ×1.496, no horizontal scroll.
  - I viewed the screenshot at 768.

## CLI commands run (cwd = vtest)

```bash
K="node /home/user/appdimens-skills/tools/appdimens-kit/cli.mjs"
$K detect inputs/responsive
$K devices
$K normalize --device iphone-se --strategy auto 32 20 64 16 12 48 10 14 52 8 44 40
$K normalize --device iphone-se --strategy auto --text 28 15 13 16 14
$K normalize --device iphone-se --strategy auto 440
$K compare --device iphone-se --tablet 768x1024 --strategy auto --phone-value 32 --tablet-value 40
$K compare --device iphone-se --tablet 768x1024 --strategy auto --phone-value 20 --tablet-value 32
$K compare --device iphone-se --tablet 768x1024 --strategy auto --phone-value 0 --tablet-value 20
$K compare --device iphone-se --tablet 768x1024 --strategy auto --phone-value 375 --tablet-value 440
$K compare --device iphone-se --tablet 768x1024 --strategy auto --phone-value 0 --tablet-value 40
$K lint --force --config inputs/responsive/appdimens.config.json outputs/responsive.html
$K lint --force --config inputs/responsive/appdimens.config.json inputs/responsive/login.html   # baseline: 35 warnings
```
(-12 → -9.5asdp is the sign-flipped 12 row.)

## Questions I would have asked a user (none blocking)

1. Confirm the base: 375×667 iPhone SE, at font scale 1? Can I record it in `appdimens.config.json → design.baseScreen`?
2. On tablets, should the card grow with its content (what I implemented: 658px at 768), or stay about 440px with content that does not grow there?
3. Which tablet frame was the 768 override checked on (768×1024 portrait assumed for `compare`)?
4. Is `auto` acceptable for a page that may also open on desktop browsers? A 1440×900 window has a 900 smallest side, about ×2.0, so the card would be about 700px.
