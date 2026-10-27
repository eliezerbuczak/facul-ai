# ADR 0006 — Situação financeira é derivada, nunca persistida

**Status:** aceito · **Data:** 2026-10-26

## Contexto

O item 4 do enunciado: *"Um aluno com mensalidade em aberto está aparecendo como
adimplente na interface."* A causa-raiz mais provável (doc 06 §2, causa A) é um
campo `situacao_financeira` persistido e atualizado por evento de pagamento.

O defeito desse desenho é o que **não** gera evento: o *vencimento* de uma
parcela não é um evento de sistema, é a passagem do tempo. Nenhum código roda à
meia-noite. O campo fica preso no último estado bom — sempre falhando para o
lado otimista, sempre com mensalidade em aberto. Exatamente o sintoma relatado.

## Decisão

A situação financeira **não existe como dado**. É uma função:

```
calcularSituacao(parcelas, hoje) -> ADIMPLENTE | INADIMPLENTE
```

Pura, em `financeiro/domain/`, sem dependências. Calculada a cada leitura.
Nenhuma coluna `situacao_financeira` no schema; nenhum campo `situacao` na
entidade `Aluno`.

Mesma decisão para a situação de cada parcela (`PAGA` · `VENCIDA` ·
`A_VENCER`): derivada de `vencimento`, `pagoEm` e `valorPagoCentavos`.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Campo persistido + job noturno de recálculo | Reduz a janela de inconsistência para 24h em vez de eliminá-la. Adiciona um ponto de falha silenciosa — job que para de rodar não dá erro visível. É a causa-raiz com um curativo |
| Coluna calculada no banco (`GENERATED`) | A regra ficaria em DDL: não testável por unidade, não versionada junto do domínio, e duplicada se outro adaptador de persistência existir |
| Cache com invalidação por TTL | Otimização sem problema. O cálculo é um `.some()` sobre dezenas de parcelas |

## Consequências

**Positivas** — a classe de bug do item 4 deixa de ser expressável: não há
estado para dessincronizar; a regra é uma função pura, testável sem
infraestrutura (doc 06 §3); `hoje` é parâmetro, então os casos de borda de data
testam sem mocar relógio; a resposta da API devolve a `referencia` e as
parcelas, tornando o veredito auditável.

**Negativas** — `GET /api/alunos?situacaoFinanceira=...` precisa das parcelas de
todos os alunos do recorte, o que exige um `porAlunos(ids)` em lote para evitar
N+1 (previsto no doc 02 §4); com volume alto de parcelas por aluno, o cálculo
repetido teria custo — irrelevante nesta escala, e um problema que se resolve com
cache no dia em que existir, sem voltar a persistir o estado.
