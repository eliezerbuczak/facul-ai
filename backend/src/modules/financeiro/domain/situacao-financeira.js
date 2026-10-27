// @ts-check
import { situacaoDaParcela } from './parcela.js';

/** @typedef {import('./parcela.js').Parcela} Parcela */
/** @typedef {'ADIMPLENTE'|'INADIMPLENTE'} SituacaoFinanceira */

export const ADIMPLENTE = /** @type {const} */ ('ADIMPLENTE');
export const INADIMPLENTE = /** @type {const} */ ('INADIMPLENTE');

/**
 * Situação financeira do aluno na data de referência.
 *
 * Função pura: `hoje` é parâmetro, não `new Date()` lido aqui dentro. É isso que
 * permite testar os casos de borda de data sem mocar relógio, e que impede o
 * valor de ser persistido e dessincronizar (docs/06 §2, ADR 0006).
 *
 * Basta uma parcela vencida. Conjunto vazio é adimplente.
 *
 * @param {Parcela[]} parcelas
 * @param {string} hoje  'YYYY-MM-DD'
 * @returns {SituacaoFinanceira}
 */
export function calcularSituacao(parcelas, hoje) {
  const temVencida = parcelas.some((p) => situacaoDaParcela(p, hoje) === 'VENCIDA');
  return temVencida ? INADIMPLENTE : ADIMPLENTE;
}
