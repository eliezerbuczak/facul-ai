# Documentação — Gestão Acadêmica

Specs do projeto, escritas **antes** da implementação. Cada documento tem um
escopo fechado e é referenciado pelos demais por ID de requisito (`RF-xx` /
`RNF-xx`) ou por ADR.

## Índice

| Doc | Conteúdo |
|---|---|
| [01 — Requisitos](01-requisitos.md) | Requisitos funcionais e não-funcionais, rastreados até o enunciado |
| [02 — Arquitetura](02-arquitetura.md) | Monolito modular, fronteiras entre módulos, estrutura de pastas |
| [03 — Domínio e dados](03-dominio-e-dados.md) | Entidades, invariantes, schema MySQL, seed |
| [04 — Contrato da API](04-contrato-api.md) | Endpoints, payloads, códigos de erro |
| [05 — Assistente de IA](05-assistente-ia.md) | Tool use, grounding, modo demo, MCP |
| [06 — Regra de situação financeira](06-regra-situacao-financeira.md) | A regra do item 4 + tabela de casos de teste |
| [07 — Ambiente de desenvolvimento](07-ambiente-dev.md) | Docker, scripts, variáveis de ambiente |
| [08 — Processo e qualidade](08-processo-e-qualidade.md) | Gitflow, Conventional Commits, TDD, lint |
| [ADRs](adr/) | Decisões arquiteturais com contexto e alternativas descartadas |

## Decisões em uma linha

| # | Decisão | Doc |
|---|---|---|
| 0001 | Monolito modular, organizado por domínio e não por camada técnica | [ADR](adr/0001-monolito-modular.md) |
| 0002 | Fastify no back-end, React + Vite no front-end | [ADR](adr/0002-fastify-e-vite.md) |
| 0003 | Repositório com dois adaptadores: memória (padrão) e MySQL (Docker) | [ADR](adr/0003-repositorio-dual.md) |
| 0004 | Tool use em vez de MCP para o requisito do assistente; MCP como bônus | [ADR](adr/0004-tool-use-em-vez-de-mcp.md) |
| 0005 | Modo demo compartilha o pipeline real; só a decisão de ferramenta muda | [ADR](adr/0005-modo-demo.md) |
| 0006 | Situação financeira é derivada das parcelas, nunca persistida | [ADR](adr/0006-situacao-derivada.md) |
| 0007 | shadcn/ui no front — supersede parcialmente o 0002 | [ADR](adr/0007-shadcn-ui.md) |

## Convenções destes documentos

- **MUST / DEVE** — requisito obrigatório; sua ausência é um defeito.
- **SHOULD / DEVERIA** — recomendado; desvios precisam de justificativa no PR.
- **MAY / PODE** — opcional, fica a critério da implementação.
- Valores monetários são sempre **inteiros em centavos** nos documentos e no código.
- Datas em ISO 8601 (`YYYY-MM-DD`), fuso de referência `America/Sao_Paulo`.
