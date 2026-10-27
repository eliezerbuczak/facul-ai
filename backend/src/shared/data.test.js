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

import { deslocarDias } from './data.js';

test('deslocarDias soma dias para frente', () => {
  assert.equal(deslocarDias('2026-10-26', 5), '2026-10-31');
});

test('deslocarDias subtrai dias', () => {
  assert.equal(deslocarDias('2026-10-26', -26), '2026-09-30');
});

test('deslocarDias atravessa virada de mês e de ano', () => {
  assert.equal(deslocarDias('2026-12-30', 3), '2027-01-02');
  assert.equal(deslocarDias('2027-01-02', -3), '2026-12-30');
});

test('deslocarDias respeita ano bissexto', () => {
  assert.equal(deslocarDias('2028-02-28', 1), '2028-02-29');
  assert.equal(deslocarDias('2027-02-28', 1), '2027-03-01');
});

test('deslocarDias com zero devolve a mesma data', () => {
  assert.equal(deslocarDias('2026-10-26', 0), '2026-10-26');
});
