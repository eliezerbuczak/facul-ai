import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
} from '@anthropic-ai/sdk';

import { ErroDeAplicacao } from '../../../shared/erros.js';
import { criarAnthropicProvider } from './anthropic.provider.js';

const config = {
  anthropic: { modelo: 'claude-opus-5', timeoutMs: 20_000, effort: 'low' },
};

/** Cliente de teste: devolve a resposta dada, ou lança o erro dado. */
function clienteQue(resultado) {
  const chamadas = [];
  return {
    chamadas,
    messages: {
      async create(params) {
        chamadas.push(params);
        if (resultado instanceof Error) throw resultado;
        return resultado;
      },
    },
  };
}

const provider = (resultado) => {
  const cliente = clienteQue(resultado);
  return { p: criarAnthropicProvider({ cliente, config }), cliente };
};

const contexto = {
  mensagens: [{ role: 'user', content: [{ type: 'text', text: 'quem está devendo?' }] }],
  ferramentas: [{ name: 'listar_alunos', description: 'x', input_schema: {} }],
};

/** Instância de erro do SDK sem passar pelo construtor. */
const erroDoSdk = (Classe, extras = {}) =>
  Object.assign(Object.create(Classe.prototype), extras);

// ---------- identidade e forma da requisição ----------

test('o provider se identifica como anthropic', () => {
  assert.equal(provider({}).p.nome, 'anthropic');
});

test('envia modelo, teto de tokens, esforço e as ferramentas', async () => {
  const { p, cliente } = provider({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: 'ok' }],
  });
  await p.decidir(contexto);

  const req = cliente.chamadas[0];
  assert.equal(req.model, 'claude-opus-5');
  assert.ok(req.max_tokens >= 4096);
  assert.equal(req.output_config.effort, 'low');
  assert.equal(req.tools.length, 1);
  assert.deepEqual(req.messages, contexto.mensagens);
});

test('NÃO desliga o raciocínio', async () => {
  // Com thinking desligado, o modelo às vezes escreve a chamada de ferramenta
  // como texto visível em vez de emitir o bloco tool_use: a chamada nunca
  // executa e nenhum erro é levantado. Custo controlado por effort, não por
  // desligar o raciocínio (docs/05 §4).
  const { p, cliente } = provider({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: 'ok' }],
  });
  await p.decidir(contexto);
  assert.notEqual(cliente.chamadas[0].thinking?.type, 'disabled');
});

test('o prompt de sistema carrega as regras de grounding', async () => {
  const { p, cliente } = provider({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: 'ok' }],
  });
  await p.decidir(contexto);

  const sistema = cliente.chamadas[0].system;
  assert.match(sistema, /exclusivamente|somente/i);
  assert.match(sistema, /ferramenta/i);
  assert.match(sistema, /n[aã]o invente|nunca invente/i);
  assert.match(sistema, /centavos/i);
});

// ---------- leitura da resposta ----------

test('stop_reason tool_use vira decisão de chamar ferramentas', async () => {
  const content = [
    { type: 'text', text: 'vou consultar' },
    { type: 'tool_use', id: 'toolu_1', name: 'listar_alunos', input: { status: null } },
  ];
  const d = await provider({ stop_reason: 'tool_use', content }).p.decidir(contexto);

  assert.equal(d.tipo, 'ferramentas');
  assert.deepEqual(d.chamadas, [
    { id: 'toolu_1', nome: 'listar_alunos', argumentos: { status: null } },
  ]);
  // O conteúdo bruto volta inteiro, com os blocos tool_use.
  assert.deepEqual(d.conteudoBruto, content);
});

test('várias chamadas numa resposta viram várias entradas', async () => {
  const d = await provider({
    stop_reason: 'tool_use',
    content: [
      { type: 'tool_use', id: 'a', name: 'contar_alunos', input: {} },
      { type: 'tool_use', id: 'b', name: 'listar_alunos', input: {} },
    ],
  }).p.decidir(contexto);
  assert.equal(d.chamadas.length, 2);
});

test('stop_reason end_turn vira resposta de texto', async () => {
  const d = await provider({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: 'Há 4 inadimplentes.' }],
  }).p.decidir(contexto);
  assert.deepEqual(d, { tipo: 'resposta', texto: 'Há 4 inadimplentes.' });
});

