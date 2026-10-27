import {
  criarAlunoRepositoryEmMemoria,
  criarContarAlunos,
  criarListarAlunos,
  criarObterAluno,
} from '../modules/alunos/index.js';
import {
  criarObterFinanceiroDoAluno,
  criarParcelaRepositoryEmMemoria,
} from '../modules/financeiro/index.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { carregarSeed } from './seed.js';
import { criarServidor } from './servidor.js';

const HOJE = '2026-10-26';
const HELENA = '578645ee-7789-4e1e-b7ab-7c9048037759';
const THAIS = '00358be8-3e54-4281-815a-7d86d5f33783';
const INEXISTENTE = '00000000-0000-4000-8000-000000000000';

async function servidor() {
  const seed = carregarSeed(HOJE);
  const deps = {
    alunoRepo: criarAlunoRepositoryEmMemoria(seed),
    parcelaRepo: criarParcelaRepositoryEmMemoria(seed),
    relogio: () => HOJE,
  };
  return criarServidor({
    config: {
      corsOrigin: 'http://localhost:5173',
      logLevel: 'silent',
      persistencia: 'memoria',
    },
    casosDeUso: {
      listarAlunos: criarListarAlunos(deps),
      obterAluno: criarObterAluno(deps),
      contarAlunos: criarContarAlunos(deps),
      obterFinanceiroDoAluno: criarObterFinanceiroDoAluno(deps),
    },
  });
}

const get = async (url) => (await servidor()).inject({ method: 'GET', url });

// ---------- health ----------

test('GET /api/health reporta o modo de execução', async () => {
  const r = await get('/api/health');
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().status, 'ok');
  assert.equal(r.json().persistencia, 'memoria');
});

// ---------- listagem ----------

test('GET /api/alunos devolve dados e paginação', async () => {
  const r = await get('/api/alunos');
  assert.equal(r.statusCode, 200);
  const corpo = r.json();
  assert.equal(corpo.dados.length, 12);
  assert.deepEqual(corpo.paginacao, {
    pagina: 1,
    limite: 20,
    total: 12,
    totalPaginas: 1,
  });
});

test('GET /api/alunos calcula totalPaginas corretamente', async () => {
  const corpo = (await get('/api/alunos?limite=5')).json();
  assert.equal(corpo.paginacao.totalPaginas, 3);
  assert.equal(corpo.dados.length, 5);
});

test('GET /api/alunos?busca= encontra por nome sem acento', async () => {
  const corpo = (await get('/api/alunos?busca=thais')).json();
  assert.equal(corpo.paginacao.total, 1);
  assert.equal(corpo.dados[0].nome, 'Thaís Vasconcelos');
});

test('GET /api/alunos?busca= encontra por matrícula', async () => {
  const corpo = (await get('/api/alunos?busca=2023000094')).json();
  assert.equal(corpo.dados[0].nome, 'Rafael Pinto');
});

test('busca sem resultado é 200 com lista vazia, não 404', async () => {
  const r = await get('/api/alunos?busca=zzzzz');
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json().dados, []);
});

test('GET /api/alunos?status= filtra por status', async () => {
  const corpo = (await get('/api/alunos?status=TRANCADO')).json();
  assert.equal(corpo.paginacao.total, 2);
});

test('parâmetro desconhecido na query é ignorado, não é erro', async () => {
  const r = await get('/api/alunos?utm_source=newsletter');
  assert.equal(r.statusCode, 200);
});

test('o aluno devolvido não carrega situação financeira', async () => {
  // ADR 0006: a situação vem do endpoint de financeiro, calculada.
  const aluno = (await get('/api/alunos')).json().dados[0];
  assert.equal('situacao' in aluno, false);
  assert.deepEqual(Object.keys(aluno).sort(), [
    'curso',
    'id',
    'ingressoEm',
    'matricula',
    'nome',
    'status',
  ]);
});

// ---------- validação ----------

test('limite fora da faixa é 400 com o campo apontado', async () => {
  for (const url of ['/api/alunos?limite=0', '/api/alunos?limite=500']) {
    const r = await get(url);
    assert.equal(r.statusCode, 400);
    assert.equal(r.json().erro.codigo, 'REQUISICAO_INVALIDA');
    assert.ok(r.json().erro.detalhes.length > 0);
  }
});

test('página menor que 1 é 400', async () => {
  assert.equal((await get('/api/alunos?pagina=0')).statusCode, 400);
});

