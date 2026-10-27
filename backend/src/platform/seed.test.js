import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';

import { calcularSituacao } from '../modules/financeiro/index.js';
import { carregarSeed, resolverSeed } from './seed.js';

const HOJE = '2026-10-26';

test('resolve deslocamentos em dias para datas absolutas', () => {
  const bruto = {
    alunos: [
      {
        id: '578645ee-7789-4e1e-b7ab-7c9048037759',
        nome: 'Helena Marques',
        matricula: '2024000137',
        curso: 'Engenharia de Software',
        status: 'ATIVO',
        ingressoEmDias: -10,
        parcelas: [{ valorCentavos: 125_000, vencimentoEmDias: -5, pagoEmDias: -6 }],
      },
    ],
  };
  const { alunos, parcelas } = resolverSeed(bruto, HOJE);

  assert.equal(alunos[0].ingressoEm, '2026-10-16');
  assert.equal(parcelas[0].vencimento, '2026-10-21');
  assert.equal(parcelas[0].pagoEm, '2026-10-20');
});

test('deriva a competência do mês do vencimento', () => {
  const { parcelas } = carregarSeed(HOJE);
  for (const p of parcelas) {
    assert.equal(p.competencia, p.vencimento.slice(0, 7));
  }
});

test('parcela sem data de pagamento fica em aberto', () => {
  const { parcelas } = carregarSeed(HOJE);
  const emAberto = parcelas.filter((p) => p.pagoEm === null);
  assert.ok(emAberto.length > 0);
  for (const p of emAberto) assert.equal(p.valorPagoCentavos, null);
});

test('pagamento sem valor explícito quita a parcela integralmente', () => {
  const { parcelas } = carregarSeed(HOJE);
  const quitadas = parcelas.filter(
    (p) => p.pagoEm !== null && p.valorPagoCentavos !== null,
  );
  const integrais = quitadas.filter((p) => p.valorPagoCentavos === p.valorCentavos);
  assert.ok(integrais.length > 0);
});

test('o seed produz entidades válidas — a construção valida as invariantes', () => {
  const { alunos, parcelas } = carregarSeed(HOJE);
  assert.equal(alunos.length, 12);
  assert.equal(parcelas.length, 24);
  for (const a of alunos) assert.ok(Object.isFrozen(a));
  for (const p of parcelas) assert.ok(Object.isFrozen(p));
});

test('cada parcela aponta para um aluno existente', () => {
  const { alunos, parcelas } = carregarSeed(HOJE);
  const ids = new Set(alunos.map((a) => a.id));
  for (const p of parcelas) assert.ok(ids.has(p.alunoId), `órfã: ${p.id}`);
});

test('matrículas são únicas', () => {
  const { alunos } = carregarSeed(HOJE);
  assert.equal(new Set(alunos.map((a) => a.matricula)).size, alunos.length);
});

// O teste que de fato importa: o seed afirma, em `situacaoEsperada`, qual caso
// de docs/06 §3 cada perfil demonstra. Aqui isso é conferido contra a regra
// real, em vez de ficar valendo por confiança no comentário do JSON.
test('cada perfil do seed produz a situação financeira que declara', () => {
  const bruto = JSON.parse(
    readFileSync(new URL('../../seed/dados.json', import.meta.url), 'utf8'),
  );
  const { parcelas } = carregarSeed(HOJE);

  for (const perfil of bruto.alunos) {
    const doAluno = parcelas.filter((p) => p.alunoId === perfil.id);
    assert.equal(
      calcularSituacao(doAluno, HOJE),
      perfil.situacaoEsperada,
      `${perfil.nome} — ${perfil.demonstra}`,
    );
  }
});

test('o seed cobre os dois lados da regra e os quatro status acadêmicos', () => {
  const { alunos, parcelas } = carregarSeed(HOJE);
  const situacoes = alunos.map((a) =>
    calcularSituacao(
      parcelas.filter((p) => p.alunoId === a.id),
      HOJE,
    ),
  );
  assert.ok(situacoes.includes('ADIMPLENTE'));
  assert.ok(situacoes.includes('INADIMPLENTE'));
  assert.deepEqual([...new Set(alunos.map((a) => a.status))].sort(), [
    'ATIVO',
    'CANCELADO',
    'FORMADO',
    'TRANCADO',
  ]);
});
