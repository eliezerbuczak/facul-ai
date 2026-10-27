import { test } from 'node:test';
import assert from 'node:assert/strict';

import { carregarSeed } from '../../../platform/seed.js';
import { ErroDeAplicacao } from '../../../shared/erros.js';
import { criarAlunoRepositoryEmMemoria } from '../../alunos/index.js';
import { criarParcelaRepositoryEmMemoria } from '../infra/parcela.repository.memoria.js';
import { criarObterFinanceiroDoAluno } from './obter-financeiro-do-aluno.js';

const HOJE = '2026-10-26';
const HELENA = '578645ee-7789-4e1e-b7ab-7c9048037759';
const THAIS = '00358be8-3e54-4281-815a-7d86d5f33783';
const CAIO = '3cc46b65-9239-42e8-bf24-8423b8c70758';
const INEXISTENTE = '00000000-0000-4000-8000-000000000000';

function caso() {
  const seed = carregarSeed(HOJE);
  return criarObterFinanceiroDoAluno({
    alunoRepo: criarAlunoRepositoryEmMemoria(seed),
    parcelaRepo: criarParcelaRepositoryEmMemoria(seed),
    relogio: () => HOJE,
  });
}

test('devolve a situação, o resumo e as parcelas do aluno', async () => {
  const r = await caso()(HELENA);
  assert.equal(r.alunoId, HELENA);
  assert.equal(r.situacao, 'ADIMPLENTE');
  assert.equal(r.referencia, HOJE);
  assert.equal(r.parcelas.length, 3);
});

test('aluno sem parcelas é adimplente com resumo zerado', async () => {
  const r = await caso()(CAIO);
  assert.equal(r.situacao, 'ADIMPLENTE');
  assert.deepEqual(r.parcelas, []);
  assert.equal(r.resumo.totalEmAbertoCentavos, 0);
});

test('parcela que vence hoje não torna o aluno inadimplente', async () => {
  const r = await caso()(THAIS);
  assert.equal(r.situacao, 'ADIMPLENTE');
  assert.equal(r.resumo.parcelasAVencer, 1);
  assert.equal(r.resumo.parcelasVencidas, 0);
});

test('lança ALUNO_NAO_ENCONTRADO quando o aluno não existe', async () => {
  await assert.rejects(
    () => caso()(INEXISTENTE),
    (e) => {
      assert.ok(e instanceof ErroDeAplicacao);
      assert.equal(e.status, 404);
      return true;
    },
  );
});

test('a data de referência vem do relógio injetado, não do sistema', async () => {
  const seed = carregarSeed(HOJE);
  const obter = criarObterFinanceiroDoAluno({
    alunoRepo: criarAlunoRepositoryEmMemoria(seed),
    parcelaRepo: criarParcelaRepositoryEmMemoria(seed),
    relogio: () => '2027-03-01',
  });
  const r = await obter(THAIS);
  assert.equal(r.referencia, '2027-03-01');
  // Quatro meses depois, a parcela que vencia "hoje" está vencida.
  assert.equal(r.situacao, 'INADIMPLENTE');
});
