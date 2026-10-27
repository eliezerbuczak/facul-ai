# Gestão Acadêmica

Aplicação de consulta de alunos e situação financeira, com assistente de IA
sobre os dados. Teste técnico para vaga full stack.

**Node 22 · Fastify · React · shadcn/ui · 233 testes · sem dependência de chave de API para rodar**

---

## Rodar localmente

Só precisa de **Node 22 ou superior**. Não precisa de Docker, banco, nem chave
de API.

```bash
git clone git@github.com:eliezerbuczak/facul-ai.git
cd facul-ai

npm install                       # ferramental (lint, hooks de commit)
npm install --prefix backend
npm install --prefix frontend
```

Em dois terminais:

```bash
npm run dev --prefix backend      # API em http://localhost:3000
```

```bash
npm run dev --prefix frontend     # interface em http://localhost:5173
```

Abra <http://localhost:5173>.

> O `.env` é **opcional** — todo valor tem padrão. Para customizar:
> `cp .env.example .env` na raiz. Se a porta 5173 estiver ocupada,
> `PORT=5174 npm run dev --prefix frontend`.

### Conferir que subiu

```bash
curl -s localhost:3000/api/health
# {"status":"ok","persistencia":"memoria","assistente":{"modo":"demo"}}

curl -s "localhost:3000/api/alunos?busca=thais" | head -c 200

curl -s -X POST localhost:3000/api/assistente \
  -H 'content-type: application/json' \
  -d '{"pergunta":"Quais alunos estão inadimplentes?"}'
```

### Rodar os testes

```bash
npm test                              # backend (223)
npm test --prefix frontend            # front (10)
npm run check                         # lint + formatação + testes + segredos
npm run test:cov --prefix backend     # cobertura
```

---

## O que está implementado e o que está apenas demonstrado

O enunciado pede essa distinção explícita. Aqui está ela.

| Item | Estado |
|---|---|
| `GET /api/alunos` · `/:id` · `/:id/financeiro` · `POST /api/assistente` | **Implementado** |
| Interface React completa | **Implementado** |
| Regra de situação financeira (item 4) | **Implementado**, com 100% de cobertura |
| Integração com a API da Anthropic | **Implementado** — código real, testado com cliente injetado. **Nunca executado contra a API**, por não haver chave |
| Assistente em modo demonstrativo | **Implementado** e é o que roda por padrão |
| Persistência MySQL + Docker | **Não implementado.** Especificado em [docs/03 §3](docs/03-dominio-e-dados.md) e [docs/07 §3](docs/07-ambiente-dev.md); a porta `AlunoRepository` existe e tem só o adaptador de memória |
| Servidor MCP | **Não implementado.** Desenho e justificativa em [docs/05 §8](docs/05-assistente-ia.md) |

### Sobre o modo demonstrativo

Sem `ANTHROPIC_API_KEY`, a aplicação sobe em modo demonstrativo e **declara
isso em toda resposta** (`"modo": "demo"`) e no `/api/health`. A interface
mostra um selo.

O que importa no desenho: **o modo demo não é um mock**. Ele percorre o mesmo
laço de *tool use*, o mesmo despacho de ferramentas, os mesmos casos de uso, os
mesmos repositórios e a mesma verificação de *grounding* do modo real. O que é
simulado é só *a decisão de qual ferramenta chamar* — a parte que o LLM faria.

A fronteira entre implementado e demonstrado é, literalmente, **um arquivo**:
`backend/src/modules/assistente/infra/demo.provider.js`.

Para usar a integração real, basta preencher `ANTHROPIC_API_KEY` no `.env`.
Nenhuma mudança de código.

---

## Item 4 — Sustentação

> *"Um aluno com mensalidade em aberto está aparecendo como adimplente na interface."*

Análise completa em [docs/06](docs/06-regra-situacao-financeira.md). Resumo:

### Possível causa-raiz

Cinco hipóteses são compatíveis com o sintoma. Todas produzem **falso negativo
de inadimplência** — a direção específica do erro relatado.

**A mais provável: a situação financeira estava sendo persistida.** Um campo
`alunos.situacao_financeira`, atualizado no **evento de pagamento**.

