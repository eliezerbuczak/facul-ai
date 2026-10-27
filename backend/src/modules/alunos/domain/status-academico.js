// @ts-check

/**
 * Status **acadêmico** da matrícula.
 *
 * Não tem relação com adimplência. Um aluno CANCELADO pode ter parcelas
 * vencidas em aberto; um ATIVO pode estar em dia. Manter os dois conceitos
 * separados é parte da prevenção do bug do item 4 (docs/03 §1, docs/06 §2).
 */
export const STATUS_ACADEMICO = Object.freeze({
  ATIVO: 'ATIVO',
  TRANCADO: 'TRANCADO',
  CANCELADO: 'CANCELADO',
  FORMADO: 'FORMADO',
});

/** @typedef {keyof typeof STATUS_ACADEMICO} StatusAcademico */

export const STATUS_VALIDOS = Object.freeze(Object.values(STATUS_ACADEMICO));

/**
 * @param {unknown} valor
 * @returns {boolean}
 */
export function ehStatusValido(valor) {
  return typeof valor === 'string' && STATUS_VALIDOS.includes(valor);
}
