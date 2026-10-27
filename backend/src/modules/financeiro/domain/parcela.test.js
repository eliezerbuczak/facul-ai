import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ErroDeDominio } from '../../../shared/erros.js';
import { criarParcela, estaQuitada, situacaoDaParcela } from './parcela.js';
import { parcelaEmAberto, parcelaParcial, parcelaQuitada } from './_fixtures.js';

const HOJE = '2026-10-26';

const VALIDA = {
  id: 'p1',
  alunoId: 'a1',
  competencia: '2026-09',
  valorCentavos: 125_000,
  vencimento: '2026-09-10',
  pagoEm: null,
  valorPagoCentavos: null,
};

// Invariantes I1–I4 de docs/06 §3.

test('I1: pagamento com data mas sem valor é rejeitado', () => {
  assert.throws(
    () => criarParcela({ ...VALIDA, pagoEm: '2026-09-08', valorPagoCentavos: null }),
    ErroDeDominio,
  );
});

test('I2: valor pago sem data de pagamento é rejeitado', () => {
  assert.throws(
    () => criarParcela({ ...VALIDA, pagoEm: null, valorPagoCentavos: 125_000 }),
    ErroDeDominio,
  );
});

test('I3: valor da parcela precisa ser positivo', () => {
  assert.throws(() => criarParcela({ ...VALIDA, valorCentavos: 0 }), ErroDeDominio);
  assert.throws(() => criarParcela({ ...VALIDA, valorCentavos: -1 }), ErroDeDominio);
});

test('I4: valor pago zerado com data de pagamento é rejeitado', () => {
  assert.throws(
    () => criarParcela({ ...VALIDA, pagoEm: '2026-09-08', valorPagoCentavos: 0 }),
    ErroDeDominio,
  );
});

test('id e alunoId não podem ser vazios', () => {
  assert.throws(() => criarParcela({ ...VALIDA, id: '' }), ErroDeDominio);
  assert.throws(() => criarParcela({ ...VALIDA, id: '   ' }), ErroDeDominio);
  assert.throws(() => criarParcela({ ...VALIDA, alunoId: '' }), ErroDeDominio);
});

test('competência precisa estar no formato YYYY-MM', () => {
  assert.throws(() => criarParcela({ ...VALIDA, competencia: '2026' }), ErroDeDominio);
  assert.throws(
    () => criarParcela({ ...VALIDA, competencia: '2026-09-10' }),
    ErroDeDominio,
  );
});

test('data de pagamento precisa estar no formato YYYY-MM-DD', () => {
  assert.throws(
    () => criarParcela({ ...VALIDA, pagoEm: '08/09/2026', valorPagoCentavos: 125_000 }),
    ErroDeDominio,
  );
});

test('valor pago fracionário é rejeitado — centavos são inteiros', () => {
  assert.throws(
    () => criarParcela({ ...VALIDA, pagoEm: '2026-09-08', valorPagoCentavos: 1250.5 }),
    ErroDeDominio,
  );
});

test('vencimento precisa estar no formato YYYY-MM-DD', () => {
  assert.throws(
    () => criarParcela({ ...VALIDA, vencimento: '10/09/2026' }),
    ErroDeDominio,
  );
});

test('a parcela construída é imutável', () => {
  const p = criarParcela(VALIDA);
  assert.throws(() => {
    p.valorCentavos = 1;
  }, TypeError);
});

// Situação de cada parcela — P1–P6 de docs/06 §3.
// O front depende disso para exibir a evidência ao lado do veredito (RF-13).

test('P1: parcela quitada integralmente é PAGA', () => {
  assert.equal(
    situacaoDaParcela(parcelaQuitada({ vencimento: '2026-09-10' }), HOJE),
    'PAGA',
  );
});

test('P2: parcela em aberto com vencimento passado é VENCIDA', () => {
  assert.equal(
    situacaoDaParcela(parcelaEmAberto({ vencimento: '2026-09-10' }), HOJE),
    'VENCIDA',
  );
});

test('P3: parcela em aberto que vence hoje é A_VENCER', () => {
  assert.equal(
    situacaoDaParcela(parcelaEmAberto({ vencimento: HOJE }), HOJE),
    'A_VENCER',
  );
});

test('P4: parcela em aberto com vencimento futuro é A_VENCER', () => {
  assert.equal(
    situacaoDaParcela(parcelaEmAberto({ vencimento: '2026-12-10' }), HOJE),
    'A_VENCER',
  );
});

test('P5: parcela parcial com vencimento passado é VENCIDA', () => {
  const p = parcelaParcial({ vencimento: '2026-09-10', pagoEm: '2026-09-10' });
  assert.equal(situacaoDaParcela(p, HOJE), 'VENCIDA');
});

test('P6: parcela parcial com vencimento futuro é A_VENCER', () => {
  const p = parcelaParcial({ vencimento: '2026-12-10', pagoEm: '2026-11-10' });
  assert.equal(situacaoDaParcela(p, HOJE), 'A_VENCER');
});

test('estaQuitada aceita pagamento acima do valor devido', () => {
  const p = parcelaQuitada({ valorCentavos: 125_000, valorPagoCentavos: 130_000 });
  assert.equal(estaQuitada(p), true);
});
