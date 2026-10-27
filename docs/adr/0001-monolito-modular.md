# ADR 0001 — Monolito modular organizado por domínio

**Status:** aceito · **Data:** 2026-10-26

## Contexto

O sistema tem três áreas com vocabulários distintos (cadastro acadêmico,
financeiro, assistente de IA) e é entregue como uma aplicação local única. O
item 4 do enunciado descreve um bug de regra de negócio decidida na camada de
apresentação.

## Decisão

Monolito modular: um processo, organizado por **domínio** e não por camada
técnica. Cada módulo tem suas próprias camadas internas (`domain`,
`application`, `infra`, `http`) e expõe uma API pública por `index.js`. Módulos
se comunicam exclusivamente por essa API, com a regra verificada pelo linter.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Camadas globais (`controllers/`, `services/`, `models/`) | Agrupa por tipo de arquivo, não por conceito. Uma mudança no financeiro toca três pastas distantes; nada impede a regra de adimplência de morar num controller — que é precisamente o bug do item 4 |
| Microsserviços | Três domínios minúsculos, um consumidor, execução local. Custo de operação sem nenhum benefício |
| Sem estrutura, tudo em `src/` | Funciona em 300 linhas e para de funcionar depois. Não demonstra capacidade de estruturar uma solução, que é o critério declarado de avaliação |

## Consequências

**Positivas** — a regra do item 4 fica isolada num núcleo sem dependências,
testável sem infraestrutura; a fronteira entre módulos é verificada
mecanicamente; se um módulo precisar virar serviço, o corte já está feito.

**Negativas** — mais pastas que o mínimo para um projeto deste tamanho; exige
disciplina na importação, mitigada pela regra de lint; algum boilerplate de
`index.js`.
