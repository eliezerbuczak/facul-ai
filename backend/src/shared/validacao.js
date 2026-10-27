// @ts-check
import { ErroDeDominio } from './erros.js';

/** Formatos genéricos, reusados por mais de um domínio. */
export const FORMATO = Object.freeze({
  DATA_ISO: /^\d{4}-\d{2}-\d{2}$/,
  UUID_V4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
});

/**
 * @param {unknown} valor
 * @param {string} campo
 * @param {RegExp} formato
 * @param {string} exemplo  descrição legível do formato esperado
 * @throws {ErroDeDominio}
 */
export function exigirFormato(valor, campo, formato, exemplo) {
  if (typeof valor !== 'string' || !formato.test(valor)) {
    throw new ErroDeDominio(`${campo} deve estar no formato ${exemplo}.`, { campo });
  }
}

/**
 * Comprimento medido após `trim`: um nome só de espaços é vazio.
 *
 * @param {unknown} valor
 * @param {string} campo
 * @param {number} min
 * @param {number} max
 * @throws {ErroDeDominio}
 */
export function exigirTextoEntre(valor, campo, min, max) {
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
 * @throws {ErroDeDominio}
 */
export function exigirTextoNaoVazio(valor, campo) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ErroDeDominio(`${campo} deve ser um texto não vazio.`, { campo });
  }
}

/**
 * Valores monetários são inteiros em centavos — fracionário é erro de unidade.
 *
 * @param {unknown} valor
 * @param {string} campo
 * @throws {ErroDeDominio}
 */
export function exigirInteiroPositivo(valor, campo) {
  if (!Number.isInteger(valor) || /** @type {number} */ (valor) <= 0) {
    throw new ErroDeDominio(`${campo} deve ser um inteiro maior que zero.`, { campo });
  }
}
