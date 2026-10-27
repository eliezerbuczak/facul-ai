import { test } from 'node:test';
import assert from 'node:assert/strict';

import { carregarSeed } from '../../../platform/seed.js';
import { criarParcelaRepositoryEmMemoria } from './parcela.repository.memoria.js';

const HOJE = '2026-10-26';
const HELENA = '578645ee-7789-4e1e-b7ab-7c9048037759';
const CAIO = '3cc46b65-9239-42e8-bf24-8423b8c70758'; // sem parcelas
const repo = () => criarParcelaRepositoryEmMemoria(carregarSeed(HOJE));

test('porAluno devolve as parcelas do aluno', async () => {
  const parcelas = await repo().porAluno(HELENA);
  assert.equal(parcelas.length, 3);
  for (const p of parcelas) assert.equal(p.alunoId, HELENA);
});

test('porAluno ordena por vencimento crescente', async () => {
  const parcelas = await repo().porAluno(HELENA);
  const vencimentos = parcelas.map((p) => p.vencimento);
  assert.deepEqual(vencimentos, [...vencimentos].sort());
});

test('porAluno sem parcelas devolve lista vazia', async () => {
  assert.deepEqual(await repo().porAluno(CAIO), []);
});

test('porAluno de id inexistente devolve lista vazia', async () => {
  assert.deepEqual(await repo().porAluno('00000000-0000-4000-8000-000000000000'), []);
});

test('porAlunos resolve vários alunos em uma chamada', async () => {
  const mapa = await repo().porAlunos([HELENA, CAIO]);
  assert.equal(mapa.get(HELENA)?.length, 3);
});

test('porAlunos inclui entrada vazia para aluno sem parcelas', async () => {
  // Sem isso, todo consumidor precisaria de `?? []` — e quem esquecer quebra
  // só no aluno sem parcelas, que é o caso 1 de docs/06 §3.
  const mapa = await repo().porAlunos([HELENA, CAIO]);
  assert.ok(mapa.has(CAIO));
  assert.deepEqual(mapa.get(CAIO), []);
});

test('porAlunos com lista vazia devolve mapa vazio', async () => {
  const mapa = await repo().porAlunos([]);
  assert.equal(mapa.size, 0);
});