O defeito é o que **não** dispara evento. O *vencimento* de uma parcela não é
um evento de sistema — é a passagem do tempo. Nenhum código roda à meia-noite.
O campo fica preso no último estado bom, falhando sempre para o lado otimista,
sempre com mensalidade em aberto. É exatamente o relato.

As outras quatro: regra implementada na camada de apresentação; pagamento
parcial contado como quitação; comparação de data com fuso errado
(`new Date('2026-10-26')` é 21h do dia 25 em Brasília); e considerar apenas a
parcela mais recente.

### Como a correção foi implementada

Todas as cinco causas têm a mesma raiz: **a situação estava sendo armazenada ou
decidida fora do domínio**. A correção não foi consertar cada `if` — foi tornar
a classe de bug inexpressável.

```js
// backend/src/modules/financeiro/domain/situacao-financeira.js
export function calcularSituacao(parcelas, hoje) {
  const temVencida = parcelas.some((p) => situacaoDaParcela(p, hoje) === 'VENCIDA');
  return temVencida ? INADIMPLENTE : ADIMPLENTE;
}
```

Função pura, sem coluna no banco e sem campo na entidade. `hoje` é **parâmetro**,
não `new Date()` lido lá dentro.

Quatro detalhes carregam o peso:

| Decisão | Por quê |
|---|---|
| `vencimento < hoje`, estrito | Parcela que vence **hoje** ainda não venceu. Com `<=`, todo dia de vencimento vira dia de inadimplência |
| Quitação exige `valorPago >= valor` | `pagoEm` preenchido não basta — pagamento parcial deixa saldo |
| Pagar com atraso não deixa resíduo | Atraso é fato histórico; a pergunta é se há saldo em aberto **hoje** |
| Datas comparadas como string ISO | `'2026-10-26' < '2026-10-27'` é lexicográfico e correto. `new Date()` é um instante em UTC e erra entre 21h e meia-noite |

### Como validei o resultado

**Testes.** A tabela de casos de borda virou suíte, escrita **antes** da
implementação:

```
caso 3: parcela que vence hoje e não foi paga não torna o aluno inadimplente
caso 5: parcela paga com atraso não deixa resíduo de inadimplência
caso 7: pagamento parcial de parcela vencida mantém o aluno inadimplente
caso 8: às 23h30 de Brasília a parcela que vence hoje ainda não venceu
```

Esses quatro são os que uma implementação ingênua erra. **100% de cobertura de
linhas, ramos e funções** em `financeiro/domain/`.

Dois dos ciclos tiveram vermelho real: o caso 7 falhou contra a implementação
que usava `pagoEm !== null`, e o caso 8 exigiu derivar a data pelo fuso. Os
casos 3 e 5 passaram assim que foram escritos — isso está **registrado**, não
encenado. Escrever código errado de propósito para fabricar um vermelho seria
teatro.

**Pela interface.** O seed cobre todos os casos, então cada um é reproduzível
clicando:

| Aluno | Situação | Demonstra |
|---|---|---|
| Thaís Vasconcelos | ADIMPLENTE | parcela vence **hoje**, não paga |
| Otávio Siqueira | INADIMPLENTE | R$ 100 pagos de R$ 1.340 → R$ 1.240 em aberto |
| José Antônio Nóbrega | ADIMPLENTE | parcela paga 42 dias atrasada |
| Luís Felipe Gonçalves | INADIMPLENTE | `TRANCADO` — status acadêmico não implica adimplência |

**Auditável.** `GET /api/alunos/:id/financeiro` devolve a `referencia` usada e
cada parcela com sua situação. O veredito é conferível à mão.

### Como evitaria a reincidência

| Mecanismo | O que impede |
|---|---|
| Situação derivada, sem coluna no schema | Dessincronização |
| Regra em `domain/`, função pura, zero dependências | Decisão espalhada pelo sistema |
| **Regra de fronteira no ESLint**: `domain/` não importa Fastify, mysql2 nem SDK | Reintrodução da regra em camada errada |
| Teste afirmando que o aluno **não tem** campo de situação | Alguém readicionar o campo que causou o bug |
| Tabela de casos de borda versionada | Regressão em qualquer um dos 11 cenários |
| `referencia` + parcelas na resposta | Veredito opaco |
| Interface mostra a evidência ao lado do veredito | Bug invisível na tela |

A regra do ESLint foi verificada contra cinco casos antes de eu confiar nela —
uma regra de lint que silenciosamente não faz nada é pior que nenhuma regra.
E ela já pegou código meu duas vezes durante o desenvolvimento.

