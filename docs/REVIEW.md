# Revisão por três agentes — achados, debate e decisões

O pacote foi revisado por três agentes com perfis diferentes, em duas rodadas: uma revisão independente e depois um debate, em que cada um leu as críticas dos outros dois. Este documento registra o que foi encontrado, o que mudou e por quê.

| Perfil | Foco |
|---|---|
| **R1 — mantenedor das bibliotecas AppDimens** | fórmulas, nomes de API, imports, módulos, comparando com o código-fonte das 11 bibliotecas |
| **R2 — dev sênior mobile/front-end** | se os fluxos produzem UI correta em cenários reais (handoff, tablets, acessibilidade) |
| **R3 — engenheiro de skills/agentes** | se os modelos seguem as instruções, contradições, custo de contexto, hook, lint e evals |

## O que foi confirmado como correto

- **Matemática das estratégias:** a de `factors.mjs` bate exatamente com os kernels do Android (scaled, auto, percent, power, fluid, interpolated, logarithmic, diagonal, perimeter, fit, fill, density e o sufixo `a`). As constantes 300/533/611.6305/833/1.78 e ε/κ também conferem.
- **`hdp`:** é altura ÷ 300 (`DimenMetrics.screenHeightFactor`).
- **Escala de fonte:** o `ssp` aplica a escala de fonte uma única vez em todas as plataformas.
- **Instalação e nomes de API:** linhas de instalação, versões e os principais nomes de API das 9 plataformas estão corretos.

## Principais falhas encontradas e corrigidas

| # | Falha | Correção |
|---|---|---|
| 1 | O lint/hook sugeria `16.dp → 16.sdp` (conversão "as-is"), contradizendo a regra `match-base`. Como o hook fala com a IA a cada edição, a sugestão errada prevalecia. | As sugestões agora usam a tela base do config (`16.dp → 11.5.asdp (16 na tela base 411×914, auto)`; no XML, `@dimen/_12sdp`, já com o bucket). Sem tela base, a mensagem traz só o comando `normalize`, nunca um número. |
| 2 | Um eval esperava valores "as-is" no modo edição. | Caso corrigido (÷1,31 para iPhone 15) e asserções verificáveis por máquina adicionadas a todos os casos. |
| 3 | A área de toque misturava tamanho visual e área clicável (`sizeIn(48)` + `48.asdp`). | O visual vira um token normalizado (48 → `35.asdp`) e a área clicável usa a API da plataforma (`minimumInteractiveComponentSize`, `contentShape`, `hitSlop`). O visual nunca é limitado à força. |
| 4 | UI compartilhada (Flutter/KMP/RN) com frames Android (412) e iOS (393) ficava sem uma base única. | Regra: **uma tela base canônica**. O outro frame só é conferido (±5 %), e diferenças reais viram regras `adapt`. |
| 5 | Overrides de tablet existentes (`values-sw600dp`) seriam escalados duas vezes depois da migração. | Novo comando `cli compare`, que responde `delete-override` ou `keep-as-adapt` com o valor base. |
| 6 | Arredondar quebrava a escala do design system: somas deixavam de bater, a proporção do line-height mudava e Compose e XML divergiam. | **Política de precisão:** tokens de tema exatos (`--theme`, 0,01) nomeados pelo valor do design (`space16 = 11.68.asdp`); valores avulsos com 0,5; XML e SDPS .NET inteiros (`--xml`); line-height como razão; em app misto Compose+XML, o `dimens.xml` é a fonte única. |
| 7 | O XML resolve por buckets (`values-hN` em passos de 15 dp), não pela altura contínua. | `normalize --xml` usa o bucket real (914 → h900 → ×3,00); as 358 pastas foram extraídas das bibliotecas. |
| 8 | O `hdp` era normalizado com a altura do frame, mas o runtime lê outra altura (por exemplo, sem as barras do sistema no Android com targetSdk ≤ 34). | `--runtime-height` e `baseScreen.runtimeHeight`, mais uma tabela do que cada biblioteca lê em runtime. |
| 9 | Fator errado no texto: `ahdp ×3.05`; o correto com auto é ×1,958. | Corrigido, e os números do cabeçalho agora vêm da CLI. |
| 10 | Um frame em pixels físicos ainda gerava uma tabela "usável". | A CLI encerra com código 2 até receber `--density` ou `--logical`. |
| 11 | A confirmação da tela base perguntava demais, até em edições de uma linha. | **Regra única em 3 níveis:** (1) se o config tem a base, nunca pergunta; (2) se há uma fonte inequívoca, segue como "assumida, não confirmada"; (3) só pergunta quando há conflito ou falta evidência. Edições que reutilizam tokens nunca perguntam. No máximo 5 perguntas. |
| 12 | A pontuação de confiança começava em 0, então a IA perguntaria sobre quase tudo. | Estrutura explícita (Auto Layout, flex/grid, listas no código) começa em 0,9; as heurísticas só valem para papéis ambíguos. |
| 13 | O hook analisava o arquivo inteiro: código legado bloqueava edições sem relação. | Agora só as linhas escritas na edição contam, com no máximo 10 achados; o bloqueio acontece apenas por erro novo. |
| 14 | Falsos positivos do lint (elevação, sombra, borda, hitSlop, mínimos de toque) e falsos negativos (Dart `width/height/size`, RN sem import de `react-native`, estilo inline no React, `@media` em uma linha, XML com caminho relativo). | Contexto analisado por ocorrência e regras novas, cobertos por testes. |
| 15 | Fatos da biblioteca errados no texto. | Corrigidos: `AppDimensDynamic` não inclui todas as estratégias no iOS; o sufixo `i` devolve o valor base sem escala em multi-window; as variantes `hdp`/`wdp` de diagonal/perimeter/fit/fill/density ignoram o eixo; as unidades físicas no Android são `10f.mm.dp`; o preview iOS precisa de `updatesAmbient: true`; `_0sdp` não existe; Medium Tablet e `Devices.TABLET` são entradas separadas. |
| 16 | Claude Design: `clamp()` virava `fssp`; `vh` dentro da moldura do celular se referia à janela do navegador. | `clamp` é resolvido no viewport base e os limites viram `adapt`; `vh/vw` são recalculados contra a moldura; o zoom do canvas é ignorado; `rem` é relativo à fonte da raiz. |
| 17 | Caminho `<package>` errado na instalação para Claude e no `AGENTS.md`. O Cursor aplicava as regras de plataforma sem o "portão" central. | Caminhos reescritos na instalação. No Cursor, um stub central sempre ativo de 1,4 KB e globs menos invasivos (RN e `.cs` sem glob). |

