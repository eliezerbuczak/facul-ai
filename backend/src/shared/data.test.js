import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hojeEm } from './data.js';

test('devolve a data no fuso informado, não em UTC', () => {
  // 23h30 do dia 26 em Brasília já é dia 27 em UTC.
  const agora = new Date('2026-10-27T02:30:00Z');
  assert.equal(hojeEm('America/Sao_Paulo', agora), '2026-10-26');
});

test('devolve a data correta no meio do dia', () => {
  const agora = new Date('2026-10-26T15:00:00Z');
  assert.equal(hojeEm('America/Sao_Paulo', agora), '2026-10-26');
});

test('usa America/Sao_Paulo como fuso padrão', () => {
  const agora = new Date('2026-10-27T02:30:00Z');
  assert.equal(hojeEm(undefined, agora), '2026-10-26');
});

test('formata mês e dia com dois dígitos', () => {
  const agora = new Date('2026-03-05T15:00:00Z');
  assert.equal(hojeEm('America/Sao_Paulo', agora), '2026-03-05');
});
