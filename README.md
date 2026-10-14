# appdimens-skills

**A shared brain for AI coding agents that build UIs with [AppDimens](https://github.com/bodenberg/appdimens).**
Claude Code, Codex, Cursor and similar tools learn to decide **what each layout element is supposed to do** (list, grid, carousel, card, fill, hug, scroll, fixed hairline…) **before** choosing the platform, the AppDimens library, the unit (`sdp`, `ssp`, `asdp`, `hdp`…) and the strategy, and a validator catches the usual mistakes after every edit.

🇧🇷 [Resumo em português](#-resumo-em-português) · 📄 [Conceito completo (PT-BR)](docs/CONCEPT.md)

## What's inside

| Part | What it does |
|---|---|
| `skills/appdimens-layout-intent` | Core: the layout-intent model, the intent → unit decision table, platform router, project contract. |
| `skills/appdimens-design-to-code` | Read mode: Figma / Claude Design / screenshot / spec → intent → code. |
| `skills/appdimens-design-authoring` | Create mode: produce designs that are already unambiguous for AppDimens (Auto Layout, variables, intent tags, handoff spec). |
| `skills/appdimens-code-edit` | Edit mode: recover intent from existing code and preserve it while migrating / refactoring. |
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
  "design": { "source": "figma", "frameWidth": 360, "normalization": "match-frame" },
  "breakpoints": [{ "name": "tablet", "when": "sw600" }]
}
```

## The CLI

```bash
node tools/appdimens-kit/cli.mjs detect .                                  # which platforms/libraries
node tools/appdimens-kit/cli.mjs normalize --frame 360 --policy auto 16 24  # design → base values
node tools/appdimens-kit/cli.mjs lint src/                                  # validate
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

Um **pacote de skills** que ensina IAs (Claude Code, Codex, Cursor…) a **interpretar a intenção do layout** antes de escrever código: se o elemento é lista, grade, carrossel, card, se preenche, abraça o conteúdo, rola ou é fixo. Só depois a IA escolhe a plataforma, a **biblioteca AppDimens certa** (todas as 11 são cobertas), a unidade (`sdp`, `ssp`, `asdp`, `hdp`…) e a estratégia. Funciona em três modos: **ler** um design (Figma, Claude Design, screenshot), **criar** um design já pronto para AppDimens, e **editar** código existente sem quebrar o que era fixo de propósito. Um validador (`appdimens-kit lint`, rodando como hook no Claude Code) pega os erros comuns. Instalação e detalhes acima; o conceito completo está em [docs/CONCEPT.md](docs/CONCEPT.md).

## License

Apache 2.0, see [LICENSE](LICENSE).
