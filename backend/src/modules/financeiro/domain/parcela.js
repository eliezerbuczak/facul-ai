// @ts-check
import { ErroDeDominio } from '../../../shared/erros.js';
import {
  FORMATO,
  exigirFormato,
  exigirInteiroPositivo,
  exigirTextoNaoVazio,
} from '../../../shared/validacao.js';

/** @typedef {'PAGA'|'VENCIDA'|'A_VENCER'} SituacaoParcela */

/**
 * @typedef {object} Parcela
 * @property {string} id
 * @property {string} alunoId
 * @property {string} competencia        mês de referência, 'YYYY-MM'
 * @property {number} valorCentavos      inteiro em centavos, maior que zero
 * @property {string} vencimento         'YYYY-MM-DD'
 * @property {string|null} pagoEm        'YYYY-MM-DD' ou null quando em aberto
 * @property {number|null} valorPagoCentavos
 */

const ISO_COMPETENCIA = /^\d{4}-\d{2}$/;

/**
 * Constrói uma parcela válida e imutável.
 *
 * A invariante que importa: `pagoEm` e `valorPagoCentavos` são preenchidos
 * juntos ou nenhum dos dois. Um sem o outro é o estado inconsistente que
 * alimenta a causa-raiz C de docs/06 §2, e por isso é barrado aqui e também
 * por CHECK no banco (docs/03 §3) — defesa em profundidade.
 *
 * @param {Parcela} dados
 * @returns {Parcela}
 * @throws {ErroDeDominio}
 */
export function criarParcela(dados) {
  const {
    id,
    alunoId,
    competencia,
    valorCentavos,
    vencimento,
    pagoEm = null,
    valorPagoCentavos = null,
  } = dados;

  exigirTextoNaoVazio(id, 'id');
  exigirTextoNaoVazio(alunoId, 'alunoId');
  exigirFormato(competencia, 'competencia', ISO_COMPETENCIA, 'YYYY-MM');
  exigirFormato(vencimento, 'vencimento', FORMATO.DATA_ISO, 'YYYY-MM-DD');
  exigirInteiroPositivo(valorCentavos, 'valorCentavos');

  if (pagoEm === null && valorPagoCentavos !== null) {
    throw new ErroDeDominio('valorPagoCentavos exige pagoEm preenchido.', {
      campo: 'pagoEm',
    });
  }
  if (pagoEm !== null) {
    exigirFormato(pagoEm, 'pagoEm', FORMATO.DATA_ISO, 'YYYY-MM-DD');
    if (valorPagoCentavos === null) {
      throw new ErroDeDominio('pagoEm exige valorPagoCentavos preenchido.', {
        campo: 'valorPagoCentavos',
      });
    }
    exigirInteiroPositivo(valorPagoCentavos, 'valorPagoCentavos');
  }

  return Object.freeze({
    id,
    alunoId,
    competencia,
    valorCentavos,
    vencimento,
    pagoEm,
    valorPagoCentavos,
  });
}

/**
 * Uma parcela só está quitada quando o pagamento cobre o valor devido.
 *
 * `pagoEm` preenchido não basta: um pagamento parcial registra a data e deixa
 * saldo em aberto. Tratar isso como quitação é a causa-raiz C de docs/06 §2.
 *
 * Não se olha se `pagoEm` é posterior ao vencimento. Atraso é fato histórico;
 * a pergunta respondida aqui é se há saldo em aberto hoje (caso 5).
 *
 * @param {Parcela} parcela
 * @returns {boolean}
 */
export function estaQuitada(parcela) {
  if (parcela.pagoEm === null || parcela.valorPagoCentavos === null) return false;
  return parcela.valorPagoCentavos >= parcela.valorCentavos;
}

/**
 * Situação de uma parcela na data de referência.
 *
 * O `<` é estrito de propósito: uma parcela que vence hoje ainda não venceu.
 *
 * @param {Parcela} parcela
 * @param {string} hoje  data de referência, 'YYYY-MM-DD'
 * @returns {SituacaoParcela}
 */
export function situacaoDaParcela(parcela, hoje) {
  if (estaQuitada(parcela)) return 'PAGA';
  return parcela.vencimento < hoje ? 'VENCIDA' : 'A_VENCER';
}
