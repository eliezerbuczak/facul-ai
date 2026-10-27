import { test } from 'node:test';
import assert from 'node:assert/strict';

import { carregarSeed } from '../../../platform/seed.js';
import { criarAlunoRepositoryEmMemoria } from './aluno.repository.memoria.js';

const HOJE = '2026-10-26';
const repo = () => criarAlunoRepositoryEmMemoria(carregarSeed(HOJE));

test('lista todos os alunos com a paginação padrão', async () => {
  const { dados, total } = await repo().listar({});
  assert.equal(total, 12);
  assert.equal(dados.length, 12);
});

test('ordena por nome, de forma estável entre chamadas', async () => {
  const a = await repo().listar({});
  const b = await repo().listar({});
  assert.deepEqual(
    a.dados.map((x) => x.nome),
    b.dados.map((x) => x.nome),
  );
  assert.equal(a.dados[0].nome, 'Beatriz Camargo');
});

test('busca por trecho do nome', async () => {
  const { dados } = await repo().listar({ busca: 'marques' });
  assert.equal(dados.length, 1);
  assert.equal(dados[0].nome, 'Helena Marques');
});

test('busca ignora diferença de maiúsculas', async () => {
  const { dados } = await repo().listar({ busca: 'HELENA' });
  assert.equal(dados[0].nome, 'Helena Marques');
});

test('busca ignora acentuação — "thais" encontra "Thaís"', async () => {
  const { dados } = await repo().listar({ busca: 'thais' });
  assert.equal(dados.length, 1);
  assert.equal(dados[0].nome, 'Thaís Vasconcelos');
});

test('busca ignora acentuação em nome composto', async () => {
  const { dados } = await repo().listar({ busca: 'jose antonio' });
  assert.equal(dados[0].nome, 'José Antônio Nóbrega');
});

test('busca acentuada encontra o registro acentuado', async () => {
  const { dados } = await repo().listar({ busca: 'Letícia' });
  assert.equal(dados[0].nome, 'Letícia Albuquerque');
});

test('busca por matrícula, inclusive parcial', async () => {
  const { dados } = await repo().listar({ busca: '2024000137' });
  assert.equal(dados[0].nome, 'Helena Marques');
  const parcial = await repo().listar({ busca: '000137' });
  assert.equal(parcial.dados[0].nome, 'Helena Marques');
});

test('busca sem resultado devolve lista vazia, não erro', async () => {
  const { dados, total } = await repo().listar({ busca: 'zzzzz' });
  assert.deepEqual(dados, []);
  assert.equal(total, 0);
});

test('filtra por status acadêmico', async () => {
  const { dados, total } = await repo().listar({ status: 'TRANCADO' });
  assert.equal(total, 2);
  for (const a of dados) assert.equal(a.status, 'TRANCADO');
});

test('combina busca e filtro por status', async () => {
  const { total } = await repo().listar({ busca: 'a', status: 'CANCELADO' });
  assert.equal(total, 1);
});

test('pagina os resultados e reporta o total sem paginação', async () => {
  const p1 = await repo().listar({ pagina: 1, limite: 5 });
  const p3 = await repo().listar({ pagina: 3, limite: 5 });
  assert.equal(p1.dados.length, 5);
  assert.equal(p3.dados.length, 2);
  assert.equal(p3.total, 12);
  assert.notEqual(p1.dados[0].id, p3.dados[0].id);
});

test('página além do fim devolve lista vazia com o total preservado', async () => {
  const { dados, total } = await repo().listar({ pagina: 99, limite: 5 });
  assert.deepEqual(dados, []);
  assert.equal(total, 12);
});

test('porId devolve o aluno', async () => {
  const a = await repo().porId('578645ee-7789-4e1e-b7ab-7c9048037759');
  assert.equal(a?.nome, 'Helena Marques');
});

test('porId inexistente devolve null, não lança', async () => {
  assert.equal(await repo().porId('00000000-0000-4000-8000-000000000000'), null);
});

test('porMatricula devolve o aluno', async () => {
  const a = await repo().porMatricula('2023000094');
  assert.equal(a?.nome, 'Rafael Pinto');
});

test('porMatricula inexistente devolve null, não lança', async () => {
  assert.equal(await repo().porMatricula('9999999999'), null);
});

test('listar e contar funcionam sem argumento', async () => {
  const { dados, total } = await repo().listar();
  assert.equal(total, 12);
  assert.equal(dados.length, 12);
  assert.equal(await repo().contar(), 12);
});

test('contar respeita o filtro e ignora a paginação', async () => {
  assert.equal(await repo().contar({}), 12);
  assert.equal(await repo().contar({ status: 'ATIVO' }), 8);
  assert.equal(await repo().contar({ status: 'ATIVO', pagina: 2, limite: 1 }), 8);
});
