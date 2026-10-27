import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatarReais } from './dinheiro.js';

test('formata centavos como moeda brasileira', () => {
  assert.equal(formatarReais(125_000), 'R$ 1.250,00');
  assert.equal(formatarReais(0), 'R$ 0,00');
  assert.equal(formatarReais(99), 'R$ 0,99');
});

test('não introduz erro de ponto flutuante', () => {
  assert.equal(formatarReais(10), 'R$ 0,10');
  assert.equal(formatarReais(70), 'R$ 0,70');
});
