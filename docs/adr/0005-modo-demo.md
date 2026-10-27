# ADR 0005 — Modo demonstrativo compartilha o pipeline real

**Status:** aceito · **Data:** 2026-10-26

## Contexto

Não temos chave da API da Anthropic. O enunciado prevê isso:

> *Caso não possua uma chave de API, poderá implementar um modo demonstrativo
> com respostas locais e documentar como seria realizada a integração real.
> Identifique claramente o que está implementado e o que está apenas demonstrado.*

A leitura preguiçosa dessa frase produz um `if (demo) return respostaFixa()` ao
lado de um caminho real nunca executado. Isso tecnicamente cumpre o enunciado e
não demonstra nada: o código que importa fica sem exercício algum, e a fronteira
entre implementado e demonstrado passa por todo o arquivo.

## Decisão

Uma porta `LlmProvider` com um método, `decidir(contexto) -> Decisao`. Dois
adaptadores:

- `anthropic.provider.js` — chama a API real
- `demo.provider.js` — classifica a pergunta por intenção e escolhe a ferramenta

**O laço de tool use, o despacho de ferramentas, os casos de uso, os
repositórios e a verificação de grounding são os mesmos nos dois modos.** O que
é simulado é exclusivamente *a decisão de qual ferramenta chamar* — a parte que
o LLM faria.

Seleção automática: com `ANTHROPIC_API_KEY` presente, modo real; sem ela, demo.
A aplicação sobe normalmente nos dois casos e declara o modo em
`GET /api/health` e em cada resposta do assistente.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Respostas fixas por pergunta | Não exercita nada: nem ferramentas, nem repositórios, nem grounding. Quebra com qualquer pergunta fora da lista |
| Exigir chave para subir | Torna o projeto não-avaliável por quem não tem chave. Trabalha contra o critério de entrega |
| Um LLM local (Ollama) | Adiciona download de gigabytes e requisito de hardware ao avaliador. Desproporcional |
| Só o código real, sem demo | Deixa o item 3 sem nenhuma demonstração funcional |

## Consequências

**Positivas** — o modo demo percorre ~90% do caminho de produção, então os
testes cobrem o pipeline real sem rede e sem chave; a fronteira entre
implementado e demonstrado é **um arquivo**, o que torna a resposta ao enunciado
precisa em vez de aproximada; trocar demo por real é uma variável de ambiente,
sem mudança de código.

**Negativas** — o roteador por intenção é código a mais para escrever e manter;
a qualidade das respostas em modo demo é visivelmente inferior à do modo real,
e o README precisa ser explícito quanto a isso para não gerar expectativa errada.
