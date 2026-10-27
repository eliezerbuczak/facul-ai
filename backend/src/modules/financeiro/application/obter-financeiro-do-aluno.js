// @ts-check
import { alunoNaoEncontrado } from '../../../shared/erros.js';
import { resumirFinanceiro } from '../domain/resumo.js';

/**
 * @param {{ alunoRepo: any, parcelaRepo: any, relogio: () => string }} deps
 */
export function criarObterFinanceiroDoAluno({ alunoRepo, parcelaRepo, relogio }) {
  /**
   * A existência do aluno é verificada antes: sem isso, um id inexistente
   * devolveria um financeiro vazio e adimplente — tecnicamente correto pela
   * regra, e completamente enganoso.
   *
   * @param {string} alunoId
   * @throws {import('../../../shared/erros.js').ErroDeAplicacao} 404
   */
  return async function obterFinanceiroDoAluno(alunoId) {
    const aluno = await alunoRepo.porId(alunoId);
    if (!aluno) throw alunoNaoEncontrado();

    const parcelas = await parcelaRepo.porAluno(alunoId);
    return { alunoId, ...resumirFinanceiro(parcelas, relogio()) };
  };
}
