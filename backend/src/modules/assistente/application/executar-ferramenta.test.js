import {
  criarAlunoRepositoryEmMemoria,
  criarContarAlunos,
  criarListarAlunos,
} from '../../alunos/index.js';
import {
  criarObterFinanceiroDoAluno,
  criarParcelaRepositoryEmMemoria,
} from '../../financeiro/index.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { carregarSeed } from '../../../platform/seed.js';
import { criarExecutarFerramenta } from './executar-ferramenta.js';

const HOJE = '2026-10-26';
const HELENA = '578645ee-7789-4e1e-b7ab-7c9048037759';

function executar() {
  const seed = carregarSeed(HOJE);
  const base = {
    alunoRepo: criarAlunoRepositoryEmMemoria(seed),
    parcelaRepo: criarParcelaRepositoryEmMemoria(seed),
    relogio: () => HOJE,
  };
  return criarExecutarFerramenta({
    listarAlunos: criarListarAlunos(base),
    contarAlunos: criarContarAlunos(base),
    obterFinanceiroDoAluno: criarObterFinanceiroDoAluno(base),
    alunoRepo: base.alunoRepo,
  });
}

const chamada = (nome, argumentos = {}) => ({ id: 'tu_1', nome, argumentos });

test('listar_alunos devolve os alunos e registra as fontes', async () => {
  const r = await executar()(
    chamada('listar_alunos', { situacaoFinanceira: 'INADIMPLENTE' }),
  );
  const dados = JSON.parse(r.bloco.content);
  assert.equal(dados.alunos.length, 4);
  assert.equal(r.fontes.length, 4);
  assert.equal(r.fontes[0].tipo, 'aluno');
});

test('listar_alunos nunca excede o teto de registros', async () => {
  const r = await executar()(chamada('listar_alunos', { limite: 999 }));
  const dados = JSON.parse(r.bloco.content);
  assert.ok(dados.alunos.length <= 50);
});

test('contar_alunos devolve um número, não a lista inteira', async () => {
  const r = await executar()(chamada('contar_alunos', { status: 'ATIVO' }));
  const dados = JSON.parse(r.bloco.content);
  assert.equal(dados.total, 8);
  assert.equal('alunos' in dados, false);
});

test('obter_aluno encontra por matrícula', async () => {
  const r = await executar()(chamada('obter_aluno', { matriculaOuNome: '2023000094' }));
  assert.match(r.bloco.content, /Rafael Pinto/);
});

test('obter_aluno encontra por trecho de nome sem acento', async () => {
  const r = await executar()(chamada('obter_aluno', { matriculaOuNome: 'thais' }));
  assert.match(r.bloco.content, /Vasconcelos/);
});

test('obter_financeiro devolve situação e parcelas do aluno', async () => {
  const r = await executar()(chamada('obter_financeiro', { alunoId: HELENA }));
  const dados = JSON.parse(r.bloco.content);
  assert.equal(dados.situacao, 'ADIMPLENTE');
  assert.equal(dados.parcelas.length, 3);
});

test('o bloco de resultado tem a forma que a API de tool use espera', async () => {
  const r = await executar()(chamada('contar_alunos', {}));
  assert.equal(r.bloco.type, 'tool_result');
  assert.equal(r.bloco.tool_use_id, 'tu_1');
  assert.equal(typeof r.bloco.content, 'string');
});

test('ferramenta desconhecida vira resultado de erro, não exceção', async () => {
  // O modelo precisa receber o erro para poder se corrigir; lançar aqui
  // derrubaria a requisição inteira.
  const r = await executar()(chamada('deletar_tudo', {}));
  assert.equal(r.bloco.is_error, true);
  assert.match(r.bloco.content, /desconhecida/i);
});

test('falha dentro da ferramenta vira resultado de erro', async () => {
  const r = await executar()(
    chamada('obter_financeiro', { alunoId: '00000000-0000-4000-8000-000000000000' }),
  );
  assert.equal(r.bloco.is_error, true);
  assert.deepEqual(r.fontes, []);
});

test('obter_aluno sem correspondência informa ausência em vez de falhar', async () => {
  const r = await executar()(chamada('obter_aluno', { matriculaOuNome: 'zzzzz' }));
  const dados = JSON.parse(r.bloco.content);
  assert.equal(dados.encontrado, false);
});
