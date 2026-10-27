// @ts-check
import { ErroDeDominio } from '../../../shared/erros.js';
import { FORMATO, exigirFormato, exigirTextoEntre } from '../../../shared/validacao.js';
import { STATUS_VALIDOS, ehStatusValido } from './status-academico.js';

/** @typedef {import('./status-academico.js').StatusAcademico} StatusAcademico */

/**
 * @typedef {object} Aluno
 * @property {string} id           UUID v4
 * @property {string} nome
 * @property {string} matricula    dez dígitos: ano de ingresso + sequencial
 * @property {string} curso
 * @property {StatusAcademico} status
 * @property {string} ingressoEm   'YYYY-MM-DD'
 */

const MATRICULA = /^\d{10}$/;

/**
 * Constrói um aluno válido e imutável.
 *
 * Não há validação de "ingresso não pode ser futuro": essa checagem exige uma
 * data de referência, e um construtor que lê o relógio por conta própria é a
 * mesma dependência oculta que produziu o bug do item 4. Validação temporal
 * pertence a onde a data de referência é explícita (ADR 0006, docs/03 §1).
 *
 * @param {Aluno} dados
 * @returns {Aluno}
 * @throws {ErroDeDominio}
 */
export function criarAluno(dados) {
  const { id, nome, matricula, curso, status, ingressoEm } = dados;

  exigirFormato(id, 'id', FORMATO.UUID_V4, 'UUID v4');
  exigirTextoEntre(nome, 'nome', 3, 120);
  exigirFormato(matricula, 'matricula', MATRICULA, 'dez dígitos');
  exigirTextoEntre(curso, 'curso', 3, 120);
  exigirFormato(ingressoEm, 'ingressoEm', FORMATO.DATA_ISO, 'YYYY-MM-DD');

  if (!ehStatusValido(status)) {
    throw new ErroDeDominio(`status deve ser um de: ${STATUS_VALIDOS.join(', ')}.`, {
      campo: 'status',
    });
  }

  return Object.freeze({ id, nome, matricula, curso, status, ingressoEm });
}
