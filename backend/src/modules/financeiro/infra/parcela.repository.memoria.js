// @ts-check

/** @typedef {import('../domain/parcela.js').Parcela} Parcela */

/**
 * Adaptador de `ParcelaRepository` sobre uma lista em memória.
 *
 * @param {{ parcelas: Parcela[] }} dados
 */
export function criarParcelaRepositoryEmMemoria({ parcelas }) {
  /** @type {Map<string, Parcela[]>} */
  const porAlunoId = new Map();

  for (const p of parcelas) {
    const lista = porAlunoId.get(p.alunoId);
    if (lista) lista.push(p);
    else porAlunoId.set(p.alunoId, [p]);
  }
  for (const lista of porAlunoId.values()) {
    lista.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }

  return {
    /**
     * @param {string} alunoId
     * @returns {Promise<Parcela[]>}
     */
    async porAluno(alunoId) {
      // Cópia: o chamador não deve conseguir mutar o índice interno.
      return [...(porAlunoId.get(alunoId) ?? [])];
    },

    /**
     * Resolve vários alunos de uma vez.
     *
     * Existe para a ferramenta `listar_alunos` filtrar por situação financeira
     * sem disparar uma consulta por aluno (docs/02 §4). O mapa tem entrada para
     * **todo** id pedido, vazia quando não há parcelas: sem isso cada consumidor
     * precisaria de `?? []`, e quem esquecesse quebraria exatamente no aluno sem
     * parcelas — o caso 1 de docs/06 §3.
     *
     * @param {string[]} alunoIds
     * @returns {Promise<Map<string, Parcela[]>>}
     */
    async porAlunos(alunoIds) {
      return new Map(alunoIds.map((id) => [id, [...(porAlunoId.get(id) ?? [])]]));
    },
  };
}
