# 01 — Requisitos

Requisitos extraídos do enunciado, numerados para rastreabilidade. A coluna
**Origem** aponta para o item do enunciado que motivou o requisito; requisitos
sem origem são decisões nossas, marcadas como *extra*.

## 1. Requisitos funcionais

### Back-end

| ID | Requisito | Origem |
|---|---|---|
| RF-01 | `GET /api/alunos` lista alunos, com paginação | 1 |
| RF-02 | `GET /api/alunos?busca=` filtra por nome **ou** matrícula, case-insensitive e sem acentuação | 2 (busca) |
| RF-03 | `GET /api/alunos/:id` retorna um aluno; 404 se não existir | 1 |
| RF-04 | `GET /api/alunos/:id/financeiro` retorna as parcelas e a situação derivada | 1 |
| RF-05 | A situação financeira é **calculada** a partir das parcelas e da data de referência, nunca lida de um campo persistido | 4 |
| RF-06 | `POST /api/assistente` recebe uma pergunta e devolve uma resposta apoiada por LLM | 1, 3 |
| RF-07 | O assistente acessa os dados exclusivamente por meio de ferramentas (*tool use*), nunca por um dump do banco no prompt | 3 |
| RF-08 | Sem `ANTHROPIC_API_KEY` configurada, a aplicação sobe em **modo demonstrativo** e sinaliza isso na resposta | 3 |
| RF-09 | `GET /api/health` reporta o estado da aplicação e o modo do assistente | *extra* |

### Front-end

| ID | Requisito | Origem |
|---|---|---|
| RF-10 | Listagem de alunos | 2 |
| RF-11 | Campo de busca por nome ou matrícula | 2 |
| RF-12 | Visualização dos detalhes do aluno selecionado | 2 |
| RF-13 | Exibição da situação financeira, com as parcelas que a justificam | 2 |
| RF-14 | Campo para enviar pergunta ao assistente e exibir a resposta | 2 |
| RF-15 | Estado de carregamento visível em toda requisição | 2 |
| RF-16 | Erros de rede e de API exibidos ao usuário, com possibilidade de nova tentativa | 2 |
| RF-17 | A interface identifica quando a resposta veio do modo demonstrativo | 3 |

## 2. Requisitos não-funcionais

| ID | Requisito | Origem |
|---|---|---|
| RNF-01 | Toda entrada da API é validada por schema; entrada inválida resulta em `400` com detalhe do campo | 1 |
| RNF-02 | Erros seguem um envelope único e um código HTTP semanticamente correto | 1 |
| RNF-03 | Nenhuma chave de API aparece no bundle do front-end, no repositório ou em log | 3 |
| RNF-04 | O modelo recebe apenas o recorte de dados retornado pelas ferramentas que ele chamou | 3 |
| RNF-05 | O modelo não deve afirmar nada que não esteja nos resultados das ferramentas | 3 |
| RNF-06 | Falha, timeout ou indisponibilidade do provedor de IA não derruba a API; vira resposta de erro tratada | 3 |
| RNF-07 | `npm install && npm run dev` deve subir a aplicação **sem Docker** | 5 (roda local) |
| RNF-08 | `docker compose up` sobe a mesma aplicação com MySQL | *extra* |
| RNF-09 | A regra de situação financeira tem cobertura de testes automatizados | 4 |
| RNF-10 | Desenvolvimento guiado por testes, com testes unitários curtos | *extra* |
| RNF-11 | Lint e formatação automatizados, verificáveis por um comando | *extra* |
| RNF-12 | Histórico em Conventional Commits, branches em Gitflow | *extra* |
| RNF-13 | README explica execução local, decisões técnicas, a análise do item 4 e o uso de IA no desenvolvimento | 5 |
| RNF-14 | `.env.example` versionado; `.env` ignorado pelo Git | 5 |

## 3. Fora de escopo

Declarado explicitamente para evitar escopo mal-entendido na avaliação:

- **Autenticação e autorização.** O enunciado não pede; não implementamos.
- **Escrita de dados.** Os endpoints pedidos são todos de leitura. Não há
  `POST`/`PUT`/`DELETE` de alunos ou parcelas. O que se chama de "CRUD" aqui é,
  no recorte do enunciado, um **R**.
- **Deploy em cloud.** O enunciado dispensa.
- **Layout sofisticado.** O enunciado dispensa e avisa que não pontua.

## 4. Critérios de aceite por item do enunciado

| Item do enunciado | Como verificamos |
|---|---|
| 1 — Back-end | Os 4 endpoints respondem; teste de validação devolve `400`; `:id` inexistente devolve `404` |
| 2 — Front-end | Fluxo completo: listar → buscar → abrir detalhe → ver financeiro → perguntar ao assistente |
| 3 — IA | Pergunta sobre inadimplentes retorna nomes que batem com o `GET /financeiro` de cada um; `grep -r "sk-ant"` no repositório não retorna nada |
| 4 — Sustentação | Suíte de testes da regra passa, incluindo os casos de borda do doc 06; README tem causa-raiz, correção, validação e prevenção |
| 5 — Entrega | README executável por alguém que nunca viu o projeto; `.env.example` presente; histórico de commits legível |
