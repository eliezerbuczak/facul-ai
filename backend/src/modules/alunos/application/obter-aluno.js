// @ts-check
import { alunoNaoEncontrado } from '../../../shared/erros.js';

/** @param {{ alunoRepo: any }} deps */
export function criarObterAluno({ alunoRepo }) {
  /**
   * @param {string} id
   * @returns {Promise<import('../domain/aluno.js').Aluno>}
   * @throws {import('../../../shared/erros.js').ErroDeAplicacao} 404
   */
  return async function obterAluno(id) {
    const aluno = await alunoRepo.porId(id);
    if (!aluno) throw alunoNaoEncontrado();
    return aluno;
  };
}
