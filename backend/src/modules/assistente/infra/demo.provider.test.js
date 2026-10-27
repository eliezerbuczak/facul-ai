import { test } from 'node:test';
import assert from 'node:assert/strict';

import { criarDemoProvider } from './demo.provider.js';

const provider = criarDemoProvider();
const perguntar = (texto, alunoId) =>
  provider.decidir({
    mensagens: [
      {
        role: 'user',
        content: [{ type: 'text', text: alunoId ? `${texto}\n\nid ${alunoId}` : texto }],
      },
    ],
  });

test('o provider se identifica como demonstrativo', () => {
  assert.equal(provider.nome, 'demo');
});

test('pergunta sobre inadimplência escolhe listar_alunos com o filtro certo', async () => {
  for (const p of [
    'Quais alunos estão inadimplentes?',
    'quem está devendo?',
    'me mostra os alunos em atraso',
  ]) {
    const d = await perguntar(p);
    assert.equal(d.tipo, 'ferramentas', p);
    assert.equal(d.chamadas[0].nome, 'listar_alunos', p);
    assert.equal(d.chamadas[0].argumentos.situacaoFinanceira, 'INADIMPLENTE', p);
  }
});

test('pergunta quantitativa escolhe contar_alunos', async () => {
  const d = await perguntar('Quantos alunos estão com matrícula ativa?');
  assert.equal(d.chamadas[0].nome, 'contar_alunos');
  assert.equal(d.chamadas[0].argumentos.status, 'ATIVO');
});

test('reconhece os quatro status acadêmicos', async () => {
  const esperado = {
    'quantos estão ativos?': 'ATIVO',
    'quantos trancaram?': 'TRANCADO',
    'quantos cancelaram?': 'CANCELADO',
    'quantos já se formaram?': 'FORMADO',
  };
  for (const [p, status] of Object.entries(esperado)) {
    assert.equal((await perguntar(p)).chamadas[0].argumentos.status, status, p);
  }
});

test('pedido de resumo com aluno em foco escolhe obter_financeiro', async () => {
  const id = '578645ee-7789-4e1e-b7ab-7c9048037759';
  const d = await perguntar('Resuma a situação financeira do aluno selecionado', id);
  assert.equal(d.chamadas[0].nome, 'obter_financeiro');
  assert.equal(d.chamadas[0].argumentos.alunoId, id);
});

test('matrícula na pergunta escolhe obter_aluno', async () => {
  const d = await perguntar('me fala sobre a matrícula 2023000094');
  assert.equal(d.chamadas[0].nome, 'obter_aluno');
  assert.equal(d.chamadas[0].argumentos.matriculaOuNome, '2023000094');
});

test('nome próprio com pedido de dados escolhe obter_aluno', async () => {
  // Visto na interface: "dados da Mariana Rezende" caía no fallback, porque o
  // classificador só reconhecia aluno por matrícula de dez dígitos.
  for (const [p, nome] of [
    ['dados da Mariana Rezende', 'Mariana Rezende'],
    ['me fala sobre Otávio Siqueira', 'Otávio Siqueira'],
    ['quem é Helena Marques?', 'Helena Marques'],
    ['informações sobre Rafael Pinto', 'Rafael Pinto'],
  ]) {
    const d = await perguntar(p);
    assert.equal(d.tipo, 'ferramentas', p);
    assert.equal(d.chamadas[0].nome, 'obter_aluno', p);
    assert.equal(d.chamadas[0].argumentos.matriculaOuNome, nome, p);
  }
});

test('nome próprio sem pedido de pessoa continua fora do repertório', async () => {
  // O portão de domínio não pode cair só porque há uma palavra maiúscula:
  // "a capital da Austrália" não é um pedido sobre aluno.
  for (const p of ['Qual a capital da Austrália?', 'quem ganhou a Copa de 2002?']) {
    const d = await perguntar(p);
    assert.equal(d.tipo, 'resposta', p);
    assert.match(d.texto, /demonstrativo/i, p);
  }
});

test('pergunta fora do repertório responde sem inventar e sem chamar ferramenta', async () => {
  const d = await perguntar('qual a capital da Austrália?');
  assert.equal(d.tipo, 'resposta');
  assert.match(d.texto, /modo demonstrativo/i);
  // Não pode conter número nem nome próprio, ou a barreira de grounding barra.
  assert.equal(/\d/.test(d.texto), false);
});

test('palavra de intenção fora do domínio não dispara ferramenta', async () => {
  // Encontrado em teste manual: "quantos habitantes" casava com o padrão de
  // pergunta quantitativa e devolvia a contagem de ALUNOS. A resposta era
  // verdadeira e completamente sem sentido para a pergunta.
  for (const p of [
    'Qual a capital da Austrália e quantos habitantes tem?',
    'quantos dias tem fevereiro?',
    'me resume o enredo de Dom Casmurro',
    'quanto custa um carro novo?',
  ]) {
    const d = await perguntar(p);
    assert.equal(d.tipo, 'resposta', p);
    assert.match(d.texto, /demonstrativo/i, p);
  }
});

test('intenção dentro do domínio continua disparando a ferramenta', async () => {
  for (const [p, ferramenta] of [
    ['quantos alunos temos?', 'contar_alunos'],
    ['quantas matrículas ativas?', 'contar_alunos'],
    ['quantos estudantes estão inadimplentes?', 'contar_alunos'],
    ['quem está com mensalidade em aberto?', 'listar_alunos'],
  ]) {
    const d = await perguntar(p);
    assert.equal(d.tipo, 'ferramentas', p);
    assert.equal(d.chamadas[0].nome, ferramenta, p);
  }
});

test('a decisão tem a forma de blocos de tool use da API real', async () => {
  const d = await perguntar('quem está devendo?');
  const bloco = d.conteudoBruto[0];
  assert.equal(bloco.type, 'tool_use');
  assert.equal(bloco.name, 'listar_alunos');
  assert.equal(bloco.id, d.chamadas[0].id);
});

test('com resultado de ferramenta em mão, formata a resposta final', async () => {
  const d = await provider.decidir({
    mensagens: [
      { role: 'user', content: [{ type: 'text', text: 'quem está devendo?' }] },
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 't1', name: 'contar_alunos', input: {} }],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 't1', content: '{"total":4}' }],
      },
    ],
  });
  assert.equal(d.tipo, 'resposta');
  assert.match(d.texto, /4/);
});

test('resultado de erro vira resposta honesta, não invenção', async () => {
  const d = await provider.decidir({
    mensagens: [
      { role: 'user', content: [{ type: 'text', text: 'x' }] },
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 't1', name: 'obter_financeiro', input: {} }],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 't1',
            is_error: true,
            content: 'Aluno não encontrado.',
          },
        ],
      },
    ],
  });
  assert.match(d.texto, /não foi possível|não encontr/i);
});
