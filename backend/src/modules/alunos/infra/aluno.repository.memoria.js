// @ts-check
import { normalizarParaBusca } from '../../../shared/texto.js';

/** @typedef {import('../domain/aluno.js').Aluno} Aluno */

/**
 * @typedef {object} FiltroAluno
 * @property {string} [busca]    trecho de nome ou matrícula
 * @property {string} [status]   status acadêmico
 * @property {number} [pagina]   1-indexada
 * @property {number} [limite]
 */

const LIMITE_PADRAO = 20;

/**
 * Adaptador de `AlunoRepository` sobre uma lista em memória.
 *
 * Os dados chegam por parâmetro em vez de serem lidos do disco aqui dentro:
 * é o que permite testar com uma lista pequena e montada à mão, sem depender
 * do seed real.
 *
 * @param {{ alunos: Aluno[] }} dados
 */
export function criarAlunoRepositoryEmMemoria({ alunos }) {
  // Cada aluno carrega a própria chave de busca já normalizada: evita
  // normalizar doze nomes a cada consulta, e evita um lookup que o verificador
  // de tipos obrigaria a tratar como possivelmente ausente — ramo que nunca
  // ocorreria e que não haveria como cobrir em teste.
  const indexados = [...alunos]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((aluno) => ({
      aluno,
      chave: normalizarParaBusca(`${aluno.nome} ${aluno.matricula}`),
    }));

  const porId = new Map(indexados.map(({ aluno }) => [aluno.id, aluno]));
  const porMatricula = new Map(indexados.map(({ aluno }) => [aluno.matricula, aluno]));

  /** @param {FiltroAluno} filtro */
  function filtrar({ busca, status }) {
    let resultado = indexados;
    if (status) resultado = resultado.filter(({ aluno }) => aluno.status === status);
    if (busca) {
      const alvo = normalizarParaBusca(busca);
      resultado = resultado.filter(({ chave }) => chave.includes(alvo));
    }
    return resultado.map(({ aluno }) => aluno);
  }

  return {
    /**
     * @param {FiltroAluno} [filtro]
     * @returns {Promise<{ dados: Aluno[], total: number }>}
     */
    async listar(filtro = {}) {
      const { pagina = 1, limite = LIMITE_PADRAO } = filtro;
      const encontrados = filtrar(filtro);
      const inicio = (pagina - 1) * limite;
      // `total` é o tamanho antes da paginação — é o que a resposta da API
      // precisa para calcular totalPaginas (docs/04 §3).
      return {
        dados: encontrados.slice(inicio, inicio + limite),
        total: encontrados.length,
      };
    },

    /**
     * @param {string} id
     * @returns {Promise<Aluno|null>}
     */
    async porId(id) {
      return porId.get(id) ?? null;
    },

    /**
     * @param {string} matricula
     * @returns {Promise<Aluno|null>}
     */
    async porMatricula(matricula) {
      return porMatricula.get(matricula) ?? null;
    },

    /**
     * @param {FiltroAluno} [filtro]
     * @returns {Promise<number>}
     */
    async contar(filtro = {}) {
      return filtrar(filtro).length;
    },
  };
}
