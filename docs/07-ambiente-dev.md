# 07 — Ambiente de desenvolvimento

Dois caminhos de execução, ambos suportados e documentados. O primeiro existe
porque o enunciado diz *"a aplicação deve funcionar localmente seguindo as
instruções do README"* e a forma mais confiável de cumprir isso é não exigir
Docker. O segundo existe porque MySQL em contêiner é um diferencial — mas um
diferencial que não pode ser pré-requisito.

| Caminho | Comando | Persistência | Requer |
|---|---|---|---|
| **A — local** *(padrão)* | `npm run dev` | memória, a partir do seed JSON | Node ≥ 22 |
| ~~**B — Docker**~~ | `docker compose up` | MySQL 8.4 | **não implementado** — ver §3 |

Os dois servem exatamente os mesmos dados (doc 03 §4) e passam a mesma suíte.

## 1. Pré-requisitos

| Ferramenta | Versão | Por quê |
|---|---|---|
| Node.js | ≥ 22.0 | `node --test`, `node --watch` e `--env-file` nativos — sem nodemon, sem dotenv, sem jest |
| npm | ≥ 10 | acompanha o Node 22 |
| Docker + Compose | ≥ 24 / v2 | **só** para o caminho B |

Node 22 é requisito real, não preferência: o projeto usa o runner de testes, o
watch mode e o carregamento de `.env` embutidos no runtime. Em Node 20 o runner
de testes existe mas `--env-file` não.

## 2. Caminho A — local, sem Docker

```bash
git clone <repo> && cd facul-ai

npm install                       # ferramental: lint, formatação, hooks de commit
npm install --prefix backend
npm run dev --prefix backend      # http://localhost:3000

# Front-end (outro terminal)
npm install --prefix frontend
npm run dev --prefix frontend     # http://localhost:5173
```

Copiar o `.env` é **opcional** — todo valor tem padrão sensato e o back-end usa
`--env-file-if-exists`. Para customizar: `cp .env.example .env` na raiz. Existe
**um único** `.env`, na raiz: o back-end lê `../.env` e o docker compose lê o
mesmo arquivo, sem duplicação.

Sem `ANTHROPIC_API_KEY` no `.env`, o assistente sobe em **modo demonstrativo** e
anuncia isso em `GET /api/health` e em cada resposta. Nada falha (RF-08).

## 3. Caminho B — Docker com MySQL

> **Não implementado.** Não existe `docker-compose.yml` no repositório. O
> que segue é o desenho previsto. O caminho A é o único que roda hoje, e é o
> que o README documenta.


```bash
cp .env.example .env
docker compose up --build
# API   → http://localhost:3000
# Front → http://localhost:5173
# MySQL → localhost:3306
```

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-gestao_academica}
      MYSQL_USER: ${MYSQL_USER:-app}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-app}
    ports: ['3306:3306']
    volumes:
      - mysql-data:/var/lib/mysql
      - ./backend/migrations:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost', '-p${MYSQL_ROOT_PASSWORD:-root}']
      interval: 5s
      timeout: 5s
      retries: 20
      start_period: 30s

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    command: npm run dev
    environment:
      PERSISTENCIA: mysql
      MYSQL_HOST: mysql
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
    env_file: [.env]
    ports: ['3000:3000']
    volumes:
      - ./backend:/app
      - /app/node_modules          # anônimo: não deixa o bind mount apagar os módulos do contêiner
    depends_on:
      mysql: { condition: service_healthy }

  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    command: npm run dev -- --host 0.0.0.0
    environment:
      VITE_API_URL: http://localhost:3000
    ports: ['5173:5173']
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on: [api]

volumes:
  mysql-data:
```

Quatro escolhas que valem explicação:

- **`depends_on: condition: service_healthy`.** `depends_on` simples só espera o
  contêiner iniciar, não o MySQL aceitar conexões. Sem o healthcheck a API sobe
  antes do banco e morre no primeiro `connect`. É o erro número um de
  `docker compose` com banco.
- **Volume anônimo em `/app/node_modules`.** O bind mount de `./backend` cobriria
  `node_modules` com a versão do host — que pode ter binários compilados para
  outra plataforma. O volume anônimo preserva o que foi instalado no build.
- **`migrations/` em `/docker-entrypoint-initdb.d`.** O MySQL executa `.sql` dali
  na primeira inicialização do volume. Schema aplicado sem passo manual.
- **`VITE_API_URL` aponta para `localhost`, não `api`.** Esse valor é consumido
  pelo **navegador**, que roda fora da rede do Compose. `http://api:3000` só
  resolve entre contêineres.

`Dockerfile.dev` é deliberadamente de desenvolvimento — `npm ci` e nada de
multi-stage. Não há deploy no escopo (item 5 do enunciado); um Dockerfile de
produção aqui seria cerimônia sem destino.

## 4. Variáveis de ambiente

`.env.example` versionado; `.env` no `.gitignore` (RNF-14).

