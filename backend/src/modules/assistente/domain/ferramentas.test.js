import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FERRAMENTAS, LIMITE_DE_REGISTROS } from './ferramentas.js';

test('expõe exatamente as quatro ferramentas de consulta', () => {
  assert.deepEqual(FERRAMENTAS.map((f) => f.name).sort(), [
    'contar_alunos',
    'listar_alunos',
    'obter_aluno',
    'obter_financeiro',
  ]);
});

test('toda ferramenta descreve quando deve ser usada, não só o que faz', () => {
  // Descrição prescritiva eleva a taxa de acerto na escolha da ferramenta.
  for (const f of FERRAMENTAS) {
    assert.ok(f.description.length > 80, `${f.name}: descrição curta demais`);
    assert.match(f.description, /[Uu]se (esta ferramenta )?quando/, f.name);
  }
});

test('os schemas são estritos — strict exige required completo e sem extras', () => {
  for (const f of FERRAMENTAS) {
    assert.equal(f.strict, true, f.name);
    assert.equal(f.input_schema.additionalProperties, false, f.name);
    assert.deepEqual(
      [...f.input_schema.required].sort(),
      Object.keys(f.input_schema.properties).sort(),
      `${f.name}: strict exige todas as propriedades em required`,
    );
  }
});

test('parâmetros opcionais se expressam aceitando null, não ficando fora de required', () => {
  const listar = FERRAMENTAS.find((f) => f.name === 'listar_alunos');
  assert.ok(listar.input_schema.properties.status.type.includes('null'));
});

test('há um teto de registros por consulta', () => {
  assert.equal(typeof LIMITE_DE_REGISTROS, 'number');
  assert.ok(LIMITE_DE_REGISTROS <= 50);
});
