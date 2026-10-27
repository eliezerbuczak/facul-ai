import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parcelaEmAberto, parcelaParcial, parcelaQuitada } from './_fixtures.js';
import { resumirFinanceiro } from './resumo.js';

const HOJE = '2026-10-26';

test('aluno sem parcelas tem resumo zerado e situação adimplente', () => {
  const r = resumirFinanceiro([], HOJE);
  assert.equal(r.situacao, 'ADIMPLENTE');
  assert.equal(r.referencia, HOJE);
  assert.deepEqual(r.resumo, {
    totalParcelas: 0,
    parcelasPagas: 0,
    parcelasVencidas: 0,
    parcelasAVencer: 0,
    totalEmAbertoCentavos: 0,
    totalVencidoCentavos: 0,
  });
  assert.deepEqual(r.parcelas, []);
});

test('conta parcelas por situação', () => {
  const r = resumirFinanceiro(
    [
      parcelaQuitada({ vencimento: '2026-08-10', pagoEm: '2026-08-09' }),
      parcelaQuitada({ vencimento: '2026-09-10', pagoEm: '2026-09-09' }),
      parcelaEmAberto({ vencimento: '2026-10-10' }),
      parcelaEmAberto({ vencimento: '2026-11-10' }),
    ],
    HOJE,
  );
  assert.equal(r.resumo.totalParcelas, 4);
  assert.equal(r.resumo.parcelasPagas, 2);
  assert.equal(r.resumo.parcelasVencidas, 1);
  assert.equal(r.resumo.parcelasAVencer, 1);
  assert.equal(r.situacao, 'INADIMPLENTE');
});

test('em aberto e vencido são valores diferentes — confundi-los é causa-raiz', () => {
  // docs/06 §2: somar tudo que não foi pago e chamar de "vencido" infla a
  // dívida com parcelas que ainda nem venceram.
  const r = resumirFinanceiro(
    [
      parcelaEmAberto({ vencimento: '2026-10-10', valorCentavos: 100_000 }),
      parcelaEmAberto({ vencimento: '2026-11-10', valorCentavos: 50_000 }),
    ],
    HOJE,
  );
  assert.equal(r.resumo.totalEmAbertoCentavos, 150_000);
  assert.equal(r.resumo.totalVencidoCentavos, 100_000);
});

test('pagamento parcial deixa em aberto apenas o saldo restante', () => {
  const r = resumirFinanceiro(
    [
      parcelaParcial({
        vencimento: '2026-10-10',
        pagoEm: '2026-10-10',
        valorCentavos: 125_000,
        valorPagoCentavos: 40_000,
      }),
    ],
    HOJE,
  );
  assert.equal(r.resumo.totalEmAbertoCentavos, 85_000);
  assert.equal(r.resumo.totalVencidoCentavos, 85_000);
  assert.equal(r.situacao, 'INADIMPLENTE');
});

test('pagamento acima do devido não gera saldo negativo', () => {
  const r = resumirFinanceiro(
    [parcelaQuitada({ valorCentavos: 125_000, valorPagoCentavos: 130_000 })],
    HOJE,
  );
  assert.equal(r.resumo.totalEmAbertoCentavos, 0);
});

test('cada parcela sai com a própria situação derivada', () => {
  const r = resumirFinanceiro(
    [
      parcelaEmAberto({ vencimento: '2026-10-10' }),
      parcelaEmAberto({ vencimento: HOJE }),
      parcelaQuitada({ vencimento: '2026-09-10', pagoEm: '2026-09-09' }),
    ],
    HOJE,
  );
  assert.deepEqual(
    r.parcelas.map((p) => p.situacao),
    ['VENCIDA', 'A_VENCER', 'PAGA'],
  );
});

test('a data de referência vai na resposta — o veredito precisa ser auditável', () => {
  const r = resumirFinanceiro([], '2027-01-15');
  assert.equal(r.referencia, '2027-01-15');
});
