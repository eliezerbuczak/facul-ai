import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ErroDeDominio } from '../../../shared/erros.js';
import { criarAluno } from './aluno.js';

const VALIDO = {
  id: '3f2a1c4e-8b7d-4a2f-9e15-6c0d8a3b7e91',
  nome: 'Helena Marques',
  matricula: '2024000137',
  curso: 'Engenharia de Software',
  status: 'ATIVO',
  ingressoEm: '2024-02-19',
};

test('constrói um aluno válido e imutável', () => {
  const aluno = criarAluno(VALIDO);
  assert.equal(aluno.nome, 'Helena Marques');
  assert.throws(() => {
    aluno.nome = 'outro';
  }, TypeError);
});

test('id precisa ser UUID v4', () => {
  assert.throws(() => criarAluno({ ...VALIDO, id: 'aluno-1' }), ErroDeDominio);
  assert.throws(() => criarAluno({ ...VALIDO, id: '' }), ErroDeDominio);
});

test('nome precisa ter entre 3 e 120 caracteres', () => {
  assert.throws(() => criarAluno({ ...VALIDO, nome: 'Ab' }), ErroDeDominio);
  assert.throws(() => criarAluno({ ...VALIDO, nome: '   ' }), ErroDeDominio);
  assert.throws(() => criarAluno({ ...VALIDO, nome: 'x'.repeat(121) }), ErroDeDominio);
});

test('matrícula precisa ter dez dígitos', () => {
  assert.throws(() => criarAluno({ ...VALIDO, matricula: '123' }), ErroDeDominio);
  assert.throws(() => criarAluno({ ...VALIDO, matricula: '2024-000137' }), ErroDeDominio);
  assert.throws(() => criarAluno({ ...VALIDO, matricula: '20240001370' }), ErroDeDominio);
});

test('curso precisa ter entre 3 e 120 caracteres', () => {
  assert.throws(() => criarAluno({ ...VALIDO, curso: 'TI' }), ErroDeDominio);
  assert.throws(() => criarAluno({ ...VALIDO, curso: 'x'.repeat(121) }), ErroDeDominio);
});

test('status precisa pertencer ao domínio acadêmico', () => {
  assert.throws(() => criarAluno({ ...VALIDO, status: 'ativo' }), ErroDeDominio);
  assert.throws(() => criarAluno({ ...VALIDO, status: 'INADIMPLENTE' }), ErroDeDominio);
});

test('data de ingresso precisa estar no formato YYYY-MM-DD', () => {
  assert.throws(() => criarAluno({ ...VALIDO, ingressoEm: '19/02/2024' }), ErroDeDominio);
});

test('o aluno não carrega situação financeira', () => {
  // ADR 0006: situação é derivada das parcelas, nunca um campo da entidade.
  const aluno = criarAluno(VALIDO);
  assert.equal('situacao' in aluno, false);
  assert.equal('situacaoFinanceira' in aluno, false);
});