test('status fora do enum é 400', async () => {
  assert.equal((await get('/api/alunos?status=XPTO')).statusCode, 400);
});

test('busca vazia é 400', async () => {
  assert.equal((await get('/api/alunos?busca=')).statusCode, 400);
});

// ---------- consulta por id ----------

test('GET /api/alunos/:id devolve o aluno', async () => {
  const r = await get(`/api/alunos/${HELENA}`);
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().nome, 'Helena Marques');
});

test('id que não é UUID é 400, não 404 — a requisição está malformada', async () => {
  const r = await get('/api/alunos/aluno-1');
  assert.equal(r.statusCode, 400);
  assert.equal(r.json().erro.codigo, 'REQUISICAO_INVALIDA');
});

test('UUID válido inexistente é 404 ALUNO_NAO_ENCONTRADO', async () => {
  const r = await get(`/api/alunos/${INEXISTENTE}`);
  assert.equal(r.statusCode, 404);
  assert.equal(r.json().erro.codigo, 'ALUNO_NAO_ENCONTRADO');
});

// ---------- financeiro ----------

test('GET /api/alunos/:id/financeiro devolve situação, resumo e parcelas', async () => {
  const r = await get(`/api/alunos/${HELENA}/financeiro`);
  assert.equal(r.statusCode, 200);
  const corpo = r.json();
  assert.equal(corpo.alunoId, HELENA);
  assert.equal(corpo.situacao, 'ADIMPLENTE');
  assert.equal(corpo.referencia, HOJE);
  assert.equal(corpo.parcelas.length, 3);
  assert.ok('totalVencidoCentavos' in corpo.resumo);
});

test('o financeiro traz a situação de cada parcela — a evidência junto do veredito', async () => {
  const corpo = (await get(`/api/alunos/${THAIS}/financeiro`)).json();
  assert.equal(corpo.situacao, 'ADIMPLENTE');
  assert.ok(corpo.parcelas.some((p) => p.situacao === 'A_VENCER'));
});

test('financeiro de aluno inexistente é 404', async () => {
  const r = await get(`/api/alunos/${INEXISTENTE}/financeiro`);
  assert.equal(r.statusCode, 404);
});

// ---------- erros transversais ----------

test('rota inexistente é 404 ROTA_NAO_ENCONTRADA no envelope padrão', async () => {
  const r = await get('/api/nao-existe');
  assert.equal(r.statusCode, 404);
  assert.equal(r.json().erro.codigo, 'ROTA_NAO_ENCONTRADA');
});

test('toda resposta carrega x-request-id', async () => {
  const r = await get('/api/alunos');
  assert.ok(r.headers['x-request-id']);
});

test('o envelope de erro tem sempre a mesma forma', async () => {
  const erro = (await get(`/api/alunos/${INEXISTENTE}`)).json().erro;
  assert.deepEqual(Object.keys(erro).sort(), ['codigo', 'mensagem']);
  assert.equal(typeof erro.mensagem, 'string');
});

// ---------- polimento das mensagens ----------

test('mensagens de validação vêm em português', async () => {
  const detalhes = (await get('/api/alunos?limite=0')).json().erro.detalhes;
  assert.equal(detalhes[0].campo, 'limite');
  assert.match(detalhes[0].mensagem, /maior ou igual a 1/);
});

test('enum inválido lista os valores aceitos em português', async () => {
  const detalhes = (await get('/api/alunos?status=XPTO')).json().erro.detalhes;
  assert.match(detalhes[0].mensagem, /ATIVO/);
  assert.match(detalhes[0].mensagem, /deve ser um de/);
});

test('formato inválido não despeja a regex na cara do usuário', async () => {
  const detalhes = (await get('/api/alunos/aluno-1')).json().erro.detalhes;
  assert.equal(detalhes[0].campo, 'id');
  assert.equal(detalhes[0].mensagem.includes('[0-9a-f]'), false);
});

test('comprimento mínimo é reportado em português', async () => {
  const detalhes = (await get('/api/alunos?busca=')).json().erro.detalhes;
  assert.match(detalhes[0].mensagem, /no mínimo 1/);
});

test('x-request-id é um identificador único, não um contador de processo', async () => {
  const a = await get('/api/alunos');
  const b = await get('/api/alunos');
  assert.match(a.headers['x-request-id'], /^[0-9a-f-]{36}$/);
  assert.notEqual(a.headers['x-request-id'], b.headers['x-request-id']);
});
