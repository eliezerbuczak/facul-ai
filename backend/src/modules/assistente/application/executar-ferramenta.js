// @ts-check
import { LIMITE_DE_REGISTROS } from '../domain/ferramentas.js';

/**
 * @typedef {object} Chamada
 * @property {string} id         identificador da chamada, ecoado no resultado
 * @property {string} nome
 * @property {Record<string, any>} argumentos
 */

/** Recorte do aluno que vai para o contexto do modelo. */
const projetarAluno = (a) => ({
  id: a.id,
  nome: a.nome,
  matricula: a.matricula,
  curso: a.curso,
  status: a.status,
});

/**
 * Despacha uma chamada de ferramenta para o caso de uso correspondente.
 *
 * Falha vira **resultado de erro**, não exceção: o modelo precisa receber o
 * erro para poder se corrigir na volta seguinte. Lançar aqui derrubaria a
 * requisição inteira por causa de um argumento ruim.
 *
 * @param {any} casosDeUso
 */
export function criarExecutarFerramenta(casosDeUso) {
  const { listarAlunos, contarAlunos, obterFinanceiroDoAluno, alunoRepo } = casosDeUso;

  /** @param {Chamada} chamada */
  async function despachar({ nome, argumentos: arg }) {
    switch (nome) {
      case 'listar_alunos': {
        const { dados, total } = await listarAlunos({
          busca: arg.busca ?? undefined,
          status: arg.status ?? undefined,
          situacaoFinanceira: arg.situacaoFinanceira ?? undefined,
          pagina: 1,
          limite: Math.min(arg.limite ?? 20, LIMITE_DE_REGISTROS),
        });
        return {
          dados: { total, exibidos: dados.length, alunos: dados.map(projetarAluno) },
          fontes: dados.map((a) => ({ tipo: 'aluno', id: a.id })),
        };
      }

      case 'contar_alunos': {
        const total = await contarAlunos({
          status: arg.status ?? undefined,
          situacaoFinanceira: arg.situacaoFinanceira ?? undefined,
        });
        return { dados: { total }, fontes: [] };
      }

      case 'obter_aluno': {
        const termo = String(arg.matriculaOuNome ?? '');
        const porMatricula = await alunoRepo.porMatricula(termo);
        const aluno =
          porMatricula ?? (await alunoRepo.listar({ busca: termo, limite: 1 })).dados[0];

        if (!aluno) return { dados: { encontrado: false, termo }, fontes: [] };
        return {
          dados: { encontrado: true, aluno: projetarAluno(aluno) },
          fontes: [{ tipo: 'aluno', id: aluno.id }],
        };
      }

      case 'obter_financeiro': {
        const financeiro = await obterFinanceiroDoAluno(String(arg.alunoId));
        return { dados: financeiro, fontes: [{ tipo: 'aluno', id: financeiro.alunoId }] };
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${nome}`);
    }
  }

  /**
   * @param {Chamada} chamada
   * @returns {Promise<{ nome: string, bloco: any, fontes: any[] }>}
   */
  return async function executarFerramenta(chamada) {
    try {
      const { dados, fontes } = await despachar(chamada);
      return {
        nome: chamada.nome,
        fontes,
        bloco: {
          type: 'tool_result',
          tool_use_id: chamada.id,
          content: JSON.stringify(dados),
        },
      };
    } catch (erro) {
      return {
        nome: chamada.nome,
        fontes: [],
        bloco: {
          type: 'tool_result',
          tool_use_id: chamada.id,
          is_error: true,
          content:
            erro instanceof Error ? erro.message : 'Falha ao executar a ferramenta.',
        },
      };
    }
  };
}
