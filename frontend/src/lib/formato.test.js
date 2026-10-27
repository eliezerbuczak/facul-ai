import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatarData, formatarReais, rotuloSituacao } from './formato.js';

test('formata centavos como moeda brasileira', () => {
  assert.equal(formatarReais(125_000), 'R$ 1.250,00');
  assert.equal(formatarReais(0), 'R$ 0,00');
  assert.equal(formatarReais(99), 'R$ 0,99');
});

test('formata data ISO sem deslocar o dia', () => {
  // new Date('2026-10-26') é meia-noite UTC — formatar por lá devolveria 25/10
  // em Brasília. É a mesma armadilha do item 4, agora no front.
  assert.equal(formatarData('2026-10-26'), '26/10/2026');
  assert.equal(formatarData('2026-01-01'), '01/01/2026');
  assert.equal(formatarData('2026-12-31'), '31/12/2026');
});

test('rótulo de situação é legível, não o enum cru', () => {
  assert.equal(rotuloSituacao('A_VENCER'), 'A vencer');
  assert.equal(rotuloSituacao('VENCIDA'), 'Vencida');
  assert.equal(rotuloSituacao('PAGA'), 'Paga');
});

test('situação desconhecida não quebra a tela', () => {
  assert.equal(rotuloSituacao('XPTO'), 'XPTO');
});
