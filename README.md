# appdimens-skills

**A shared brain for AI coding agents that build UIs with [AppDimens](https://github.com/bodenberg/appdimens).**
Claude Code, Codex, Cursor and similar tools learn to identify **the base screen the values were chosen on** (size, resolution, density, orientation, aspect, font scale) and **what each layout element is supposed to do** (list, grid, carousel, card, fill, hug, scroll, fixed hairline…) **before** choosing the platform, the AppDimens library, the unit (`sdp`, `ssp`, `asdp`, `hdp`…) and the strategy, and a validator catches the usual mistakes after every edit.

🇧🇷 [Resumo em português](#-resumo-em-português) · 📄 [Conceito completo (PT-BR)](docs/CONCEPT.md)

## What's inside

| Part | What it does |
|---|---|
| `skills/appdimens-layout-intent` | Core: base screen profile, layout-intent model, intent → strategy/unit decision table, platform router, project contract. |
| `skills/appdimens-design-to-code` | Figma / screenshot / spec → base screen → intent → code. |
| `skills/appdimens-claude-design` | Claude Design screens (HTML/React/CSS) → implement in an app or create the project. |
| `skills/appdimens-code-edit` | Apply AppDimens to existing screens, keeping their look on the screen they were built for. |
| `skills/appdimens-new-screen` | Create new screens directly with AppDimens, from a declared base screen. |
| `skills/appdimens-<platform>` | One per platform, covering **every AppDimens library** (table below). |
| `schemas/` | `appdimens.config.json` (the per-project contract) and the layout-intent JSON schema. |
| `tools/appdimens-kit` | Zero-dependency Node CLI: `lint`, `normalize` (design value → base value), `detect` (platform targets). |
| `hooks/hooks.json` | Claude Code hook: lints each edited file (silent outside AppDimens projects). |
| `adapters/` | Generated Codex `AGENTS.md` section and Cursor `.mdc` rules (same content as the skills). |
| `evals/` | Golden intent cases to measure agents and catch regressions in the skills. |

### Library coverage

| Library | Version | Skill |
|---|---|---|
| [appdimens-dynamic](https://github.com/bodenberg/appdimens-dynamic) (Compose, Kotlin/Java Views) | 3.2.0 | `appdimens-android` |
| [appdimens-sdps](https://github.com/bodenberg/appdimens-sdps) + [appdimens-ssps](https://github.com/bodenberg/appdimens-ssps) (XML `@dimen`) | 3.2.0 | `appdimens-android-xml` |
| [appdimens-kmp](https://github.com/bodenberg/appdimens-kmp) (Kotlin / Compose Multiplatform) | 3.2.0 | `appdimens-kmp` |
| [appdimens-ios](https://github.com/bodenberg/appdimens-ios) (SwiftUI, UIKit, AppKit, Metal) | 3.2.0 | `appdimens-apple` |
| [appdimens-flutter](https://github.com/bodenberg/appdimens-flutter) | 3.2.0 | `appdimens-flutter` |
| [appdimens-react-native](https://github.com/bodenberg/appdimens-react-native) | 3.2.0 | `appdimens-react-native` |
| [appdimens-web](https://github.com/bodenberg/appdimens-web) (`webdimens`) | 3.2.1 | `appdimens-web` |
| [appdimens-net-binding](https://github.com/bodenberg/appdimens-net-binding) (MAUI, WPF, WinForms, WinUI, .NET for Android) | 3.6.1 | `appdimens-dotnet` |
| [appdimens-games](https://github.com/bodenberg/appdimens-games) (Android games, NDK, Vulkan, Unity) | 3.2.0 | `appdimens-games` |

These skills own **intent**. Each library's own skill (in its repo under `skills/`) stays the authority on API details, and the platform skills point to it.

## Install

**Claude Code (plugin: skills + hook):**

```text
/plugin marketplace add bodenberg/appdimens-skills
/plugin install appdimens-skills@appdimens
```

**Codex, Cursor, or Claude Code without the plugin:**

```bash
git clone https://github.com/bodenberg/appdimens-skills
node appdimens-skills/scripts/install.mjs --target codex  path/to/your-app   # AGENTS.md section + .appdimens/
node appdimens-skills/scripts/install.mjs --target cursor path/to/your-app   # .cursor/rules/appdimens-*.mdc + .appdimens/
node appdimens-skills/scripts/install.mjs --target claude path/to/your-app   # .claude/skills/ + hook snippet
```

Then add `appdimens.config.json` at your project root (or let the agent propose one):

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

## The CLI

```bash
node tools/appdimens-kit/cli.mjs detect .                                              # platforms, libraries, base-screen evidence in code
node tools/appdimens-kit/cli.mjs devices                                               # base-screen catalog (dp / pt / CSS px)
node tools/appdimens-kit/cli.mjs normalize --device medium-phone --strategy auto 16 24  # value on base screen → AppDimens base
node tools/appdimens-kit/cli.mjs normalize --frame 1080 --height 2400 --density 2.625 48  # design drawn in physical px
node tools/appdimens-kit/cli.mjs lint src/                                              # validate
```

`lint` flags: fixed literals that should be tokens (`16.dp`, `padding: 16`, `16px`, `android:padding="16dp"`, `Padding="16"`), strategy tokens without their import/module, obsolete APIs (`balanced`, `fxdp`…), XML resources that don't exist (`_700sdp`, `_13.5sdp`), JS-only web tokens in CSS/classes, `*Px` in React Native `fontSize`, and mixed .NET families. Deliberately fixed values carry a reason: `// ad:fixed hairline`.

## Develop

```bash
npm test                    # lint rules, math and hook contract
npm run build:adapters      # regenerate adapters/ after editing any SKILL.md
npm run check               # adapters in sync + tests (use in CI)
```

---

## 🇧🇷 Resumo em português

Um **pacote de skills** que ensina IAs (Claude Code, Codex, Cursor…) a, antes de escrever código, **(1) identificar a tela base** em que os valores foram escolhidos (dimensões, resolução, densidade/pontos, orientação, proporção, escala de fonte) e **(2) interpretar a intenção do layout** (lista, grade, carrossel, card; preenche, abraça, rola ou é fixo). Só então a IA escolhe a **biblioteca AppDimens certa** (todas as 11 são cobertas), a estratégia (scaled, auto, fluid, power…, além de resize e units) e o valor base correto, calculado pela CLI para manter a aparência na tela base. Os quatro fluxos são: implementar a partir do **Figma**, implementar ou criar o projeto a partir de telas do **Claude Design**, **aplicar o AppDimens em telas existentes** e **criar telas novas** já com o AppDimens. Um validador (`appdimens-kit lint`, que roda como hook no Claude Code) pega os erros comuns. O conceito completo está em [docs/CONCEPT.md](docs/CONCEPT.md).

## License

Apache 2.0, see [LICENSE](LICENSE).