---

## Decisões técnicas

Decisões completas, com alternativas descartadas, em [docs/adr](docs/adr/).

| # | Decisão | Em uma linha |
|---|---|---|
| [0001](docs/adr/0001-monolito-modular.md) | Monolito modular por **domínio** | Não há `controllers/`; há `alunos/`, `financeiro/`, `assistente/`, cada um com suas camadas |
| [0002](docs/adr/0002-fastify-e-vite.md) | Fastify, Vite, JS com JSDoc | Schema do Fastify valida a requisição **e** serializa a resposta. TypeScript custaria uma etapa de build e perderia `node --watch`/`node --test` nativos |
| [0003](docs/adr/0003-repositorio-dual.md) | Porta de repositório com adaptadores | Memória é o padrão, então o clone roda sem Docker |
| [0004](docs/adr/0004-tool-use-em-vez-de-mcp.md) | **Tool use**, não MCP | MCP é o protocolo inverso — expõe suas ferramentas a um cliente externo. Não existe cliente MCP neste desenho |
| [0005](docs/adr/0005-modo-demo.md) | Modo demo compartilha o pipeline real | A fronteira implementado/demonstrado é um arquivo |
| [0006](docs/adr/0006-situacao-derivada.md) | Situação financeira derivada, nunca persistida | A resposta estrutural ao item 4 |
| [0007](docs/adr/0007-shadcn-ui.md) | shadcn/ui — *supersede parte do 0002* | Revisão registrada em vez de reescrita |

### Por que tool use, e não um prompt com os dados

O enunciado pede *"enviar ao modelo somente os dados necessários"* e *"evitar
que o modelo invente informações"*. Despejar o banco no prompt falha nos dois.

Com tool use, o modelo recebe a **descrição** de quatro ferramentas e nenhum
dado. Ele pede a consulta, o back-end executa contra os casos de uso reais, e
só o recorte retornado entra no contexto.

**Quatro barreiras contra invenção:**

1. **Arquitetural** — o modelo não tem outra fonte além das ferramentas.
2. **Prompt de sistema** — regras explícitas de *grounding*.
3. **Verificação pós-resposta** — resposta factual sem nenhuma ferramenta usada
   é recusada com `502`. Por construção, é resposta sem fonte.
4. **Auditabilidade** — `ferramentasUsadas` e `fontes` vão no payload e
   aparecem na interface.

A barreira 3 tem um limite conhecido, encontrado em teste manual: ela verifica
se existe **fonte**, não se a fonte **responde o que foi perguntado**. São
garantias diferentes.

### Segurança da chave

| Controle | Como |
|---|---|
| Só existe no back-end | O front nunca fala com a Anthropic; tudo passa por `POST /api/assistente` |
| Nunca no bundle | Nada de `VITE_ANTHROPIC_*` — qualquer `VITE_*` é embutido no JS servido ao navegador |
| Fora do objeto de config | Propriedade não-enumerável; config pode ir para log, a chave não |
| Nunca repassada em erro | `AuthenticationError` vira `503` genérico; a mensagem original cita a chave |
| Verificado no CI | `npm run check:secrets` falha o build se achar chave versionada |

---

## Arquitetura

```
backend/src/
├─ modules/
│  ├─ alunos/       domain · application · infra · http · index.js
│  ├─ financeiro/   domain · application · infra · http · index.js
│  └─ assistente/   domain · application · infra · http · index.js
├─ shared/          erros, validação, dinheiro, data, texto
└─ platform/        config, servidor, composição, tratador de erros
```

Regras verificadas pelo ESLint, não por convenção:

- `domain/` não importa Fastify, mysql2, SDK, `infra/`, `http/` nem `platform/`
- Um módulo só enxerga outro pelo `index.js` dele
- `platform/` também não alcança entranhas de módulo

Detalhamento em [docs/02](docs/02-arquitetura.md). Contrato da API em
[docs/04](docs/04-contrato-api.md).

---

## Testes

233 testes, `node:test` nativo — sem Jest, Vitest ou qualquer runner externo.

