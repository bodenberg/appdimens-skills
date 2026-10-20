# appdimens-skills

[![npm](https://img.shields.io/npm/v/appdimens-skills.svg)](https://www.npmjs.com/package/appdimens-skills)
[![license](https://img.shields.io/badge/license-Apache%202.0-15803d.svg)](LICENSE)

**A shared brain for AI coding agents that build UIs with [AppDimens](https://github.com/bodenberg/appdimens).**

Before writing any size, the agent identifies **the base screen the values were chosen on** (size, resolution, density, orientation, aspect, font scale) and **what each layout element is supposed to do** (list, grid, carousel, card, fill, hug, scroll, fixed hairline…). Only then does it choose the AppDimens library, the strategy and the token, computing every base value with a CLI so the build looks like the source on that screen and scales correctly elsewhere. A validator catches the usual mistakes after every edit.

Works with **Claude Code, OpenAI Codex, Gemini CLI, OpenClaw, Hermes Agent, Cursor, GitHub Copilot, Windsurf** and any agent that reads the Agent Skills standard (`.agents/skills`).

🇧🇷 [Resumo em português](#-resumo-em-português) · 📄 [Conceito (PT-BR)](docs/CONCEPT.md) · 🔍 [Revisão e testes (PT-BR)](docs/REVIEW.md)

## Install

```bash
npx appdimens-skills
```

The installer detects the agentic clients and IDEs on your machine and the AppDimens platforms in your project, then asks — like other skill packages — what to install:

```text
? Install for            › This project / My user (all projects)
? Which agents / IDEs?   ◼ Claude Code  installed   ◻ OpenAI Codex   ◼ Cursor  used in project   …
? Which skills?          ■ layout-intent (core)  ◼ design-to-code  ◼ claude-design  ◼ code-edit  ◼ new-screen
                         ◼ react-native  detected in project   ◻ android   ◻ apple   ◻ flutter   ◻ web   …
? Add the Claude Code validation hook?   › Yes
? Create appdimens.config.json now?      › Yes
```

Non-interactive (CI, scripts):

```bash
npx appdimens-skills install --agents claude-code,codex,cursor --skills android,web --yes
npx appdimens-skills install --global --agents detected --skills all --yes
npx appdimens-skills detect        # agents installed here + platforms in this project
npx appdimens-skills list          # skill and agent ids
npx appdimens-skills uninstall     # removes exactly what was installed (manifest); --global for the user install
```

| Option | Meaning |
|---|---|
| `--agents <ids\|all\|detected>` | `claude-code`, `codex`, `gemini-cli`, `openclaw`, `hermes`, `cursor`, `copilot`, `windsurf`, `agents` |
| `--skills <ids\|all\|detected>` | workflow / platform skills (`android`, `web`, `code-edit`…); the core skill is always installed |
| `--global` | install for your user (`~/`) instead of the current project |
| `--dir <path>` | project folder (default: current folder) |
| `--no-hook` / `--no-config` | skip the Claude Code hook / the `appdimens.config.json` |
| `--yes` · `--dry-run` | accept defaults · only show the plan |

### Where each agent gets the files

| Agent | Detected by | Project install | User install |
|---|---|---|---|
| Claude Code | `~/.claude`, `claude` | `.claude/skills/` + hook in `.claude/settings.json` | `~/.claude/skills/` + hook in `~/.claude/settings.json` |
| OpenAI Codex | `~/.codex`, `codex` | `.agents/skills/` + section in `AGENTS.md` | `~/.agents/skills/` + `~/.codex/AGENTS.md` |
| Gemini CLI | `~/.gemini`, `gemini` | `.agents/skills/` | `~/.agents/skills/` |
| OpenClaw | `~/.openclaw`, `openclaw` | `.agents/skills/` | `~/.openclaw/skills/` |
| Hermes Agent | `~/.hermes`, `hermes` | — (Hermes reads user skills only) → `~/.hermes/skills/` | `~/.hermes/skills/` |
| Cursor | `~/.cursor`, app, `cursor` | `.cursor/rules/*.mdc` (+ an always-on gate rule) | — |
| GitHub Copilot | Copilot extension | `.github/instructions/*.instructions.md` | — |
| Windsurf | `~/.codeium/windsurf`, app | `.windsurf/rules/*.md` | — |
| Other agents | — | `.agents/skills/` | `~/.agents/skills/` |

Agents that share a folder (`.agents/skills`) get one copy. The CLI, schemas and the full skills go to `.appdimens/` (project) or `~/.appdimens/` (user); every installed file points there.

**Claude Code plugin** (alternative, includes the hook):

```text
/plugin marketplace add bodenberg/appdimens-skills
/plugin install appdimens-skills@appdimens
```

## What's inside

| Skill | Use |
|---|---|
| `layout-intent` (core) | Base screen profile, layout-intent model, intent → strategy/token decision table, platform router, project contract |
| `design-to-code` | Implement from Figma (frames, Dev Mode, MCP), screenshots or specs |
| `claude-design` | Implement — or create the project — from Claude Design screens (HTML/React/CSS) |
| `code-edit` | Apply AppDimens to existing screens, keeping their look on the screen they were built for |
| `new-screen` | Create new screens directly with AppDimens from a declared base screen |
| 9 platform skills | One per AppDimens library (below) |

### Library coverage

| Library | Version | Skill |
|---|---|---|
| [appdimens-dynamic](https://github.com/bodenberg/appdimens-dynamic) (Compose, Kotlin/Java Views) | 3.2.0 | `android` |
| [appdimens-sdps](https://github.com/bodenberg/appdimens-sdps) + [appdimens-ssps](https://github.com/bodenberg/appdimens-ssps) (XML `@dimen`) | 3.2.0 | `android-xml` |
| [appdimens-kmp](https://github.com/bodenberg/appdimens-kmp) (Kotlin / Compose Multiplatform) | 3.2.0 | `kmp` |
| [appdimens-ios](https://github.com/bodenberg/appdimens-ios) (SwiftUI, UIKit, AppKit, Metal) | 3.2.0 | `apple` |
| [appdimens-flutter](https://github.com/bodenberg/appdimens-flutter) | 3.2.0 | `flutter` |
| [appdimens-react-native](https://github.com/bodenberg/appdimens-react-native) | 3.2.0 | `react-native` |
| [appdimens-web](https://github.com/bodenberg/appdimens-web) (`webdimens`) | 3.2.1 | `web` |
| [appdimens-net-binding](https://github.com/bodenberg/appdimens-net-binding) (MAUI, WPF, WinForms, WinUI, .NET for Android) | 3.6.1 | `dotnet` |
| [appdimens-games](https://github.com/bodenberg/appdimens-games) (Android games, NDK, Vulkan, Unity) | 3.2.0 | `games` |

117 concrete claims of these skills (install lines, versions, packages, imports, setup calls, token and API names) are checked against the library sources with `scripts/verify-upstream.mjs`. The skills own **base screen and intent**; each library's own skill stays the authority on API details.

## The project contract

`appdimens.config.json` at the project root holds the decisions made once — the installer can create it, or the agent proposes one:

```json
{
  "$schema": "./.appdimens/schemas/appdimens.config.schema.json",
  "targets": [{ "platform": "android-compose", "library": "appdimens-dynamic", "version": "3.2.0" }],
  "formFactors": ["phone", "tablet"],
  "design": {
    "source": "figma",
    "baseScreen": { "id": "figma-android-compact", "width": 412, "height": 917, "unit": "dp", "orientation": "portrait", "fontScale": 1, "confirmed": true },
    "normalization": "match-base"
  },
  "breakpoints": [{ "name": "tablet", "when": "sw600" }]
}
```

### Project-defined strategies (unreleased AppDimens modules)

A project can define its own scaling strategies in one JSON file, using the format in [`schemas/custom-strategy.schema.json`](schemas/custom-strategy.schema.json). A strategy sets the reference frame, axis, curve, bounds, font-scale policy and rules per device class. When no built-in curve fits, it can use **free-form formulas** written as text (`"type": "expression"`, `"formula"`). Every AppDimens custom module reads that file and produces the same numbers: Android, KMP, Games + Unity, Apple, Flutter, React Native, Web and .NET. Declare it once:

```json
"strategy": { "layout": "custom:brand", "text": "custom:brand" },
"customStrategies": { "file": "design/appdimens-strategies.json", "ids": ["brand"] }
```

Agents then use `cdp` / `csp` with those ids only. The kit validates the file, converts design values (`normalize --strategy custom:brand`) and explains the numbers per screen (`custom explain`).

## The kit CLI

```bash
npx appdimens-skills kit detect .                                              # platforms + base-screen evidence (Figma frame, device frame, previews…)
npx appdimens-skills kit devices                                               # base-screen catalog (dp / pt / CSS px)
npx appdimens-skills kit normalize --device medium-phone --strategy auto 16 24  # value on base screen → AppDimens base
npx appdimens-skills kit normalize --device medium-phone --theme 4 8 16 24      # exact theme tokens (space16 = 11.68.sdp)
npx appdimens-skills kit normalize --device medium-phone --text 14 16 20        # font sizes, always exact
npx appdimens-skills kit normalize --device medium-phone --xml 16               # Android XML: integer + resource bucket
npx appdimens-skills kit normalize --frame 1080 --height 2400 --density 2.625 48  # design drawn in physical px
npx appdimens-skills kit compare --device medium-phone --tablet medium-tablet --phone-value 16 --tablet-value 24
npx appdimens-skills kit lint src/                                             # validate the code
npx appdimens-skills kit validate                                              # appdimens.config.json against its schema
npx appdimens-skills kit validate --intent intents.json                        # layout-intent sheets against theirs
npx appdimens-skills kit custom check design/appdimens-strategies.json          # custom strategies: schema + engine (extends, formulas…)
npx appdimens-skills kit custom explain brand --devices medium-phone,medium-tablet --values 16,24
npx appdimens-skills kit normalize --device medium-phone --strategy custom:brand 16 24   # base values for cdp(brand)
```

Every strategy is supported (`--strategy scaled|auto|percent|power|fluid|interpolated|logarithmic|diagonal|perimeter|fit|fill|density|custom:<id>`, `--axis s|h|w`, `--aspect`, `--space w|h|sw`), with the token printed in the project's syntax (`--syntax web|rn|…`). `lint` — and the Claude Code hook, on the lines each edit wrote — flags fixed literals that should be tokens (with a suggestion converted from the configured base screen, never the same number re-labelled), strategy tokens without their import/module, obsolete APIs, XML resources that don't exist, JS-only web tokens in CSS, `*Px` in React Native `fontSize` and mixed .NET families. Deliberately fixed values carry a reason: `// ad:fixed hairline`.

The contract is validated before it is used. `appdimens.config.json` is checked against `schemas/appdimens.config.schema.json`, for platform ↔ library pairs, and (with `customStrategies`) against the strategies file: it must load, and the declared ids and every `custom:<id>` must exist. If it fails, `lint`, `detect`, `normalize` and the hook stop with exit 2 and name each field (`/design/baseScreen/width: must be number, got string`, `unknown property "widht" (did you mean "width"?)`). `validate` prints the same list and exits 1.

## Privacy and network

Nothing in this plugin uses the network, reads credentials, or sends data anywhere.

- The skills are Markdown instructions. When they say "token" they mean a **design token**, a named size such as `space16 = 11.68.asdp`. When the .NET skill says "host" it means the **UI framework** the app runs in (MAUI, WPF, WinForms, WinUI 3), and `AppDimensHost` is a class of the AppDimens.Net library.
- The Claude Code hook runs `node ${CLAUDE_PLUGIN_ROOT}/tools/appdimens-kit/hook.mjs` after each edit. It reads the edited file and, inside the project, `appdimens.config.json` and the build files that declare the AppDimens dependency (`build.gradle(.kts)`, `gradle/libs.versions.toml`), and writes its findings to the session. It has no dependencies and makes no network calls.
- The kit CLI (`tools/appdimens-kit/cli.mjs`) reads only the files and folders you pass it and prints to the terminal. It reads no environment variables.
- The npm installer (`npx appdimens-skills`) is not part of the plugin's runtime. It checks whether folders such as `~/.claude` or `~/.codex` exist to detect installed agents and copies the skills into them; it does not read the files inside them.

## Quality

- `npm test` — lint rules, scale math (checked against the published AppDimens numbers), hook contract, installer (project/global install, idempotency, uninstall).
- `evals/intent-cases.json` + `evals/score.mjs` — 18 golden cases with machine-checkable asserts.
- `evals/visual/` — blind agents implement a Figma frame, a Claude Design prototype and an existing responsive page; screenshots on the base screen match within 0.2–1.3 % in size (the naive "same number" conversion is 25–37 % off).
- `docs/REVIEW.md` — three-reviewer audit, debate and the decisions taken.

## Develop

```bash
npm test                                  # all tests
npm run build:adapters                    # regenerate adapters/ after editing any SKILL.md
npm run check                             # adapters in sync + tests (CI, prepublish)
node scripts/verify-upstream.mjs <clones> # skill claims vs the AppDimens library sources
```

---

## 🇧🇷 Resumo em português

Um **pacote de skills** que ensina agentes de IA a, antes de escrever código, **(1) identificar a tela base** em que os valores foram escolhidos (dimensões, resolução, densidade/pontos, orientação, proporção, escala de fonte) e **(2) interpretar a intenção do layout** (lista, grade, carrossel, card; preenche, abraça, rola ou é fixo). Só então o agente escolhe a **biblioteca AppDimens certa** (todas são cobertas, inclusive .NET e Games), a estratégia (scaled, auto, fluid, power… além de resize e units, ou uma **estratégia própria do projeto**, `custom:<id>`, definida em JSON com fórmulas livres) e o valor base, calculado pela CLI para manter a aparência na tela base.

**Instalação:** `npx appdimens-skills`. O instalador detecta os clientes e IDEs agênticos instalados na máquina (Claude Code, Codex, Gemini CLI, OpenClaw, Hermes, Cursor, Copilot, Windsurf) e as plataformas do projeto, e você escolhe os agentes, as skills opcionais, o escopo (projeto ou usuário), o hook de validação e a criação do `appdimens.config.json`. Para automação: `--agents`, `--skills`, `--global` e `--yes`. Para remover: `npx appdimens-skills uninstall`.

**Os quatro fluxos:**
- implementar a partir do **Figma**;
- implementar ou criar o projeto a partir de telas do **Claude Design**;
- **aplicar o AppDimens em telas existentes**;
- **criar telas novas** já com o AppDimens.

Um validador (`kit lint`, que roda como hook no Claude Code) pega os erros comuns. Detalhes em [docs/CONCEPT.md](docs/CONCEPT.md) e [docs/REVIEW.md](docs/REVIEW.md).

## License

Apache 2.0, see [LICENSE](LICENSE).