## Pontos de divergência e como foram resolvidos

- **Precisão (R2 × R3).** R2 queria valores exatos em todo lugar; R3 achava que isso aumenta o custo e os erros de cópia. Decisão: exato só nos tokens de tema, gerados pela CLI; nas chamadas avulsas, 0,5; no XML e no SDPS, inteiro (R1 confirmou que essas APIs só aceitam inteiros).
- **Onde cada regra mora (R3).** O que o modelo poderia calcular errado foi para a CLI: buckets, altura de runtime, `compare`, `--theme` e o bloqueio de pixels físicos. O texto das skills só diz qual comando rodar.
- **Tablet de referência para `compare` (R1 × R2).** R2 propôs sw800 fixo; R1 apontou que isso é escolha, não fato da biblioteca. Decisão: o tablet é informado no comando, conforme os `formFactors` do projeto.

## Teste visual com agentes cegos

Três templates (frame Figma 412×917, protótipo Claude Design 390×844, página responsiva existente 375×667) foram implementados por agentes que receberam só as skills, o input e o config. Comparamos por screenshot na tela base de cada design (detalhes e imagens em `evals/visual/`).

- **Rodada 1:** os agentes escolheram a tela base correta e a estratégia certa nos três casos. O erro de tamanho ficou ≤ 2,7%, contra +25–37% da conversão ingênua. Achados:
  - fonte arredondada a 0,5 mudava a quebra de linha;
  - `detect` não via evidências de design;
  - a skill web não citava `<style data-webdimens>`;
  - faltavam regras para grids, barras fixas e cartões de tablet.
- **Rodada 2** (depois das correções): maior erro de tamanho de 1,3% (Figma), 0,2% (Claude Design) e 0,6% (responsivo); fontes exatas; o `detect` encontrou a tela base sozinho nos três casos. Ajustes finais:
  - sintaxe de token por plataforma na CLI (`--syntax`);
  - alvos do config no `detect`;
  - contorno interno do Figma;
  - regra única para overrides de containers de tablet;
  - quando valores repetidos viram tokens de tema.

## O que ainda não foi feito

- Rodar os 18 casos de `evals/` com Claude Code, Codex e Cursor e registrar a pontuação. O script `evals/score.mjs` está pronto.
- Teste visual em Compose/SwiftUI/Flutter reais (só a web pôde ser renderizada no container).
- Confirmar em aparelho real a altura que o Android reporta conforme o targetSdk. Por isso o kit pede `--runtime-height` em vez de assumir um valor.
