# ADR 0003 — Repositório com dois adaptadores: memória e MySQL

**Status:** aceito · **Data:** 2026-10-26

## Contexto

O enunciado diz: *"Utilize dados fictícios locais (JSON ou banco em memória)"* e
*"a aplicação deve funcionar localmente seguindo as instruções do README"*.
Queremos também demonstrar MySQL em Docker, que está **acima** do pedido.

A tensão: exigir Docker para rodar o projeto adiciona um modo de falha
(porta ocupada, daemon parado, imagem não baixando) entre o avaliador e o
primeiro `curl` bem-sucedido. Ignorar o MySQL descarta um diferencial.

## Decisão

Uma porta de repositório por entidade, com dois adaptadores cada:

- `memoria` — carrega `seed/dados.json` em memória. **Padrão.**
- `mysql` — `mysql2` com SQL direto.

Selecionados por `PERSISTENCIA=memoria|mysql`. Os dois leem **o mesmo arquivo de
seed** como fonte dos dados.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Só memória | Cumpre o enunciado, descarta o diferencial de Docker/MySQL |
| Só MySQL | Acima do pedido, e torna Docker pré-requisito para avaliar. Trabalha contra o critério de entrega |
| SQLite (`node:sqlite`) | Meio-termo tentador: banco real, sem contêiner. Mas o enunciado não pede banco nenhum, e SQLite não demonstra a habilidade com Docker+MySQL que o diferencial pretende mostrar. Duas opções já é o suficiente; três seria indecisão virando arquitetura |

## Consequências

**Positivas** — `npm install && npm run dev` funciona num clone limpo (RNF-07);
`docker compose up` demonstra MySQL (RNF-08); testes unitários rodam contra o
adaptador de memória sem banco e sem mock; a existência de dois adaptadores é o
que prova que a porta é uma abstração real e não decoração.

**Negativas** — duas implementações de cada repositório para manter em sincronia;
risco de divergência de comportamento (a busca sem acentuação precisa casar com
a collation `utf8mb4_0900_ai_ci` — mitigado por rodar a mesma suíte de
repositório contra os dois adaptadores).
