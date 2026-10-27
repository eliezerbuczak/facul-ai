# ADR 0002 — Fastify no back-end, React + Vite no front, JavaScript com JSDoc

**Status:** aceito · **Data:** 2026-10-26 · **Parcialmente superseded por:** [ADR 0007](0007-shadcn-ui.md)

## Contexto

O enunciado especifica Node.js e sugere React. Foram consideradas três opções
de camada HTTP — `node:http` puro, Express e Fastify — e a adoção ou não de
TypeScript.

## Decisão

**Fastify** no back-end, **React + Vite** no front, **JavaScript com JSDoc e
`checkJs`** nos dois.

## Alternativas descartadas

### Camada HTTP

| Alternativa | Por que não |
|---|---|
| `node:http` puro | Viável: ~150 linhas de roteador, parser de corpo, CORS e tratador de erro, e zero dependência de runtime. Descartado porque a validação por schema teria que ser escrita à mão também, e RNF-01 é requisito explícito. Reinventar validação não é o que está sendo avaliado |
| Express | Funciona e é universalmente reconhecido, mas a validação fica por conta de uma biblioteca extra e o tratamento de erro assíncrono exige cuidado manual |

**Fastify** resolve validação por JSON Schema nativamente — o mesmo schema
valida a requisição e serializa a resposta. RNF-01 e RNF-02 caem quase de graça,
e os schemas viram documentação executável do contrato do doc 04.

### TypeScript

Descartado. O custo é uma etapa de build no back-end, que elimina o
`node --watch` e o `node --test` diretos sobre o fonte — justamente as
ferramentas nativas do Node 22 que mantêm o projeto sem dependências de
desenvolvimento. JSDoc com `// @ts-check` e `checkJs` dá verificação de tipos no
editor e no CI, sobre o mesmo código que roda. Num projeto deste tamanho a troca
compensa; num sistema grande provavelmente não.

## Consequências

**Positivas** — validação declarativa; serialização rápida; convenção
reconhecível; sem passo de build no back-end; Vite dá HMR e build de produção
sem configuração.

**Negativas** — uma dependência de runtime a mais que `node:http`; JSDoc é mais
verboso que anotação TypeScript para tipos complexos; Fastify é menos
onipresente que Express, ainda que amplamente adotado.
