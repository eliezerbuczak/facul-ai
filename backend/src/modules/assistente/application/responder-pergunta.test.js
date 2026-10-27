import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ErroDeAplicacao } from '../../../shared/erros.js';
import { criarResponderPergunta, pareceAfirmacaoFactual } from './responder-pergunta.js';

/** Provider de teste: devolve as decisões da lista, uma por volta. */
function providerQueDecide(...decisoes) {
  let i = 0;
  const vistos = [];
  return {
    nome: 'teste',
    recebeu: vistos,
    async decidir(contexto) {
      vistos.push(structuredClone(contexto.mensagens));
      return decisoes[i++] ?? { tipo: 'resposta', texto: 'fim' };
    },
  };
}

const chamada = (id, nome, argumentos = {}) => ({ id, nome, argumentos });

function responder(provider, executar) {
  return criarResponderPergunta({
    provider,
    executarFerramenta:
      executar ??
      (async (c) => ({
        nome: c.nome,
        bloco: { type: 'tool_result', tool_use_id: c.id, content: '{"total":4}' },
        fontes: [{ tipo: 'aluno', id: `aluno-${c.id}` }],
      })),
  });
}

// ---------- o laço ----------

test('resposta direta do provider encerra sem chamar ferramenta', async () => {
  const r = await responder(
    providerQueDecide({ tipo: 'resposta', texto: 'Olá! Como posso ajudar?' }),
  )({ pergunta: 'oi' });
  assert.equal(r.resposta, 'Olá! Como posso ajudar?');
  assert.deepEqual(r.ferramentasUsadas, []);
});

test('executa a ferramenta pedida e devolve a resposta da volta seguinte', async () => {
  const r = await responder(
    providerQueDecide(
      {
        tipo: 'ferramentas',
        chamadas: [chamada('t1', 'contar_alunos')],
        conteudoBruto: [],
      },
      { tipo: 'resposta', texto: 'Há 4 alunos inadimplentes.' },
    ),
  )({ pergunta: 'quantos inadimplentes?' });

  assert.equal(r.resposta, 'Há 4 alunos inadimplentes.');
  assert.deepEqual(r.ferramentasUsadas, ['contar_alunos']);
  assert.equal(r.modo, 'teste');
});

test('chamadas paralelas voltam todas em UM único turno de usuário', async () => {
  // Espalhar os resultados em turnos separados ensina o modelo a parar de
  // paralelizar, e a API rejeita tool_use sem tool_result correspondente.
  const provider = providerQueDecide(
    {
      tipo: 'ferramentas',
      chamadas: [chamada('t1', 'contar_alunos'), chamada('t2', 'listar_alunos')],
      conteudoBruto: [
        { type: 'tool_use', id: 't1' },
        { type: 'tool_use', id: 't2' },
      ],
    },
    { tipo: 'resposta', texto: 'Pronto: 4 e 12.' },
  );
  const r = await responder(provider)({ pergunta: 'x' });

  const segundaVolta = provider.recebeu[1];
  const ultimo = segundaVolta.at(-1);
  assert.equal(ultimo.role, 'user');
  assert.equal(ultimo.content.length, 2);
  assert.deepEqual(r.ferramentasUsadas, ['contar_alunos', 'listar_alunos']);
});

test('o conteúdo bruto do assistente volta inteiro, não só o texto', async () => {
  // Os blocos tool_use precisam retornar na íntegra ou a próxima requisição é
  // rejeitada por tool_use sem tool_result.
  const bruto = [
    { type: 'text', text: 'vou consultar' },
    { type: 'tool_use', id: 't1' },
  ];
  const provider = providerQueDecide(
    {
      tipo: 'ferramentas',
      chamadas: [chamada('t1', 'contar_alunos')],
      conteudoBruto: bruto,
    },
    { tipo: 'resposta', texto: 'Total: 4.' },
  );
  await responder(provider)({ pergunta: 'x' });

  const assistente = provider.recebeu[1].find((m) => m.role === 'assistant');
  assert.deepEqual(assistente.content, bruto);
});

test('fontes são agregadas e deduplicadas', async () => {
  const provider = providerQueDecide(
    {
      tipo: 'ferramentas',
      chamadas: [chamada('t1', 'obter_aluno'), chamada('t1', 'obter_financeiro')],
      conteudoBruto: [],
    },
    { tipo: 'resposta', texto: 'Helena está em dia.' },
  );
  const r = await responder(provider)({ pergunta: 'x' });
  assert.equal(r.fontes.length, 1);
});

test('laço infinito é barrado por teto de voltas', async () => {
  const semFim = {
    nome: 'teste',
    async decidir() {
      return {
        tipo: 'ferramentas',
        chamadas: [chamada('t', 'contar_alunos')],
        conteudoBruto: [],
      };
    },
  };
  await assert.rejects(
    () => responder(semFim)({ pergunta: 'x' }),
    (e) => {
      assert.ok(e instanceof ErroDeAplicacao);
      assert.equal(e.codigo, 'IA_RESPOSTA_INVALIDA');
      return true;
    },
  );
});

// ---------- grounding ----------

test('afirmação factual sem nenhuma ferramenta usada é recusada', async () => {
  // Resposta factual sem ferramenta é, por construção, resposta sem fonte.
  const inventor = providerQueDecide({
    tipo: 'resposta',
    texto: 'Os alunos inadimplentes são Maria Silva e João Souza.',
  });
  await assert.rejects(
    () => responder(inventor)({ pergunta: 'quem deve?' }),
    (e) => {
      assert.equal(e.codigo, 'IA_RESPOSTA_INVALIDA');
      assert.equal(e.status, 502);
      return true;
    },
  );
});

test('número inventado sem ferramenta também é recusado', async () => {
  const inventor = providerQueDecide({ tipo: 'resposta', texto: 'São 7 alunos ativos.' });
  await assert.rejects(() => responder(inventor)({ pergunta: 'quantos?' }));
});

test('saudação e pedido de esclarecimento passam sem ferramenta', async () => {
  for (const texto of [
    'Olá! Como posso ajudar?',
    'Pode reformular a pergunta, por favor?',
    'Não entendi o que você quis dizer.',
  ]) {
    const r = await responder(providerQueDecide({ tipo: 'resposta', texto }))({
      pergunta: 'oi',
    });
    assert.equal(r.resposta, texto);
  }
});

test('pareceAfirmacaoFactual distingue dado de conversa', () => {
  assert.equal(pareceAfirmacaoFactual('São 8 alunos ativos.'), true);
  assert.equal(pareceAfirmacaoFactual('Helena Marques está em dia.'), true);
  assert.equal(pareceAfirmacaoFactual('Olá! Como posso ajudar?'), false);
  assert.equal(pareceAfirmacaoFactual('Não encontrei essa informação.'), false);
});

test('o aluno em foco entra no contexto como ponteiro, não como dado', async () => {
  const provider = providerQueDecide({ tipo: 'resposta', texto: 'ok' });
  await responder(provider)({ pergunta: 'resuma', alunoId: 'abc-123' });
  const primeiraVolta = JSON.stringify(provider.recebeu[0]);
  assert.match(primeiraVolta, /abc-123/);
  // Só o id — nenhum dado do aluno foi injetado no prompt.
  assert.equal(primeiraVolta.includes('Helena'), false);
});
