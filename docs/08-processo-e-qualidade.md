# 08 — Processo e qualidade

Atende RNF-09 a RNF-13.

## 1. Gitflow

Gitflow completo em projeto de uma pessoa é cerimônia. O que se adota aqui é o
subconjunto que produz um histórico legível e demonstra o fluxo, sem inventar
ritual:

```
main        ●────────────────────────────────────●  v1.0.0
             \                                  /
develop       ●──●──●──●──●──●──●──●──●──●──●──●
               \  /    \  /       \  /    \  /
feature/*       ●●      ●●         ●●      ●●
```

| Branch | Origem | Destino | Uso |
|---|---|---|---|
| `main` | — | — | Só releases. Uma tag por versão |
| `develop` | `main` | `main` | Integração contínua do trabalho |
| `feature/<escopo>` | `develop` | `develop` | Toda unidade de trabalho |
| `release/1.0.0` | `develop` | `main` + `develop` | Fecha a versão: README, versão, ajustes finais |
| `hotfix/<escopo>` | `main` | `main` + `develop` | Correção pós-release |

**`release/*` será usado uma vez**, para fechar a entrega. **`hotfix/*`
provavelmente não será usado** — não haverá produção para corrigir. Fica
documentado porque o fluxo precisa estar definido antes de ser necessário, não
depois.

Merge em `develop` é **`--no-ff`**: preserva o agrupamento de commits da feature
no grafo. Um `git log --graph` deixa visível qual commit pertenceu a qual
unidade de trabalho — que é o ponto de usar Gitflow num projeto solo.

### Branches planejadas

| Branch | Entrega |
|---|---|
| `feature/docs-specs` | Esta pasta `docs/` |
| `feature/setup-ferramental` | ESLint, Prettier, husky, commitlint, scripts |
| `feature/dominio-financeiro` | A regra do item 4, por TDD — **primeiro código do projeto** |
| `feature/dominio-alunos` | Entidade Aluno, invariantes, repositório em memória |
| `feature/api-alunos` | Rotas de alunos e financeiro, validação, erros |
| `feature/assistente-demo` | Laço de tool use + provider demo |
| `feature/assistente-anthropic` | Provider real, tratamento de erro do SDK |
| `feature/frontend` | React + Vite, telas, estados |
| `feature/docker-mysql` | Compose, migrations, adaptador MySQL, seed |
| `feature/readme` | README completo com a análise do item 4 |
| `release/1.0.0` | Fechamento |

A ordem não é arbitrária: `feature/dominio-financeiro` vem primeiro porque é o
item 4, é o núcleo do que está sendo avaliado, e é a única parte do sistema que
não depende de nenhuma outra.

## 2. Conventional Commits

```
<tipo>(<escopo>): <descrição no imperativo, minúscula, sem ponto final>

[corpo opcional, explicando o porquê e não o quê]

[rodapé opcional]
```

**Tipos:** `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`, `ci`,
`style`, `perf`.

**Escopos:** `alunos`, `financeiro`, `assistente`, `web`, `infra`, `docs`,
`deps`.

Exemplos reais deste projeto:

```
feat(financeiro): derivar situação de adimplência a partir das parcelas
test(financeiro): cobrir parcela que vence no dia de referência
fix(financeiro): tratar pagamento parcial como parcela não quitada
docs(readme): documentar causa-raiz da situação financeira incorreta
chore(deps): adicionar mysql2 para o adaptador de persistência
refactor(assistente): extrair laço de tool use do provider
```

**Regra de corpo:** quando o commit envolve uma decisão não óbvia, o corpo
explica o **porquê**. O diff já mostra o quê.

```
fix(financeiro): comparar datas por string ISO em vez de objeto Date

new Date('2026-10-26') produz meia-noite UTC, que são 21h do dia anterior
em America/Sao_Paulo. Entre 21h e meia-noite, parcelas que vencem hoje eram
classificadas como vencidas. Strings ISO YYYY-MM-DD comparam corretamente
por ordem lexicográfica e eliminam a dependência de fuso.

Cobre o caso 8 do docs/06.
```

### Enforcement

`commitlint` com `@commitlint/config-conventional`, acionado por `husky` no hook
`commit-msg`. Escopos restritos à lista acima via `scope-enum`. Um commit fora do
padrão é **rejeitado na hora de commitar**, não descoberto na revisão.

## 3. Hooks de Git

| Hook | Roda | Por quê |
|---|---|---|
| `pre-commit` | `lint-staged` → ESLint + Prettier nos arquivos em stage | Rápido; não bloqueia o fluxo |
| `commit-msg` | `commitlint` | Padrão de mensagem |
| `pre-push` | `npm run check` (lint + suíte completa) | Nada quebrado chega ao remoto |