| Camada | Cobertura |
|---|---|
| `financeiro/domain` (item 4) | **100%** de linhas, ramos e funções |
| Backend inteiro | 99,3% linhas · 97,3% ramos |
| Rotas HTTP | 29 testes pelo ciclo requisição→resposta via `app.inject()` |
| Front | Cliente de API e formatação (o que é testável sem DOM) |

A saída de `npm test` foi escrita para ler como especificação:

```
caso 7: pagamento parcial de parcela vencida mantém o aluno inadimplente
caso 8: às 23h30 de Brasília a parcela que vence hoje ainda não venceu
porAlunos inclui entrada vazia para aluno sem parcelas
afirmação factual sem nenhuma ferramenta usada é recusada
o aluno não carrega situação financeira
```

Os testes de aplicação usam o **repositório em memória, não mocks**. O
adaptador é código real com o mesmo contrato: um teste contra ele verifica o
caso de uso; um teste contra mock verifica que o mock foi configurado.

---

## Uso de IA no desenvolvimento

O enunciado pede essa explicação. O projeto foi desenvolvido com **Claude Code**
(Opus 5), em sessão conversacional, com os commits marcados por
`Co-Authored-By`.

### Onde a IA foi usada

- **Especificações** (`docs/`) — escritas antes de qualquer código, por conversa.
- **Código** — a maior parte, em ciclos de TDD: teste primeiro, vermelho
  verificado, implementação, verde.
- **Componentes de UI** — via registry do shadcn, não escritos de cabeça.
- **Consulta à documentação da API da Anthropic** — model IDs, classes de erro
  tipadas e comportamento de `stop_reason` foram **consultados**, não lembrados.
  Isso evitou pelo menos um erro sério: desligar o raciocínio no Opus 5 tem um
  modo de falha em carga de *tool use* em que o modelo escreve a chamada de
  ferramenta como texto visível e ela nunca executa, sem erro nenhum.

### Onde a verificação foi minha

Toda saída passou pela suíte, pelo lint e por leitura. Três defeitos foram
encontrados **rodando a aplicação**, não pelos testes:

1. *"Qual a capital da Austrália e **quantos** habitantes tem?"* respondia
   *"Encontrei 12 alunos"* — a palavra de intenção casava fora do domínio. A
   resposta era verdadeira e completamente sem sentido.
2. *"dados da Mariana Rezende"* caía no fallback: o assistente só reconhecia
   aluno por matrícula.
3. A interface subiu **sem cores** — `shadcn add` não gera as variáveis de tema,
   isso é trabalho do `init`.

Nos três casos o teste que eu tinha escrito era fraco demais para pegar.
Cada um virou teste antes da correção.

### O que foi descartado

- **Servidor MCP como entrega principal.** A intuição inicial era usar MCP. É o
  protocolo inverso do que o enunciado pede — ver [ADR 0004](docs/adr/0004-tool-use-em-vez-de-mcp.md).
- **Parâmetro `fallbacks` do Opus 5.** Recomendado pela documentação, descartado
  com razões registradas em [docs/05 §6](docs/05-assistente-ia.md): exige
  endpoint beta e não teria como ser exercitado sem chave.
- **Um par de commits vermelho-verde por caso de teste.** Daria 22 commits para
  uma função de 20 linhas. Agrupado por comportamento, com o desvio
  [registrado](docs/06-regra-situacao-financeira.md).

---

## O que ficou de fora, e por quê

| Fora de escopo | Razão |
|---|---|
| Autenticação | O enunciado não pede |
| Escrita de dados | Os quatro endpoints pedidos são de leitura |
| Docker + MySQL | Diferencial, não requisito. Especificado em [docs/03](docs/03-dominio-e-dados.md) e [docs/07](docs/07-ambiente-dev.md), não implementado. A porta de repositório existe e aceitaria o adaptador |
| Servidor MCP | Bônus. Desenho em [docs/05 §8](docs/05-assistente-ia.md) |
| Testes de componente React | O enunciado pede teste da regra financeira; UI ficou em verificação manual |
| Deploy | O enunciado dispensa |

---

## Processo

Gitflow (`main` · `develop` · `feature/*` · `release/*`) e Conventional Commits,
**verificados por hook** — commitlint no `commit-msg`, lint-staged no
`pre-commit`, suíte completa no `pre-push`. O commitlint já rejeitou commit meu
por escopo fora do enum.

Documentado em [docs/08](docs/08-processo-e-qualidade.md).
