# 04 — Contrato da API

Base: `http://localhost:3000`. Todas as respostas são `application/json;
charset=utf-8`. Toda entrada é validada por JSON Schema antes de chegar ao caso
de uso (RNF-01).

## 1. Envelope de erro

Uma forma única para **todo** erro da API, incluindo os `500`:

```jsonc
{
  "erro": {
    "codigo": "ALUNO_NAO_ENCONTRADO",
    "mensagem": "Aluno não encontrado.",
    "detalhes": [                              // presente só em 400
      { "campo": "limite", "mensagem": "deve ser no máximo 100" }
    ]
  }
}
```

`codigo` é um identificador estável, em `SCREAMING_SNAKE_CASE`, feito para o
cliente ramificar em cima. `mensagem` é texto para humano e **pode mudar** —
nenhum cliente deve depender dela.

### Catálogo de códigos

| HTTP | `codigo` | Quando |
|---|---|---|
| 400 | `REQUISICAO_INVALIDA` | Falha de validação de schema |
| 404 | `ALUNO_NAO_ENCONTRADO` | `:id` não existe |
| 404 | `ROTA_NAO_ENCONTRADA` | Rota inexistente |
| 405 | `METODO_NAO_PERMITIDO` | Rota existe, verbo não |
| 429 | `LIMITE_DE_REQUISICOES` | Rate limit do assistente estourado |
| 500 | `ERRO_INTERNO` | Qualquer exceção não prevista |
| 502 | `IA_RESPOSTA_INVALIDA` | O provedor respondeu, mas de forma inutilizável |
| 503 | `IA_INDISPONIVEL` | Provedor fora do ar, sem rede, ou 5xx do provedor |
| 504 | `IA_TIMEOUT` | Provedor excedeu o tempo limite |

Erros `5xx` **nunca** vazam stack trace, mensagem do driver de banco ou texto de
exceção do SDK no corpo da resposta. O detalhe vai para o log do servidor, com um
`requestId` que também aparece no header `x-request-id` da resposta — é assim que
se correlaciona um erro reportado pelo usuário com a linha de log.

## 2. `GET /api/health`

Sem parâmetros. Sempre `200` enquanto o processo estiver de pé.

```jsonc
{
  "status": "ok",
  "persistencia": "memoria",          // "memoria" | "mysql"
  "assistente": { "modo": "demo" }    // "anthropic" | "demo"
}
```

Existe para o avaliador confirmar, em uma requisição, em que modo a aplicação
está rodando — a pergunta mais provável ao abrir o projeto pela primeira vez.

## 3. `GET /api/alunos`

Lista alunos com busca e paginação. **RF-01, RF-02.**

### Query

| Param | Tipo | Padrão | Regra |
|---|---|---|---|
| `busca` | string | — | 1–120 caracteres. Casa com **nome ou matrícula**, parcial, sem diferenciar maiúsculas nem acentos |
| `status` | enum | — | `ATIVO` · `TRANCADO` · `CANCELADO` · `FORMADO` |
| `pagina` | integer | `1` | ≥ 1 |
| `limite` | integer | `20` | 1–100 |

Parâmetro desconhecido na query é **ignorado**, não é erro — evita quebrar o
cliente por causa de um `?utm_source=` qualquer.

### 200

```jsonc
{
  "dados": [ /* Aluno[], formato no doc 03 §5 */ ],
  "paginacao": { "pagina": 1, "limite": 20, "total": 12, "totalPaginas": 1 }
}
```

Lista vazia é `200` com `"dados": []`, nunca `404`. Ausência de resultado de
busca não é erro.

### Erros

`400 REQUISICAO_INVALIDA` — `limite=0`, `limite=500`, `pagina=-1`, `status=XPTO`,
`busca=""`.

## 4. `GET /api/alunos/:id`

**RF-03.**

`:id` deve ser um UUID v4; se não for, `400` (e não `404` — a requisição está
malformada, não é um recurso ausente).

### 200

Um objeto `Aluno` (doc 03 §5).

### Erros

- `400 REQUISICAO_INVALIDA` — `:id` não é UUID
- `404 ALUNO_NAO_ENCONTRADO` — UUID válido, aluno inexistente

## 5. `GET /api/alunos/:id/financeiro`

**RF-04, RF-05.** O endpoint onde vive a regra do item 4.

### 200

```jsonc
{
  "alunoId": "3f2a…",
  "situacao": "INADIMPLENTE",
  "referencia": "2026-10-26",              // a data usada no cálculo
  "resumo": {
    "totalParcelas": 10,
    "parcelasPagas": 7,
    "parcelasVencidas": 1,
    "parcelasAVencer": 2,
    "totalEmAbertoCentavos": 375000,       // soma de vencidas + a vencer
    "totalVencidoCentavos": 125000         // só o que já venceu e não quitou
  },
  "parcelas": [ /* Parcela[] com situacao derivada, doc 03 §5 */ ]
}
```

Três pontos de projeto, todos motivados pelo item 4:

