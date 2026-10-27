# 06 — Regra de situação financeira

Este documento responde ao **item 4 (Sustentação)** do enunciado. Ele define a
regra, enumera os casos de borda que viram suíte de testes, e registra a análise
de causa-raiz que vai para o README.

> **Problema do enunciado:** *"Um aluno com mensalidade em aberto está
> aparecendo como adimplente na interface."*

## 1. A regra

`calcularSituacao(parcelas, hoje)` é uma **função pura**: mesmas entradas,
mesma saída, sem relógio, sem banco, sem rede. `hoje` é parâmetro, não
`new Date()` lido lá dentro — é isso que a torna testável sem mocar tempo.

### Passo 1 — situação de cada parcela

```
quitada(p)    ≡  p.pagoEm ≠ null  ∧  p.valorPagoCentavos ≥ p.valorCentavos

PAGA          ≡  quitada(p)
VENCIDA       ≡  ¬quitada(p)  ∧  p.vencimento <  hoje
A_VENCER      ≡  ¬quitada(p)  ∧  p.vencimento ≥  hoje
```

Três pontos que carregam o peso:

- **Quitação exige valor suficiente, não só data de pagamento.** `pagoEm ≠ null`
  sozinho não basta. Pagamento parcial não quita (caso 7).
- **`<` estrito, não `≤`.** Uma parcela que vence **hoje** ainda não venceu —
  o devedor tem o dia inteiro. `vencimento ≤ hoje` transformaria todo dia de
  vencimento num dia de inadimplência (caso 3).
- **Pagar com atraso não deixa resíduo.** `quitada` não olha se `pagoEm >
  vencimento`. Atraso é fato histórico; a pergunta "o aluno está inadimplente
  **hoje**?" se responde com o que está em aberto agora (caso 5).

### Passo 2 — situação do aluno

```
INADIMPLENTE  ≡  ∃ p ∈ parcelas : situacao(p) = VENCIDA
ADIMPLENTE    ≡  caso contrário
```

Uma única parcela vencida basta. Conjunto vazio é `ADIMPLENTE` — quantificador
existencial sobre conjunto vazio é falso, e o resultado é correto no domínio:
quem não deve nada está em dia.

### Comparação de datas

Datas são strings ISO `YYYY-MM-DD` e comparam por **ordem lexicográfica**, não
por objeto `Date`:

```js
// ✅ correto — sem fuso, sem instante
p.vencimento < hoje

// ❌ errado — new Date('2026-10-26') é meia-noite UTC, não de Brasília
new Date(p.vencimento) < new Date()
```

`hoje` é produzido uma vez por requisição por `hojeEm('America/Sao_Paulo')` e
propagado. Esse detalhe é o caso 8 e é uma das causas-raiz plausíveis do bug
original (§2, causa D).

### Não existe coluna, não existe campo

A situação é calculada em tempo de leitura, toda vez. Não há
`alunos.situacao_financeira` no banco, nem `Aluno.situacao` na entidade. Isso é
a correção estrutural, não um detalhe de estilo — ver §2 e
[ADR 0006](adr/0006-situacao-derivada.md).

## 2. Análise de causa-raiz

O enunciado descreve o sintoma; a causa não é dada. Abaixo, as hipóteses
compatíveis com o sintoma observado, em ordem de probabilidade. Todas produzem
**falso negativo de inadimplência** — a direção específica do erro relatado.

### Causa A — situação persistida que dessincroniza *(mais provável)*

O sistema guarda `alunos.situacao_financeira` e atualiza no **evento de
pagamento**: quitou → grava `ADIMPLENTE`.

O defeito é o que **não** dispara evento. O *vencimento* de uma parcela não é um
evento de sistema — é a passagem do tempo. Ninguém chama nada à meia-noite. Então
o aluno fica gravado como `ADIMPLENTE` indefinidamente, até que algum pagamento
futuro force o recálculo.

Isso explica o sintoma com precisão: o campo fica **preso no último estado bom**.
Falha sempre para o lado otimista, sempre com mensalidade em aberto — exatamente
o relato. Um job noturno de recálculo mascara o problema mas não o resolve: cria
uma janela de inconsistência de até 24 horas e um ponto único de falha silenciosa.

### Causa B — a regra mora na camada de apresentação

O front recebe as parcelas e decide:

```js
const adimplente = parcelas.every(p => p.status !== 'PENDENTE');
```

Se o back-end não envia `status` em alguma parcela, `undefined !== 'PENDENTE'` é
`true` e a parcela é tratada como paga. A frase do enunciado — *"está aparecendo
como adimplente **na interface**"* — aponta nessa direção. É a mesma falha de
fundo da causa A: a regra está num lugar onde não deveria estar.

