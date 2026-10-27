import { test } from 'node:test';
import assert from 'node:assert/strict';

import { lerConfig } from './config.js';
import { carregarSeed } from './seed.js';
import { montarCasosDeUso, selecionarProvider } from './dependencias.js';

const HOJE = '2026-10-26';
const overrides = { seed: carregarSeed(HOJE), relogio: () => HOJE };

test('sem chave configurada, usa o provider demonstrativo', () => {
  assert.equal(selecionarProvider(lerConfig({})).nome, 'demo');
});

test('com chave configurada, usa o provider da Anthropic', () => {
  const p = selecionarProvider(lerConfig({ ANTHROPIC_API_KEY: 'sk-ant-teste' }));
  assert.equal(p.nome, 'anthropic');
});

test('a aplicação monta nos dois modos sem exigir chave', () => {
  for (const env of [{}, { ANTHROPIC_API_KEY: 'sk-ant-teste' }]) {
    const casos = montarCasosDeUso(lerConfig(env), overrides);
    assert.equal(typeof casos.responderPergunta, 'function');
    assert.equal(typeof casos.listarAlunos, 'function');
  }
});

test('o modo relatado em health corresponde ao provider escolhido', () => {
  for (const [env, esperado] of [
    [{}, 'demo'],
    [{ ANTHROPIC_API_KEY: 'sk-ant-teste' }, 'anthropic'],
  ]) {
    const config = lerConfig(env);
    assert.equal(config.modoAssistente, esperado);
    assert.equal(selecionarProvider(config).nome, esperado);
  }
});

test('adaptador de persistência não implementado falha com mensagem clara', () => {
  assert.throws(
    () => montarCasosDeUso(lerConfig({ PERSISTENCIA: 'mysql' }), overrides),
    /mysql.*n[aã]o implementado/i,
  );
});
