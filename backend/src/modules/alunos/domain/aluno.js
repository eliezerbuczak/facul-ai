// @ts-check
import { ErroDeDominio } from '../../../shared/erros.js';
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

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MATRICULA = /^\d{10}$/;
const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {unknown} valor
 * @param {string} campo
 * @param {number} min
 * @param {number} max
 */
function exigirTextoEntre(valor, campo, min, max) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (texto.length < min || texto.length > max) {
    throw new ErroDeDominio(`${campo} deve ter entre ${min} e ${max} caracteres.`, {
      campo,
    });
  }
}

/**
 * @param {unknown} valor
 * @param {string} campo
 * @param {RegExp} formato
 * @param {string} exemplo
 */
function exigirFormato(valor, campo, formato, exemplo) {
  if (typeof valor !== 'string' || !formato.test(valor)) {
    throw new ErroDeDominio(`${campo} deve estar no formato ${exemplo}.`, { campo });
  }
}

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

  exigirFormato(id, 'id', UUID_V4, 'UUID v4');
  exigirTextoEntre(nome, 'nome', 3, 120);
  exigirFormato(matricula, 'matricula', MATRICULA, 'dez dígitos');
  exigirTextoEntre(curso, 'curso', 3, 120);
  exigirFormato(ingressoEm, 'ingressoEm', ISO_DATA, 'YYYY-MM-DD');

  if (!ehStatusValido(status)) {
    throw new ErroDeDominio(`status deve ser um de: ${STATUS_VALIDOS.join(', ')}.`, {
      campo: 'status',
    });
  }

  return Object.freeze({ id, nome, matricula, curso, status, ingressoEm });
}
