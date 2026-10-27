import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calcularSituacao } from './situacao-financeira.js';
import { parcelaEmAberto, parcelaParcial, parcelaQuitada } from './_fixtures.js';

const HOJE = '2026-10-26';

// Casos 1, 2, 4, 6 e 9 de docs/06 §3 — a regra base.

test('caso 1: aluno sem nenhuma parcela é adimplente', () => {
  assert.equal(calcularSituacao([], HOJE), 'ADIMPLENTE');
});

test('caso 2: aluno com todas as parcelas quitadas é adimplente', () => {
  const parcelas = [
    parcelaQuitada({ vencimento: '2026-08-10', pagoEm: '2026-08-08' }),
    parcelaQuitada({ vencimento: '2026-09-10', pagoEm: '2026-09-08' }),
  ];
  assert.equal(calcularSituacao(parcelas, HOJE), 'ADIMPLENTE');
});

test('caso 4: parcela vencida ontem e não paga torna o aluno inadimplente', () => {
  const parcelas = [parcelaEmAberto({ vencimento: '2026-10-25' })];
  assert.equal(calcularSituacao(parcelas, HOJE), 'INADIMPLENTE');
});

test('caso 6: parcela futura em aberto não torna o aluno inadimplente', () => {
  const parcelas = [parcelaEmAberto({ vencimento: '2026-11-10' })];
  assert.equal(calcularSituacao(parcelas, HOJE), 'ADIMPLENTE');
});

test('caso 9: basta uma parcela vencida entre várias quitadas', () => {
  const parcelas = [
    ...Array.from({ length: 9 }, (_, i) =>
      parcelaQuitada({ vencimento: `2026-0${i + 1}-10`, pagoEm: `2026-0${i + 1}-08` }),
    ),
    parcelaEmAberto({ vencimento: '2026-08-10' }),
  ];
  assert.equal(calcularSituacao(parcelas, HOJE), 'INADIMPLENTE');
});

// Casos 7, 10 e 11 de docs/06 §3 — quitação exige valor suficiente.
// É a causa-raiz C de docs/06 §2: tratar `pagoEm` preenchido como quitação faz
// R$ 1.150 em aberto sumirem do radar quando o aluno paga R$ 100 de R$ 1.250.

test('caso 7: pagamento parcial de parcela vencida mantém o aluno inadimplente', () => {
  const parcelas = [
    parcelaParcial({
      vencimento: '2026-10-10',
      pagoEm: '2026-10-10',
      valorCentavos: 125_000,
      valorPagoCentavos: 10_000,
    }),
  ];
  assert.equal(calcularSituacao(parcelas, HOJE), 'INADIMPLENTE');
});

test('caso 10: pagamento parcial de parcela a vencer não torna o aluno inadimplente', () => {
  const parcelas = [
    parcelaParcial({
      vencimento: '2026-11-10',
      pagoEm: '2026-11-01',
      valorCentavos: 125_000,
      valorPagoCentavos: 10_000,
    }),
  ];
  assert.equal(calcularSituacao(parcelas, HOJE), 'ADIMPLENTE');
});

test('caso 11: pagamento acima do valor devido quita a parcela', () => {
  const parcelas = [
    parcelaQuitada({
      vencimento: '2026-09-10',
      pagoEm: '2026-09-08',
      valorCentavos: 125_000,
      valorPagoCentavos: 130_000,
    }),
  ];
  assert.equal(calcularSituacao(parcelas, HOJE), 'ADIMPLENTE');
});