### Causa C — pagamento parcial conta como quitação

```js
const quitada = p.pagoEm !== null;   // ignora valorPagoCentavos
```

Aluno paga R$ 100 de uma mensalidade de R$ 1.250. `pagoEm` é gravado, a parcela
vira "paga", e R$ 1.150 em aberto desaparecem do radar.

### Causa D — comparação de data com fuso errado

```js
if (new Date(p.vencimento) > new Date()) { /* a vencer */ }
```

`new Date('2026-10-26')` é `2026-10-26T00:00:00Z` — 21h do dia 25 em Brasília.
Com `new Date()` em UTC, a janela entre 21h e meia-noite BRT classifica errado.
Produz erro intermitente, dependente da hora do dia, que não reproduz no
ambiente do desenvolvedor de manhã.

### Causa E — considera só a parcela mais recente

```js
const ultima = parcelas.at(-1);
return ultima.pagoEm ? 'ADIMPLENTE' : 'INADIMPLENTE';
```

Aluno paga outubro mas deve agosto: a última parcela está paga, o veredito sai
`ADIMPLENTE`, agosto segue em aberto.

### A correção

Todas as cinco causas têm a mesma raiz: **a situação financeira está sendo
armazenada ou decidida fora do domínio.** A correção não é consertar cada
`if` — é tornar a classe de bug inexpressável:

1. A situação é **derivada**, nunca persistida. Não há estado para dessincronizar
   (mata A).
2. A derivação vive em **uma** função pura em `financeiro/domain/`, e é o único
   lugar do sistema que decide adimplência. O front recebe o veredito pronto
   (mata B).
3. A regra trata explicitamente quitação parcial, limite de vencimento e fuso
   (mata C, D).
4. A regra percorre **todas** as parcelas (mata E).
5. A regra de fronteira do linter impede que `http/` ou o front voltem a
   implementar a decisão (impede o retorno de B).

### Como validamos

- A tabela de casos da §3 vira suíte de testes unitários, escrita **antes** da
  implementação (TDD). Casos 3, 5, 7 e 8 são os que distinguem a regra correta
  das implementações ingênuas das causas A–E.
- O seed cobre todos os casos (doc 03 §4), então cada um é reproduzível pela
  interface, sem escrever teste.
- `GET /api/alunos/:id/financeiro` devolve a `referencia` usada e as parcelas com
  situação individual: o veredito é conferível à mão.

### Como evitamos reincidência

| Mecanismo | O que impede |
|---|---|
| Situação derivada, sem coluna no schema | Dessincronização (A) |
| Regra em `domain/`, função pura, zero dependências | Decisão espalhada (B, E) |
| Regra de fronteira no ESLint: `http/` e front não importam `domain/` | Reintrodução de (B) |
| `CHECK` no banco: `pago_em` e `valor_pago_centavos` sempre juntos | Estado inconsistente que alimenta (C) |
| Tabela de casos de borda versionada como teste | Regressão em qualquer um dos 11 cenários |
| `referencia` + parcelas na resposta da API | Veredito opaco e não-auditável |
| Seed cobrindo todos os casos | Bug invisível em ambiente de desenvolvimento |

## 3. Casos de teste

`hoje = 2026-10-26` em todos. `v` = `valorCentavos`, `vp` = `valorPagoCentavos`.
Esta tabela **é** a suíte: um `it()` por linha, nessa ordem.

| # | Cenário | Parcelas | Esperado | Mata a causa |
|---|---|---|---|---|
| 1 | Sem parcelas | `[]` | `ADIMPLENTE` | — |
| 2 | Todas quitadas integralmente | `venc 09-10, pagoEm 09-08, v=vp` | `ADIMPLENTE` | — |
| 3 | **Vence hoje, não paga** | `venc 10-26, pagoEm null` | `ADIMPLENTE` | D (`≤` vs `<`) |
| 4 | Venceu ontem, não paga | `venc 10-25, pagoEm null` | `INADIMPLENTE` | — |
| 5 | **Venceu, mas paga com atraso** | `venc 09-10, pagoEm 09-28, v=vp` | `ADIMPLENTE` | — |
| 6 | Só parcelas futuras em aberto | `venc 11-10, pagoEm null` | `ADIMPLENTE` | — |
| 7 | **Parcial de parcela vencida** | `venc 10-10, pagoEm 10-10, v=125000, vp=10000` | `INADIMPLENTE` | C |
| 8 | **Vence hoje, 23h30 BRT** | `venc 10-26`, relógio `2026-10-27T02:30:00Z` | `ADIMPLENTE` | D (fuso) |
| 9 | Nove pagas, uma vencida | 9× quitadas + `venc 08-10, pagoEm null` | `INADIMPLENTE` | E |
| 10 | Parcial de parcela a vencer | `venc 11-10, pagoEm 11-01, vp < v` | `ADIMPLENTE` | — |
| 11 | Pago a mais que o devido | `venc 09-10, v=125000, vp=130000` | `ADIMPLENTE` | — |