1. **`referencia` é explícito na resposta.** A situação é função de uma data.
   Devolver a data torna o resultado auditável: dá para conferir o veredito à
   mão. Sem isso, "por que esse aluno está inadimplente?" vira debugging.
2. **`parcelas` vem junto, com a situação de cada uma.** O front exibe a
   evidência ao lado do veredito (RF-13). Uma interface que mostra só
   "INADIMPLENTE" é exatamente a que esconde o bug do enunciado.
3. **`totalVencidoCentavos` ≠ `totalEmAbertoCentavos`.** Confundir os dois é uma
   das causas-raiz plausíveis do bug (doc 06 §2).

### Erros

- `400 REQUISICAO_INVALIDA` — `:id` não é UUID
- `404 ALUNO_NAO_ENCONTRADO`

Aluno sem nenhuma parcela é `200`, `situacao: "ADIMPLENTE"`, `parcelas: []`.

## 6. `POST /api/assistente`

**RF-06, RF-07, RF-08.** Detalhes de implementação no [doc 05](05-assistente-ia.md).

### Request

```jsonc
{
  "pergunta": "Quais alunos estão inadimplentes?",
  "alunoId": "3f2a…"                       // opcional: aluno em foco na tela
}
```

| Campo | Tipo | Regra |
|---|---|---|
| `pergunta` | string | **obrigatório**, 3–500 caracteres após `trim` |
| `alunoId` | string \| null | opcional, UUID v4 |

`alunoId` existe para a pergunta *"Resuma a situação financeira do aluno
selecionado"* do enunciado funcionar. Ele entra no contexto como "o aluno em
foco é X" — o modelo ainda precisa chamar as ferramentas para obter os dados
dele. O id sozinho não é dado; é um ponteiro.

Corpo com campo desconhecido é **rejeitado** com `400`
(`additionalProperties: false`). Diferente da query de listagem, aqui não há
custo de compatibilidade e a rigidez pega erro de integração cedo.

### 200

```jsonc
{
  "resposta": "Dois alunos estão inadimplentes: Helena Marques (matrícula 2024000137, R$ 1.250,00 vencidos desde 16/09/2026) e Rafael Pinto (matrícula 2023000094, R$ 2.500,00 vencidos desde 10/08/2026).",
  "modo": "anthropic",                     // "anthropic" | "demo"
  "ferramentasUsadas": ["listar_alunos"],
  "fontes": [
    { "tipo": "aluno", "id": "3f2a…" },
    { "tipo": "aluno", "id": "7b41…" }
  ]
}
```

| Campo | Para quê |
|---|---|
| `modo` | Atende *"Identifique claramente o que está implementado e o que está apenas demonstrado"* do enunciado, em tempo de execução e não só no README. O front exibe um selo (RF-17) |
| `ferramentasUsadas` | Trilha de auditoria. Resposta sem ferramenta é resposta sem dado — e é rejeitada antes de sair (doc 05 §5) |
| `fontes` | Permite ao front linkar a resposta aos registros citados, e ao avaliador conferir |

### Erros

| HTTP | `codigo` | Causa |
|---|---|---|
| 400 | `REQUISICAO_INVALIDA` | Pergunta vazia, curta demais, longa demais, ou `alunoId` mal formado |
| 404 | `ALUNO_NAO_ENCONTRADO` | `alunoId` informado não existe |
| 429 | `LIMITE_DE_REQUISICOES` | Rate limit estourado — envia header `Retry-After` |
| 502 | `IA_RESPOSTA_INVALIDA` | O modelo respondeu, mas a resposta não passou na verificação de *grounding* |
| 503 | `IA_INDISPONIVEL` | Provedor inacessível, autenticação inválida, ou 5xx do provedor |
| 504 | `IA_TIMEOUT` | Estourou o tempo limite configurado |

**O front sempre recebe JSON com o envelope padrão, inclusive nesses casos.** O
requisito "tratar erros e indisponibilidade do serviço de IA" se cumpre no
contrato, não só no `try/catch`: `503` e `504` são estados previstos e
documentados, com mensagem apresentável ao usuário.

### Rate limiting

`POST /api/assistente` é o único endpoint com limite: **10 requisições por
minuto por IP**, via `@fastify/rate-limit`. Não é segurança — é contenção de
custo, já que cada chamada pode disparar várias requisições ao provedor de LLM.
Os endpoints de leitura não têm limite.

## 7. Comportamentos transversais

| Aspecto | Decisão |
|---|---|
| CORS | Liberado só para a origem do Vite (`http://localhost:5173`), configurável por env |
| `x-request-id` | Gerado por requisição, ecoado no header, presente em toda linha de log |
| Compressão | Não. O payload é pequeno e isso só adicionaria ruído |
| Versionamento | Não. Prefixo `/api` sem `/v1` — versionar uma API de teste seria cerimônia sem consumidor |
| 404 vs 405 | Rota inexistente é `404`; rota existente com verbo errado é `405` com header `Allow` |
| Timezone | Toda data de resposta em `America/Sao_Paulo`, formato `YYYY-MM-DD` |
