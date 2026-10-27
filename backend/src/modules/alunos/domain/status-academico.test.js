import { test } from 'node:test';
import assert from 'node:assert/strict';

import { STATUS_ACADEMICO, STATUS_VALIDOS, ehStatusValido } from './status-academico.js';

test('expõe os quatro status acadêmicos do domínio', () => {
  assert.deepEqual(STATUS_VALIDOS, ['ATIVO', 'TRANCADO', 'CANCELADO', 'FORMADO']);
});

test('reconhece status válido', () => {
  assert.equal(ehStatusValido('ATIVO'), true);
  assert.equal(ehStatusValido(STATUS_ACADEMICO.FORMADO), true);
});

test('rejeita status fora do domínio', () => {
  assert.equal(ehStatusValido('INADIMPLENTE'), false);
  assert.equal(ehStatusValido('ativo'), false);
  assert.equal(ehStatusValido(undefined), false);
});