Os quatro em negrito são os que uma implementação ingênua erra. São o conteúdo
real do item 4; os demais são rede de proteção.

### Casos para `situacao` de cada parcela

Testados separadamente, porque o front depende deles (RF-13):

| # | Parcela | Esperado |
|---|---|---|
| P1 | Quitada integralmente | `PAGA` |
| P2 | Em aberto, vencimento passado | `VENCIDA` |
| P3 | Em aberto, vence hoje | `A_VENCER` |
| P4 | Em aberto, vencimento futuro | `A_VENCER` |
| P5 | Parcial, vencimento passado | `VENCIDA` |
| P6 | Parcial, vencimento futuro | `A_VENCER` |

### Invariantes da entidade

| # | Entrada | Esperado |
|---|---|---|
| I1 | `pagoEm` presente, `valorPagoCentavos` null | lança `ErroDeDominio` |
| I2 | `pagoEm` null, `valorPagoCentavos` presente | lança `ErroDeDominio` |
| I3 | `valorCentavos` = 0 ou negativo | lança `ErroDeDominio` |
| I4 | `valorPagoCentavos` = 0 com `pagoEm` presente | lança `ErroDeDominio` |

## 4. Estratégia de teste

**Arquivo:** `backend/src/modules/financeiro/domain/situacao-financeira.test.js`,
colocado ao lado do código que testa. `node --test` encontra `**/*.test.js`
sozinho.

**Runner:** `node:test` + `node:assert/strict`, nativos do Node 22. Zero
dependências de teste.

**Ordem (TDD, red-green-refactor):** esta é a primeira coisa implementada no
projeto, antes de qualquer rota, repositório ou componente.

Os ciclos são agrupados por **comportamento**, não um por caso: um par
vermelho-verde para cada um dos 11 casos daria 22 commits para uma função de 20
linhas, o que é cerimônia e não disciplina. Cada ciclo abaixo tem um vermelho
real, causado por uma lacuna genuína da implementação anterior:

| Ciclo | Casos | O que o vermelho forçou |
|---|---|---|
| 1 | 1, 2, 4, 6, 9 | A regra base — o módulo não existia |
| 2 | 7, 10, 11 | Quitação exige `valorPago >= valor`; `pagoEm !== null` não basta |
| 3 | 3, 5, 8 | Derivar `hoje` pelo fuso em vez de comparar instantes UTC |
| 4 | I1–I4, P1–P6 | Validação das invariantes na construção da entidade |

**Nem todo caso produz vermelho, e isso fica registrado em vez de encenado.** Os
casos 3, 5, 10 e 11 passaram assim que foram escritos, contra a implementação
que já existia. Entram como proteção de regressão: o valor deles é travar o
comportamento e documentar por que ele é assim, não dirigir código novo.
Escrever uma implementação deliberadamente errada só para fabricar um vermelho
seria teatro, não TDD.

**Forma de cada teste** — curtos, uma asserção, sem setup compartilhado:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularSituacao } from './situacao-financeira.js';
import { parcela } from './_fixtures.js';

const HOJE = '2026-10-26';

test('parcela que vence hoje e não foi paga não torna o aluno inadimplente', () => {
  const parcelas = [parcela({ vencimento: HOJE, pagoEm: null })];
  assert.equal(calcularSituacao(parcelas, HOJE), 'ADIMPLENTE');
});

test('pagamento parcial de parcela vencida mantém o aluno inadimplente', () => {
  const parcelas = [parcela({
    vencimento: '2026-10-10', pagoEm: '2026-10-10',
    valorCentavos: 125_000, valorPagoCentavos: 10_000,
  })];
  assert.equal(calcularSituacao(parcelas, HOJE), 'INADIMPLENTE');
});
```

`parcela()` é um construtor de fixture com padrões sensatos; cada teste sobrescreve
só o que importa para ele. O nome do teste descreve o **comportamento**, não a
função — é o que torna a saída de `npm test` legível como especificação.

**Cobertura:** `node --test --experimental-test-coverage`. Alvo **100% de linhas
e ramos** em `financeiro/domain/` — é uma função pura de 20 linhas, cobertura
total é barata e é o núcleo do item 4. Fora do domínio não há meta de cobertura;
perseguir número em código de infraestrutura produz teste que não testa nada.
