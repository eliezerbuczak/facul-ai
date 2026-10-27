// @ts-check
import { calcularSituacao } from '../../financeiro/index.js';

/** @typedef {import('../domain/aluno.js').Aluno} Aluno */

/**
 * @typedef {object} FiltroListagem
 * @property {string} [busca]
 * @property {string} [status]
 * @property {'ADIMPLENTE'|'INADIMPLENTE'} [situacaoFinanceira]
 * @property {number} [pagina]
 * @property {number} [limite]
 */

const LIMITE_PADRAO = 20;

/**
 * @param {{ alunoRepo: any, parcelaRepo: any, relogio: () => string }} deps
 */
export function criarListarAlunos({ alunoRepo, parcelaRepo, relogio }) {
  /**
   * @param {FiltroListagem} [filtro]
   * @returns {Promise<{ dados: Aluno[], total: number }>}
   */
  return async function listarAlunos(filtro = {}) {
    const { situacaoFinanceira, pagina = 1, limite = LIMITE_PADRAO } = filtro;

    // Sem filtro derivado, o repositório resolve busca, status e paginação.
    if (!situacaoFinanceira) {
      return alunoRepo.listar(filtro);
    }

    // Com filtro derivado, a paginação precisa acontecer DEPOIS do cálculo:
    // a situação não existe no armazenamento, então não há como o repositório
    // filtrar por ela. Paginar antes devolveria menos itens que o limite e um
    // total errado.
    //
    // Busca todos os candidatos de uma vez e resolve as parcelas em lote —
    // é para isso que `porAlunos` existe (docs/02 §4). Adequado à escala deste
    // conjunto; com volume alto, o filtro desceria para o adaptador MySQL.
    const { dados: candidatos } = await alunoRepo.listar({
      busca: filtro.busca,
      status: filtro.status,
      pagina: 1,
      limite: Number.MAX_SAFE_INTEGER,
    });

    const hoje = relogio();
    const parcelasPorAluno = await parcelaRepo.porAlunos(candidatos.map((a) => a.id));
    const filtrados = candidatos.filter(
      (a) => calcularSituacao(parcelasPorAluno.get(a.id), hoje) === situacaoFinanceira,
    );

    const inicio = (pagina - 1) * limite;
    return { dados: filtrados.slice(inicio, inicio + limite), total: filtrados.length };
  };
}