test('blocos de texto múltiplos são concatenados', async () => {
  const d = await provider({
    stop_reason: 'end_turn',
    content: [
      { type: 'text', text: 'Primeiro.' },
      { type: 'text', text: 'Segundo.' },
    ],
  }).p.decidir(contexto);
  assert.equal(d.texto, 'Primeiro.\nSegundo.');
});

test('blocos de thinking não vazam para a resposta do usuário', async () => {
  const d = await provider({
    stop_reason: 'end_turn',
    content: [
      { type: 'thinking', thinking: 'raciocínio interno' },
      { type: 'text', text: 'Resposta.' },
    ],
  }).p.decidir(contexto);
  assert.equal(d.texto, 'Resposta.');
});

// ---------- stop_reason antes de ler o conteúdo ----------

test('recusa do classificador vira 502, não TypeError', async () => {
  // Recusa retorna HTTP 200 com content vazio. Código que lê content[0].text
  // direto quebra com TypeError nesse caminho.
  const { p } = provider({
    stop_reason: 'refusal',
    stop_details: { category: 'cyber' },
    content: [],
  });
  await assert.rejects(
    () => p.decidir(contexto),
    (e) => {
      assert.ok(e instanceof ErroDeAplicacao);
      assert.equal(e.status, 502);
      return true;
    },
  );
});

test('resposta truncada por max_tokens vira 502 em vez de texto pela metade', async () => {
  const { p } = provider({
    stop_reason: 'max_tokens',
    content: [{ type: 'text', text: 'A resposta começou mas' }],
  });
  await assert.rejects(
    () => p.decidir(contexto),
    (e) => {
      assert.equal(e.codigo, 'IA_RESPOSTA_INVALIDA');
      return true;
    },
  );
});

test('resposta sem nenhum texto utilizável vira 502', async () => {
  const { p } = provider({ stop_reason: 'end_turn', content: [] });
  await assert.rejects(
    () => p.decidir(contexto),
    (e) => {
      assert.equal(e.codigo, 'IA_RESPOSTA_INVALIDA');
      return true;
    },
  );
});

// ---------- mapeamento de erro do SDK ----------

test('cada exceção do SDK vira o status HTTP adequado', async () => {
  const casos = [
    [AuthenticationError, 'IA_INDISPONIVEL', 503],
    [PermissionDeniedError, 'IA_INDISPONIVEL', 503],
    [NotFoundError, 'IA_INDISPONIVEL', 503],
    [RateLimitError, 'LIMITE_DE_REQUISICOES', 429],
    [APIConnectionTimeoutError, 'IA_TIMEOUT', 504],
    [APIConnectionError, 'IA_INDISPONIVEL', 503],
  ];
  for (const [Classe, codigo, status] of casos) {
    const { p } = provider(erroDoSdk(Classe));
    await assert.rejects(
      () => p.decidir(contexto),
      (e) => {
        assert.equal(e.codigo, codigo, Classe.name);
        assert.equal(e.status, status, Classe.name);
        return true;
      },
    );
  }
});

test('5xx do provedor vira 503', async () => {
  const { p } = provider(erroDoSdk(APIError, { status: 529 }));
  await assert.rejects(
    () => p.decidir(contexto),
    (e) => {
      assert.equal(e.status, 503);
      return true;
    },
  );
});

test('4xx do provedor vira 502 — é erro nosso, não indisponibilidade', async () => {
  const { p } = provider(erroDoSdk(APIError, { status: 400 }));
  await assert.rejects(
    () => p.decidir(contexto),
    (e) => {
      assert.equal(e.status, 502);
      return true;
    },
  );
});

test('chave inválida não vaza para a resposta do cliente', async () => {
  const { p } = provider(
    erroDoSdk(AuthenticationError, { message: 'invalid x-api-key sk-ant-abc' }),
  );
  await assert.rejects(
    () => p.decidir(contexto),
    (e) => {
      assert.equal(e.message.includes('sk-ant'), false);
      assert.equal(e.message.includes('x-api-key'), false);
      return true;
    },
  );
});
