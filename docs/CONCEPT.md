# Conceito — interpretar a intenção do layout antes de escolher a unidade

## O problema

Quando uma IA converte um design em app, ela vê **aparência** (um card com padding 16) e não **comportamento**: se aquilo cresce, rola, vira lista, se adapta ao tablet ou fica fixo. Daí vêm os erros clássicos: padding fixo em `dp`, posicionamento absoluto copiado do Figma, divisor de 1 px escalado, fonte que ignora a acessibilidade, biblioteca errada para a plataforma e um layout que fica diferente do Figma.

O AppDimens já resolve o "quanto cresce", com o mesmo vocabulário (`sdp`, `ssp`, `asdp`…) em todas as plataformas. Faltava resolver o que vem **antes**: *o que este elemento deve fazer quando a tela muda?*

## A ideia central

O pacote é um "cérebro compartilhado" para Claude Code, Codex, Cursor e similares. Antes de qualquer código, a IA declara a **intenção** de cada elemento em cinco eixos:

| Eixo | Exemplos |
|---|---|
| **role** (papel) | screen, list, grid, carousel, card, button, input, text, media, divider, overlay |
| **sizing** (dimensionamento) | hug, fill, fixed, ratio, clamp, fraction |
| **overflow** | scroll-v, scroll-h, wrap, truncate, fit-text |
| **scale** (política de escala) | scaled (`sdp`), adaptive (`asdp`), bounded (`fsdp`), fixed, platform… |
| **adapt** | mudanças em breakpoints (`sw600` → 3 colunas) |

A unidade passa a ser consequência de uma **tabela de decisão**. Por exemplo: divisor → fixo; texto → família `sp` (respeita a fonte do usuário); área de toque → nunca abaixo de 48 dp / 44 pt; imagem → largura fill + `aspectRatio`, nunca `hdp`.

```text
design / screenshot / spec / código existente
  → plataforma + biblioteca      (detectadas no repositório)
  → contrato do projeto          (appdimens.config.json)
  → intenção de cada elemento    (com confiança e evidência)
  → política de escala → token   (tabela de decisão)
  → skill da plataforma          (código nativo correto)
  → validação                    (appdimens-kit lint / hook)
```

## Três modos, um modelo

| Modo | Entrada | Skill |
|---|---|---|
| **Ler** | Figma, Claude Design, screenshot, spec | `appdimens-design-to-code` |
| **Criar** | briefing | `appdimens-design-authoring`: o design já nasce com a intenção explícita (Auto Layout, variáveis `space.*`/`text.*`, tags como `[grid]` e `[fixed-scale]`, handoff) |
| **Editar** | código existente | `appdimens-code-edit`: extrai a intenção do código (um `LazyColumn` já é lista; um `1.dp` é hairline) e a preserva |

## Decisões que o pacote torna explícitas

1. **Valor do design ≠ valor base.** A referência do AppDimens tem 300 de largura. Um frame de 360 com padding 16 vira `16.sdp`, que dá **19,2** num aparelho de 360. O projeto escolhe uma única vez (`design.normalization`) entre desenhar em 300, normalizar (`base = valor ÷ fator`) ou aceitar o crescimento. A conta é feita pela CLI (`appdimens-kit normalize`), nunca "de cabeça".
2. **Confiança com evidência.** Anotações vencem a inferência. Acima de 0,8 a IA aplica; entre 0,5 e 0,8 aplica e marca para revisão; abaixo de 0,5 pergunta, juntando todas as dúvidas numa mensagem só.
3. **Breakpoints não se inventam.** Eles vêm do config, do design (um frame de tablet) ou do usuário.
4. **Fixo de propósito é declarado.** `// ad:fixed hairline`: o validador respeita a marca, e o revisor entende o porquê.
5. **Uma estratégia por tela**, sempre com o módulo/pacote/import correspondente instalado.

## Cobertura: todas as bibliotecas AppDimens

`appdimens-dynamic`, `appdimens-sdps`, `appdimens-ssps`, `appdimens-kmp`, `appdimens-ios`, `appdimens-flutter`, `appdimens-react-native`, `appdimens-web` (`webdimens`), `appdimens-net-binding` (famílias SDPS e AppDimens.Net) e `appdimens-games`, em 9 skills de plataforma. As skills deste pacote cuidam da **intenção**; a skill de cada biblioteca (no repositório dela) continua sendo a autoridade sobre a API.

## Uma fonte, várias ferramentas

`skills/` é a fonte única. A partir dela:

- **Claude Code**: plugin (skills + hook de validação) instalado via marketplace;
- **Codex**: seção gerada para o `AGENTS.md` + `.appdimens/`;
- **Cursor**: regras `.mdc` geradas;
- `scripts/build-adapters.mjs --check` garante que nada saia de sincronia.

## O que ficou de fora (por decisão)

- **Plugin Figma**: fora do escopo. O Figma continua sendo uma das fontes que a skill sabe ler (inclusive pelo servidor MCP do Figma), mas não construímos o plugin.
- **Codegen automático completo**: o pacote orienta a IA e valida o resultado; o código é escrito pelo agente no projeto real, seguindo os padrões do projeto.

## Próximos passos sugeridos

1. Rodar os casos de `evals/intent-cases.json` com Claude Code, Codex e Cursor e registrar a pontuação.
2. Adicionar um caso a cada erro real que uma IA cometer.
3. Publicar o marketplace e linkar o pacote no hub `bodenberg/appdimens` (seção "AI coding assistants").
