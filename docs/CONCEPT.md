# Conceito — tela base e intenção antes do token

## O problema

Ao converter um design ou aplicar o AppDimens em telas existentes, a IA erra por dois motivos:

1. **Não sabe em que tela o valor foi escolhido.** `16` num frame Figma "Android Compact" (412 dp), num `@Preview` Medium Phone (411 dp) ou na referência do AppDimens (300) não é o mesmo `16`. Como o AppDimens calcula `valor × eixo ÷ 300`, trocar `16.dp` por `16.sdp` deixa o layout **37 % maior** num Medium Phone. Por isso "ficou diferente do Figma".
2. **Vê aparência e não comportamento.** Ela não sabe se o elemento é lista, grade ou carrossel, se preenche ou abraça o conteúdo, se rola, se é fixo (hairline, área de toque) ou se precisa caber num espaço (resize).

## A ideia central

Antes de qualquer token, a IA responde e registra duas coisas.

### 1. Perfil da tela base

| Propriedade | Por que influencia |
|---|---|
| Dimensão lógica (dp / pt / CSS px) | todas as estratégias por eixo |
| Resolução física e densidade (dpi, @2x/@3x) | designs em px precisam ser divididos pela densidade; `density`, tokens `Px` e `units` dependem do dpi |
| Orientação | qual lado é o menor; inversores |
| Proporção (aspect ratio) | sufixo `a`, `fill`, `fit`, `diagonal`, `perimeter` |
| Janela vs tela, insets | o AppDimens segue a janela; barras do sistema mudam a altura que o `hdp` lê |
| Escala de fonte | `ssp` multiplica por ela |

A regra base da biblioteca está sempre presente: referência **300 × 533**; `sdp` lê o menor lado, `wdp` a largura e `hdp` a **altura ÷ 300** (não 533); `ssp` × escala de fonte.

A conversão é feita pela CLI, nunca de cabeça:

```
valor base = (valor ÷ densidade) ÷ fator(estratégia, tela base [, eixo, proporção])
16 dp num Medium Phone (411) com scaled → 16 ÷ 1,37 = 11,5.sdp → volta a ~15,8 dp nesse aparelho
```

A tela base é **confirmada com o usuário** e gravada em `appdimens.config.json`, para não ser perguntada de novo. O arquivo é validado com o schema antes de ser usado: `"width": "411"` (texto em vez de número) ou um campo com erro de digitação interrompe o processamento, em vez de cair silenciosamente num padrão.

### 2. Intenção de cada elemento

Cinco eixos: **papel** (screen, list, grid, carousel, card, button…), **dimensionamento** (hug, fill, fixed, ratio, clamp, fraction), **overflow** (scroll, wrap, truncate, fit-text), **política de escala** e **adaptação** (breakpoints). Uma tabela de decisão leva intenção → estratégia → token: divisor é fixo, texto usa a família `sp`, área de toque nunca fica abaixo do mínimo, imagem usa `aspectRatio`, texto que precisa caber usa **resize** e tamanho físico usa **units**.

Todas as estratégias são suportadas quando o usuário escolhe ou o layout pede: scaled, auto, percent (`spaceW` literal), power, fluid, interpolated, logarithmic, diagonal, perimeter, fit, fill, density e o sufixo `a`.

## Os quatro fluxos

| Fluxo | Entrada | Skill | Onde está a tela base |
|---|---|---|---|
| Implementar do **Figma** | frame, link, export, MCP, screenshot | `appdimens-design-to-code` | tamanho e preset do frame (px → ÷ densidade) |
| Implementar ou **criar o projeto** a partir do **Claude Design** | HTML/React/CSS das telas | `appdimens-claude-design` | viewport ou moldura do protótipo, `max-width` e `meta viewport` (sem a status bar falsa) |
| **Aplicar em telas existentes** | código atual | `appdimens-code-edit` | `@Preview(device=…)`, `.previewDevice`, `designSize`, `guidelineBaseWidth`, viewports de teste (`cli detect`) |
| **Criar telas novas** | briefing | `appdimens-new-screen` | declarada pela IA (config ou padrão da plataforma) e confirmada |
| **Estratégia própria** (fórmula, regras por dispositivo, JSON compartilhado) | pedido do usuário ou `customStrategies` | `appdimens-custom-strategies` | a mesma do fluxo que a usa |

## O pacote

