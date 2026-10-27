import { test } from 'node:test';
import assert from 'node:assert/strict';

import { lerConfig } from './config.js';

test('ambiente vazio produz uma configuração utilizável', () => {
  const c = lerConfig({});
  assert.equal(c.porta, 3000);
  assert.equal(c.persistencia, 'memoria');
  assert.equal(c.corsOrigin, 'http://localhost:5173');
});

test('sem ANTHROPIC_API_KEY o assistente entra em modo demonstrativo', () => {
  assert.equal(lerConfig({}).modoAssistente, 'demo');
  assert.equal(lerConfig({ ANTHROPIC_API_KEY: '' }).modoAssistente, 'demo');
  assert.equal(lerConfig({ ANTHROPIC_API_KEY: '   ' }).modoAssistente, 'demo');
});

test('com chave presente o assistente entra em modo real', () => {
  assert.equal(
    lerConfig({ ANTHROPIC_API_KEY: 'sk-ant-xxx' }).modoAssistente,
    'anthropic',
  );
});

test('PORT chega como texto e sai como número', () => {
  assert.equal(lerConfig({ PORT: '8080' }).porta, 8080);
});

test('PORT inválida falha na inicialização, não em tempo de requisição', () => {
  assert.throws(() => lerConfig({ PORT: 'oitenta' }), /PORT/);
  assert.throws(() => lerConfig({ PORT: '0' }), /PORT/);
});

test('PERSISTENCIA fora do conjunto é rejeitada com as opções na mensagem', () => {
  assert.throws(() => lerConfig({ PERSISTENCIA: 'postgres' }), /memoria.*mysql/s);
});

test('a configuração é imutável', () => {
  const c = lerConfig({});
  assert.throws(() => {
    c.porta = 1;
  }, TypeError);
});

test('a chave da API nunca aparece na configuração serializada', () => {
  // Config vai para log de diagnóstico em algumas situações; a chave não pode ir junto.
  const c = lerConfig({ ANTHROPIC_API_KEY: 'sk-ant-segredo' });
  assert.equal(JSON.stringify(c).includes('sk-ant-segredo'), false);
});
