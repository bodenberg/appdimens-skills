# Visual eval — agent-built screens vs their design

Checks the whole chain (skills → agent → AppDimens tokens → rendered UI) with screenshots, on the web
(`webdimens`), the one platform that renders in a headless container. The math is the same as on
Android/iOS/Flutter.

## What is here

| Path | What |
|---|---|
| `inputs/figma/home.figma.json` | Figma REST-style export of a frame "Home — Android Compact" (412×917) |
| `inputs/claude-design/profile.html` | Claude Design-style prototype in an iPhone 14 frame (390×844, fake 47px status bar, Tailwind scale) |
| `inputs/responsive/login.html` | Existing responsive page in px, "designed at 375×667", with a tablet media query |
| `inputs/*/appdimens.config.json` | Project contract given to the agent (web, phone + tablet, match-base, no base screen) |
| `refs/figma-reference.html` | What the designer sees in Figma (the frame rendered in px). The other two inputs are their own reference |
| `outputs/` | Screens built by blind agents (round 2) that only received the skills, the input and the config |
| `compare.mjs` | Screenshots reference vs implementation on the base screen, element boxes (`data-k`), pixel diff, a naive "same number → sdp" baseline, and 300 / 768 / 1024 renders |
| `summary.mjs` | Before/after image from two `compare` reports |
| `results/` | Reports of the last run (round 1 = before the fixes in commit 14fc886, round 2 = after). The comparison images are not committed: `compare.mjs` and `summary.mjs` write them to `shots/`, and the images of this run are in the `0.1.1` tag |

## Run

```bash
cd evals/visual
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install   # uses the system Chromium; set its path in compare.mjs if different
node compare.mjs                                 # → shots/COMPARE-<case>.png, report.json
OUT=outputs-other SHOTS=shots-other REPORT=report-other.json node compare.mjs   # score another set of outputs
```

To test a new version of the skills: give each input to a fresh agent with the same prompt (see
`results/` and the PR description), save its page in `outputs/<case>.html` keeping the `data-k`
attributes, then run `compare.mjs`.

## Last results (on each design's base screen)

| Case | Pixels different (round 1 → 2) | Largest size error (round 1 → 2) | Naive "as-is" |
|---|---|---|---|
| Figma → web | 3.10 % → 2.63 % | 2.7 % → 1.3 % | 27 % pixels, text +37 % |
| Claude Design → web | 0.22 % → 0.31 % | 0.2 % → 0.2 % | 16 % pixels, text +30 % |
| Existing responsive page | 0.79 % → 1.28 % | 1.8 % → 0.6 % | 19 % pixels, text +25 % |

Remaining Figma pixel difference comes from content the export does not define (placeholder icons
vs. real icons, gradient angle), not from sizes.