A suíte completa fica no `pre-push`, não no `pre-commit`. Testes no pre-commit
punem o hábito de commitar pequeno, que é exatamente o hábito que o TDD exige.

## 4. TDD

**Ciclo:** red → green → refactor. Teste primeiro, sempre, para lógica de
domínio e de aplicação.

### O que tem teste, e o que não tem

| Camada | Testa? | Tipo |
|---|---|---|
| `domain/` | **Sim, sempre, primeiro** | Unitário puro, sem mock |
| `application/` | Sim | Unitário com repositório em memória — não mock |
| `infra/` repositórios | Só o de memória | O de MySQL precisaria de banco: fora do escopo de "testes unitários curtos" |
| `infra/` provider demo | Sim | Unitário — é lógica de roteamento, determinística |
| `infra/` provider Anthropic | Só o mapeamento de erro | `fetch` mocado; não se testa a API da Anthropic |
| `http/` | Não | Smoke manual via `curl`, documentado no doc 07 §7 |
| Front | Não | O enunciado pede unitários da regra financeira; UI fica em verificação manual |

O uso do repositório **em memória** em vez de mocks nos testes de aplicação é
deliberado: o adaptador de memória é código real, com o mesmo contrato. Um teste
contra ele verifica o caso de uso de verdade; um teste contra mock verifica que o
mock foi configurado.

### Forma de um teste

Curto, uma asserção, nome descrevendo comportamento:

```js
test('aluno sem parcelas é considerado adimplente', () => {
  assert.equal(calcularSituacao([], '2026-10-26'), 'ADIMPLENTE');
});
```

Sem `describe` aninhado, sem `beforeEach` compartilhado, sem fixture global. Cada
teste é legível isoladamente. A saída de `npm test` deve ler como a
especificação do sistema — e é esse o critério para avaliar um nome de teste.

**Runner:** `node:test` + `node:assert/strict`. Nativos no Node 22, zero
dependências.

## 5. Lint e formatação

**ESLint 9** com flat config (`eslint.config.js`) + **Prettier**. ESLint cuida de
correção, Prettier de formatação; `eslint-config-prettier` desliga as regras de
estilo do ESLint para não haver disputa.

Além do recomendado, duas famílias de regra fazem trabalho real aqui:

```js
// 1. Fronteiras entre módulos — doc 02 §2
'no-restricted-imports': ['error', {
  patterns: [
    {
      group: ['**/modules/*/domain/**', '**/modules/*/infra/**', '**/modules/*/application/**'],
      message: 'Importe um módulo apenas pelo index.js dele.',
    },
  ],
}],

// 2. O domínio não conhece o mundo exterior
// (via override para src/modules/*/domain/**)
'no-restricted-imports': ['error', {
  paths: ['fastify', 'mysql2', '@anthropic-ai/sdk'],
  patterns: ['**/infra/**', '**/http/**'],
}],
```

A segunda regra é o mecanismo que impede a reincidência do bug do item 4
(doc 06 §2): ela torna impossível, no nível da ferramenta, que a regra de
adimplência volte a depender de HTTP ou de banco.

Verificação de tipos: `// @ts-check` nos arquivos de domínio e `checkJs` no
`jsconfig.json`. Dá verificação a partir de JSDoc sem etapa de build no
back-end.

## 6. CI

GitHub Actions, um workflow, acionado em push para `develop`/`main` e em todo PR:

```yaml
jobs:
  verificar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci --prefix backend
      - run: npm run lint --prefix backend
      - run: npm test --prefix backend
      - run: npm run check:secrets --prefix backend
      - run: npm ci --prefix frontend
      - run: npm run lint --prefix frontend
      - run: npm run build --prefix frontend
```

`check:secrets` no CI é o que transforma "não comitar a chave" de intenção em
garantia verificada (RNF-03).

## 7. Uso de IA no desenvolvimento

O enunciado pede explicitamente: *"Explicação de como utilizou ferramentas de IA
durante o desenvolvimento"*. Registramos conforme acontece, não reconstruído no
fim, numa seção do README cobrindo:

- **Onde a IA foi usada** — estas specs, o esqueleto dos adaptadores, a redação
  do README.
- **Onde não foi** — a regra do item 4 e seus casos de borda foram derivados
  manualmente a partir do enunciado; é o núcleo da avaliação e precisa ser
  defensável linha a linha.
- **Como foi validado** — toda saída de IA passou pela suíte de testes, pelo
  lint e por leitura. O enunciado condiciona o uso de IA a *"desde que o
  candidato consiga explicar e validar o código produzido"*, e essa é a regra
  que governa o que entra no repositório.
- **O que foi descartado** — sugestões rejeitadas e o motivo. Essa é a parte que
  de fato demonstra julgamento; aceitar tudo que a ferramenta propõe não
  demonstra nada.
