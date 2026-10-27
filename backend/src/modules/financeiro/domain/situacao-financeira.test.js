import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calcularSituacao } from './situacao-financeira.js';
import { parcelaEmAberto, parcelaQuitada } from './_fixtures.js';

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
