import { test } from 'node:test';
import assert from 'node:assert/strict';

import { carregarSeed } from '../../../platform/seed.js';
import { ErroDeAplicacao } from '../../../shared/erros.js';
import { criarParcelaRepositoryEmMemoria } from '../../financeiro/index.js';
import { criarAlunoRepositoryEmMemoria } from '../infra/aluno.repository.memoria.js';
import { criarContarAlunos } from './contar-alunos.js';
import { criarListarAlunos } from './listar-alunos.js';
import { criarObterAluno } from './obter-aluno.js';

const HOJE = '2026-10-26';
const HELENA = '578645ee-7789-4e1e-b7ab-7c9048037759';
const INEXISTENTE = '00000000-0000-4000-8000-000000000000';

function deps() {
  const seed = carregarSeed(HOJE);
  return {
    alunoRepo: criarAlunoRepositoryEmMemoria(seed),
    parcelaRepo: criarParcelaRepositoryEmMemoria(seed),
    relogio: () => HOJE,
  };
}

test('listarAlunos devolve dados e total', async () => {
  const listar = criarListarAlunos(deps());
  const r = await listar({});
  assert.equal(r.total, 12);
  assert.equal(r.dados.length, 12);
});

test('listarAlunos repassa busca e filtro de status', async () => {
  const listar = criarListarAlunos(deps());
  assert.equal((await listar({ busca: 'thais' })).total, 1);
  assert.equal((await listar({ status: 'TRANCADO' })).total, 2);
});

test('listarAlunos filtra por situação financeira derivada', async () => {
  const listar = criarListarAlunos(deps());
  const inadimplentes = await listar({ situacaoFinanceira: 'INADIMPLENTE' });
  const nomes = inadimplentes.dados.map((a) => a.nome).sort();
  assert.deepEqual(nomes, [
    'Letícia Albuquerque',
    'Luís Felipe Gonçalves',
    'Otávio Siqueira',
    'Rafael Pinto',
  ]);
  assert.equal(inadimplentes.total, 4);
});

test('o filtro de situação é aplicado antes da paginação', async () => {
  // Paginar primeiro e filtrar depois devolveria menos itens que o limite
  // pedido, e um total errado.
  const listar = criarListarAlunos(deps());
  const p1 = await listar({ situacaoFinanceira: 'INADIMPLENTE', pagina: 1, limite: 3 });
  const p2 = await listar({ situacaoFinanceira: 'INADIMPLENTE', pagina: 2, limite: 3 });
  assert.equal(p1.dados.length, 3);
  assert.equal(p2.dados.length, 1);
  assert.equal(p1.total, 4);
  assert.equal(p2.total, 4);
});

test('o filtro de situação combina com busca e status', async () => {
  const listar = criarListarAlunos(deps());
  const r = await listar({ situacaoFinanceira: 'INADIMPLENTE', status: 'TRANCADO' });
  assert.equal(r.total, 1);
  assert.equal(r.dados[0].nome, 'Luís Felipe Gonçalves');
});

test('obterAluno devolve o aluno', async () => {
  const obter = criarObterAluno(deps());
  assert.equal((await obter(HELENA)).nome, 'Helena Marques');
});

test('obterAluno lança ALUNO_NAO_ENCONTRADO com status 404', async () => {
  const obter = criarObterAluno(deps());
  await assert.rejects(
    () => obter(INEXISTENTE),
    (e) => {
      assert.ok(e instanceof ErroDeAplicacao);
      assert.equal(e.codigo, 'ALUNO_NAO_ENCONTRADO');
      assert.equal(e.status, 404);
      return true;
    },
  );
});

test('contarAlunos conta respeitando o filtro', async () => {
  const contar = criarContarAlunos(deps());
  assert.equal(await contar({}), 12);
  assert.equal(await contar({ status: 'ATIVO' }), 8);
  assert.equal(await contar({ situacaoFinanceira: 'INADIMPLENTE' }), 4);
});
