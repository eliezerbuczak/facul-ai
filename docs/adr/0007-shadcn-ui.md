# ADR 0007 — Adotar shadcn/ui no front-end

**Status:** aceito · **Data:** 2026-10-26 · **Supersede parcialmente:** [ADR 0002](0002-fastify-e-vite.md)

## Contexto

O [ADR 0002](0002-fastify-e-vite.md) e o doc 02 §6 descartaram biblioteca de UI
com o argumento de que o enunciado dispensa layout sofisticado. A primeira
versão da tela foi construída assim, com `<dialog>` nativo e CSS próprio.

A decisão foi revista. O argumento "o enunciado dispensa" mostra por que uma
biblioteca não é **obrigatória**, não por que ela seria **prejudicial** — e o
custo real se mostrou menor que o estimado.

## Decisão

**shadcn/ui** com Tailwind CSS v4, nos componentes `sheet`, `button`, `input`,
`badge`, `card`, `skeleton`, `select`, `textarea`, `scroll-area`, `alert` e
`separator`.

## Por que a revisão

| Fator | Avaliação |
|---|---|
| Não é dependência de runtime | O shadcn copia o código-fonte para dentro do projeto. Não há versão para travar nem biblioteca para migrar depois |
| Acessibilidade correta de graça | O `sheet` traz foco preso, `Esc`, `aria-modal` e restauração de foco vindos do Radix. Reimplementar isso à mão é onde se erra |
| Estados de carregamento e erro são requisito | RF-15 e RF-16 pedem `skeleton` e `alert`, que são exatamente dois dos componentes |
| Familiaridade de mercado | Tailwind + shadcn é combinação corrente em vagas React no Brasil; demonstrá-la não custa nada aqui |

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| `<dialog>` nativo e CSS próprio *(decisão anterior)* | Funciona, e foi o que existiu primeiro. Perde a acessibilidade correta do Radix e os componentes de estado que os requisitos pedem |
| Biblioteca com runtime (MUI, Chakra) | Dependência de verdade, tema opinativo, bundle maior. O argumento do ADR 0002 continua valendo **para estas** |

## Consequências

**Positivas** — acessibilidade do sheet correta sem esforço; componentes de
carregamento e erro prontos, atendendo RF-15 e RF-16; o código dos componentes
está no repositório e é auditável.

**Negativas** — mais dependências de desenvolvimento (Tailwind, Radix, cva,
lucide); o bundle vai a ~398 kB (127 kB comprimido), aceitável para uso local
mas longe de mínimo; o diretório `components/ui/` é código de terceiro no
repositório, e por isso fica **fora do ESLint** — lintar código vendorizado
produz ruído que ninguém vai agir, e reformatá-lo quebraria o diff contra o
upstream na hora de atualizar um componente.

**Armadilha encontrada:** `shadcn add` **não** gera as variáveis de tema CSS —
isso é trabalho do `shadcn init`. Sem elas, `bg-card`, `bg-popover` e
`bg-background` resolvem para transparente, e o sheet e o dropdown vazam o
conteúdo de trás. O tema está escrito à mão em `frontend/src/estilos.css`.