- **Skill central** `appdimens-layout-intent`, com referências de tela base, modelo de intenção, tabela de decisão e roteador de plataformas.
- **5 skills de fluxo**, uma para cada linha da tabela acima (`appdimens-custom-strategies` é transversal: escolhe a forma da estratégia própria — linha tipada, fórmula em texto, configuração completa ou JSON — e traz a tabela de sintaxe de cada plataforma).
- **9 skills de plataforma**, cobrindo as 11 bibliotecas: dynamic, sdps/ssps, kmp, ios, flutter, react-native, web, net-binding e games.
- **CLI `appdimens-kit`**:
  - `detect`: plataformas e evidências da tela base no código;
  - `devices`: catálogo de telas;
  - `normalize`: todas as estratégias, eixo, densidade, sufixo `a`, `spaceW` e estratégias do projeto (`custom:<id>`);
  - `custom check` / `custom explain`: valida o JSON de estratégias próprias (`schemas/custom-strategy.schema.json`, incluindo fórmulas livres) e mostra fator, regras e valores em cada tela, com o mesmo motor de todas as plataformas; `custom explain --formula "base * …"` e `normalize --formula "base * (…)"` fazem o mesmo só com a fórmula, a forma mais simples;
  - `lint`: validação do código;
  - `validate`: confere o `appdimens.config.json` com o schema e com os pares plataforma ↔ biblioteca (e, com `--intent`, as fichas de intenção). Se o contrato for inválido, `lint`, `detect`, `normalize` e o hook param com exit 2 e apontam cada campo errado; um contrato inválido nunca é usado.
- **Instalador npm** (`npx appdimens-skills`) para Claude Code, Codex, Gemini CLI, OpenClaw, Hermes, Cursor, Copilot e Windsurf, mais o **hook** do Claude Code e o plugin.
- **Evals**: casos-ouro para medir as IAs e um teste visual com agentes cegos (`evals/visual/`).

## Estratégias próprias do projeto

Quando nenhuma curva embutida atende, o projeto define as suas num único JSON (`customStrategies` no `appdimens.config.json`). O arquivo traz frame de referência, eixo, curva ou **fórmula livre em texto**, limites, política de fonte e regras por tipo de dispositivo. Todas as bibliotecas AppDimens leem o mesmo arquivo e chegam aos mesmos números. Os agentes só usam os ids declarados: diferenças por dispositivo viram `rules` no JSON, nunca `if` no código. Quando o usuário só quer escrever a conta, os skills recomendam primeiro a forma mais simples: uma linha de código tipada com autocomplete (em todas as plataformas, por exemplo Android: `scalingFormula { base * pow(sw / 360f, 0.8f) }`, `CustomScaleStrategy { … }`), ou a mesma fórmula em texto para JSON (`{"id": "hud", "formula": "base * pow(sw / 360, 0.8)"}`).

## Uma fonte, vários agentes

`skills/` é a fonte única. O instalador (`npx appdimens-skills`) detecta os clientes e IDEs agênticos instalados na máquina e as plataformas AppDimens do projeto. Depois pergunta, como os pacotes de skills convencionais, quais agentes, quais skills opcionais (a central é sempre instalada), o escopo (projeto ou usuário), se adiciona o hook do Claude Code e se cria o `appdimens.config.json`. Cada agente recebe o formato que entende:

| Agente | Formato |
|---|---|
| Claude Code | skills em `.claude/skills` + hook de validação (ou o plugin via marketplace) |
| OpenAI Codex, Gemini CLI, OpenClaw e outros | skills no padrão `.agents/skills` (Codex também recebe a seção no `AGENTS.md`) |
| Hermes Agent | skills em `~/.hermes/skills` (Hermes só lê skills do usuário) |
| Cursor | regras `.mdc`, com uma regra-portão sempre ativa |
| GitHub Copilot | `.github/instructions/*.instructions.md` |
| Windsurf | `.windsurf/rules/*.md` |

A CLI, os schemas e as skills completas ficam em `.appdimens/` (projeto) ou `~/.appdimens/` (usuário). Um manifesto registra cada arquivo instalado, e o `uninstall` remove exatamente o que foi posto, preservando o `AGENTS.md` e o `settings.json` originais.

## Fora do escopo

- **Plugin Figma**: o Figma é só uma fonte de leitura (inclusive pelo MCP).
- **Codegen automático**: o agente escreve o código no projeto real; o pacote orienta, calcula e valida.
