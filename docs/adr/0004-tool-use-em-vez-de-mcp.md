# ADR 0004 — Tool use para o assistente; MCP como bônus posterior

**Status:** aceito · **Data:** 2026-10-26

## Contexto

O enunciado pede `POST /api/assistente` — um endpoint que recebe uma pergunta e
devolve uma resposta apoiada por LLM — com dois requisitos de qualidade
explícitos: *"enviar ao modelo somente os dados necessários"* e *"evitar que o
modelo invente informações não existentes nos dados"*.

A intuição inicial foi usar MCP (Model Context Protocol) como mecanismo. Vale
registrar por que o caminho é outro, porque a confusão é comum e a distinção é
o ponto arquitetural central do item 3.

## Decisão

**Tool use** (chamada de função) no laço de orquestração do back-end. MCP fica
como entregável **opcional**, depois do núcleo.

## O porquê: a direção do protocolo

Os dois mecanismos movem informação entre um LLM e os seus dados, em sentidos
opostos:

| | Quem inicia | Quem expõe | Transporte |
|---|---|---|---|
| **Tool use** | Nosso back-end chama a API do modelo | Nós descrevemos ferramentas no corpo da requisição | A requisição HTTP que já estamos fazendo |
| **MCP** | Um cliente LLM externo (ex.: Claude Desktop) conecta no nosso servidor | Nós rodamos um servidor MCP | stdio ou HTTP, processo separado |

O enunciado descreve um fluxo em que **o usuário fala com a nossa interface** e
nunca com um cliente LLM. Não há cliente MCP no desenho. Um servidor MCP não
teria quem o consumisse — e, principalmente, não faria o endpoint
`POST /api/assistente` funcionar, porque ele resolve o problema inverso.

Tool use é o mecanismo que satisfaz os dois requisitos de qualidade: o modelo
recebe a *descrição* das ferramentas sem nenhum dado, pede as consultas que
precisa, e só o resultado dessas consultas entra no contexto. Minimização de
dados e grounding são consequências do desenho, não promessas do prompt.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Servidor MCP como entrega principal | Resolve o problema inverso. Não atende `POST /api/assistente` |
| Dump dos dados no prompt | Viola *"somente os dados necessários"* por definição, e deixa o modelo livre para interpolar entre registros — viola o requisito de não inventar |
| RAG com embeddings | Recuperação aproximada sobre um conjunto pequeno e perfeitamente estruturado. Consulta estruturada é exata, mais barata e auditável; busca vetorial aqui seria pior em todos os eixos |

## MCP como bônus

Com os casos de uso isolados (ADR 0001), um servidor MCP vira um adaptador fino
sobre `application/` — mesmas ferramentas, transporte diferente, nenhuma lógica
nova. É um bom demonstrativo da tese do monolito modular: duas portas de
entrada, um núcleo.

Só começa depois de os itens 1 a 5 do enunciado estarem fechados. Se não for
entregue, o README descreve o desenho e por que o adaptador seria barato.

## Consequências

**Positivas** — atende o requisito como está escrito; grounding por construção;
trilha de auditoria (`ferramentasUsadas`, `fontes`); o mesmo laço serve o
provider real e o de demonstração (ADR 0005).

**Negativas** — múltiplas idas e voltas ao modelo por pergunta (latência e
custo maiores que uma chamada única), mitigado por `effort: low` e teto de
iterações; exige entender o protocolo de tool use da API.
