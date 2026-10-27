// @ts-check
import { criarListarAlunos } from './listar-alunos.js';

/**
 * Conta alunos que satisfazem o filtro.
 *
 * Existe como caso de uso próprio porque a pergunta "quantos alunos estão com
 * matrícula ativa?" é uma agregação. Sem ela, o assistente listaria todos e
 * contaria no texto — mais caro e errado quando a lista passa da paginação
 * (docs/05 §2).
 *
 * @param {{ alunoRepo: any, parcelaRepo: any, relogio: () => string }} deps
 */
export function criarContarAlunos(deps) {
  const listar = criarListarAlunos(deps);

  /**
   * @param {import('./listar-alunos.js').FiltroListagem} [filtro]
   * @returns {Promise<number>}
   */
  return async function contarAlunos(filtro = {}) {
    if (!filtro.situacaoFinanceira) return deps.alunoRepo.contar(filtro);
    // Situação é derivada: só dá para contar calculando.
    return (await listar({ ...filtro, pagina: 1, limite: Number.MAX_SAFE_INTEGER }))
      .total;
  };
}
