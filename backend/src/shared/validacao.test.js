import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ErroDeDominio } from './erros.js';
import {
  FORMATO,
  exigirFormato,
  exigirInteiroPositivo,
  exigirTextoEntre,
  exigirTextoNaoVazio,
} from './validacao.js';

test('exigirFormato rejeita valor que não é string', () => {
  assert.throws(
    () => exigirFormato(20261026, 'data', FORMATO.DATA_ISO, 'ISO'),
    ErroDeDominio,
  );
  assert.throws(
    () => exigirFormato(null, 'data', FORMATO.DATA_ISO, 'ISO'),
    ErroDeDominio,
  );
});

test('exigirFormato aceita valor no formato', () => {
  assert.doesNotThrow(() => exigirFormato('2026-10-26', 'data', FORMATO.DATA_ISO, 'ISO'));
});

test('exigirTextoEntre rejeita valor que não é string', () => {
  assert.throws(() => exigirTextoEntre(42, 'nome', 3, 120), ErroDeDominio);
  assert.throws(() => exigirTextoEntre(undefined, 'nome', 3, 120), ErroDeDominio);
});

test('exigirTextoNaoVazio rejeita valor que não é string', () => {
  assert.throws(() => exigirTextoNaoVazio(42, 'id'), ErroDeDominio);
  assert.throws(() => exigirTextoNaoVazio(null, 'id'), ErroDeDominio);
});

test('exigirInteiroPositivo rejeita string, fração e NaN', () => {
  assert.throws(() => exigirInteiroPositivo('125000', 'valor'), ErroDeDominio);
  assert.throws(() => exigirInteiroPositivo(1250.5, 'valor'), ErroDeDominio);
  assert.throws(() => exigirInteiroPositivo(Number.NaN, 'valor'), ErroDeDominio);
});

test('o erro identifica o campo que falhou', () => {
  try {
    exigirTextoNaoVazio('', 'matricula');
    assert.fail('deveria ter lançado');
  } catch (e) {
    assert.ok(e instanceof ErroDeDominio);
    assert.equal(e.campo, 'matricula');
  }
});