```bash
# ---------- Aplicação ----------
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173

# ---------- Persistência ----------
# memoria = lê backend/seed/dados.json, não precisa de banco (padrão)
# mysql   = usa o MySQL configurado abaixo
PERSISTENCIA=memoria

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=gestao_academica
MYSQL_USER=app
MYSQL_PASSWORD=app
MYSQL_ROOT_PASSWORD=root

# ---------- Assistente de IA ----------
# Vazio  = modo demonstrativo com respostas locais (aplicação sobe normalmente)
# Com chave = integração real com a API da Anthropic
# NUNCA comite um valor real aqui.
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-opus-5
ANTHROPIC_TIMEOUT_MS=20000
ANTHROPIC_EFFORT=low
```

`platform/config.js` valida esse objeto na inicialização e **falha rápido** com
mensagem legível se algo obrigatório faltar ou tiver tipo errado. Nenhum módulo
lê `process.env` diretamente — só `config.js`. Isso mantém um ponto único de
verdade sobre a configuração e torna possível injetar config nos testes.

> `ANTHROPIC_API_KEY` vazia é um estado **válido e esperado**, não um erro de
> configuração. É o padrão do `.env.example` justamente porque o avaliador pode
> não ter chave.

Nada de `VITE_ANTHROPIC_*`. Qualquer variável com prefixo `VITE_` é embutida no
JavaScript servido ao navegador — colocar uma chave ali a publica (RNF-03).

## 5. Scripts

Lint, formatação e hooks ficam na **raiz**, não em `backend/`. Dois motivos
concretos, ambos descobertos ao implementar: o husky precisa morar na raiz do
repositório git, e o ESLint 9 resolve `eslint.config.js` a partir do diretório
de trabalho — com a config dentro de `backend/`, o `lint-staged` rodando da raiz
não a encontraria. Uma config na raiz, com escopo por `files:`, resolve os dois.

### Raiz — `package.json`

| Script | Comando | Para quê |
|---|---|---|
| `lint` | `eslint .` | Inclui as regras de fronteira entre módulos |
| `lint:fix` | `eslint . --fix` | Correção automática |
| `format` | `prettier --write .` | Formatação de código (markdown fica de fora) |
| `format:check` | `prettier --check .` | Verificação sem escrita, usada no CI |
| `test` | `npm test --prefix backend` | Delega para o back-end |
| `check` | lint + format:check + test + check:secrets | Portão único, usado no pre-push |
| `check:secrets` | `bash scripts/verificar-segredos.sh` | Falha se achar chave versionada |
| `prepare` | `husky` | Instala os hooks após `npm install` |

### `backend/package.json`

| Script | Comando | Para quê |
|---|---|---|
| `dev` | `node --watch --env-file-if-exists=../.env src/main.js` | Servidor com reload nativo |
| `start` | `node --env-file-if-exists=../.env src/main.js` | Execução sem watch |
| `test` | `node --test` | Suíte completa |
| `test:watch` | `node --test --watch` | Loop de TDD |
| `test:cov` | `node --test --experimental-test-coverage` | Relatório de cobertura |
| `db:migrate` | `node scripts/migrar.js` | Aplica `migrations/*.sql` |
| `db:seed` | `node scripts/semear.js` | Carrega `seed/dados.json` no MySQL |

> `--env-file-if-exists` em vez de `--env-file`: sem ele, um clone sem `.env`
> falha na inicialização. Com ele, `npm install && npm run dev` funciona direto
> no clone limpo, que é o requisito RNF-07.

### `frontend/package.json`

| Script | Comando |
|---|---|
| `dev` | `vite` |
| `build` | `vite build` |
| `preview` | `vite preview` |

Sem `nodemon`, `dotenv`, `jest`, `vitest` ou `ts-node`. Node 22 cobre watch,
`.env` e testes. Menos dependência é menos superfície para quebrar entre a
máquina do candidato e a do avaliador.

## 6. Proxy de desenvolvimento

`vite.config.js` encaminha `/api` para o back-end, o que elimina CORS no
desenvolvimento e faz o front usar caminhos relativos:

```js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.VITE_API_URL ?? 'http://localhost:3000', changeOrigin: true } },
  },
});
```

O back-end **também** habilita CORS para a origem do Vite, configurável por
`CORS_ORIGIN`. Redundante com o proxy no fluxo normal, mas cobre quem abre o
front por outra porta ou chama a API direto do navegador para inspecionar.

## 7. Verificação de que o ambiente está correto

Sequência que o README pede ao avaliador para rodar logo após o clone:

```bash
cd backend && npm install && npm test        # suíte verde, sem rede, sem banco
npm run dev &
curl -s localhost:3000/api/health | jq       # {"status":"ok","assistente":{"modo":"demo"}}
curl -s "localhost:3000/api/alunos?busca=hel" | jq '.paginacao.total'
curl -s -X POST localhost:3000/api/assistente \
  -H 'content-type: application/json' \
  -d '{"pergunta":"Quais alunos estão inadimplentes?"}' | jq
```

Se esses quatro comandos funcionarem num clone limpo, sem `.env` preenchido e
sem Docker, o requisito RNF-07 está cumprido.
