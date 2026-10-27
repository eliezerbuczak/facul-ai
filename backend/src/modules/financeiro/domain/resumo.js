// @ts-check
import { estaQuitada, situacaoDaParcela } from './parcela.js';
import { calcularSituacao } from './situacao-financeira.js';

/** @typedef {import('./parcela.js').Parcela} Parcela */

/**
 * Saldo ainda devido de uma parcela, em centavos.
 *
 * Desconta o que já foi pago, então um pagamento parcial deixa em aberto só a
 * diferença. Nunca negativo: pagar acima do devido não vira crédito aqui.
 *
 * @param {Parcela} parcela
 * @returns {number}
 */
function saldoCentavos(parcela) {
  return Math.max(0, parcela.valorCentavos - (parcela.valorPagoCentavos ?? 0));
}

/**
 * Visão financeira completa de um aluno na data de referência.
 *
 * `referencia` entra na resposta de propósito: a situação é função de uma data,
 * e devolver essa data torna o veredito conferível à mão. Sem ela, "por que
 * esse aluno está inadimplente?" vira sessão de depuração (docs/04 §5).
 *
 * `totalEmAbertoCentavos` e `totalVencidoCentavos` são grandezas distintas.
 * Somar tudo o que não foi pago e chamar de "vencido" infla a dívida com
 * parcelas que ainda nem venceram — uma das confusões que levam ao item 4.
 *
 * @param {Parcela[]} parcelas
 * @param {string} hoje  'YYYY-MM-DD'
 */
export function resumirFinanceiro(parcelas, hoje) {
  const comSituacao = parcelas.map((p) => ({
    ...p,
    situacao: situacaoDaParcela(p, hoje),
  }));

  const vencidas = comSituacao.filter((p) => p.situacao === 'VENCIDA');
  const aVencer = comSituacao.filter((p) => p.situacao === 'A_VENCER');
  const emAberto = comSituacao.filter((p) => !estaQuitada(p));

  const somar = (lista) => lista.reduce((total, p) => total + saldoCentavos(p), 0);

  return {
    situacao: calcularSituacao(parcelas, hoje),
    referencia: hoje,
    resumo: {
      totalParcelas: comSituacao.length,
      parcelasPagas: comSituacao.length - emAberto.length,
      parcelasVencidas: vencidas.length,
      parcelasAVencer: aVencer.length,
      totalEmAbertoCentavos: somar(emAberto),
      totalVencidoCentavos: somar(vencidas),
    },
    parcelas: comSituacao,
  };
}
