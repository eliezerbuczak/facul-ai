import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizarParaBusca } from './texto.js';

test('remove acentos e baixa a caixa', () => {
  assert.equal(normalizarParaBusca('José Antônio Nóbrega'), 'jose antonio nobrega');
  assert.equal(normalizarParaBusca('THAÍS'), 'thais');
});

test('normaliza cedilha e til', () => {
  assert.equal(normalizarParaBusca('Conceição'), 'conceicao');
  assert.equal(normalizarParaBusca('Simões'), 'simoes');
});

test('preserva apóstrofo e espaço — não são diacríticos', () => {
  assert.equal(normalizarParaBusca("Fernanda D'Ávila"), "fernanda d'avila");
});

test('texto já normalizado não muda', () => {
  assert.equal(normalizarParaBusca('rafael pinto'), 'rafael pinto');
});
