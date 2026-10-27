// @ts-check
import { iaRespostaInvalida } from '../../../shared/erros.js';
import { FERRAMENTAS } from '../domain/ferramentas.js';

/**
 * Teto de idas e voltas ao provider. Sem ele, uma decisão ruim vira laço
 * infinito com custo por iteração.
 */
const MAX_VOLTAS = 5;

const MAIUSCULA_INICIAL = /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]/u;

/**
 * Heurística: a resposta afirma algum **dado**?
 *
 * Número e nome próprio são o que não se produz sem consultar a base. Uma
 * saudação ou um pedido de esclarecimento não afirmam dado nenhum e podem
 * passar sem ferramenta; uma frase com valor ou nome, não.
 *
 * Nome próprio é detectado como palavra capitalizada que **não** inicia frase —
 * a primeira palavra de toda frase é capitalizada e não diz nada.
 *
 * @param {string} texto
 * @returns {boolean}
 */
export function pareceAfirmacaoFactual(texto) {
  if (/\d/.test(texto)) return true;
  return texto.split(/[.!?]+\s+/).some((frase) =>
    frase
      .trim()
      .split(/\s+/)
      .slice(1)
      .some((palavra) => MAIUSCULA_INICIAL.test(palavra)),
  );
}

/**
 * @param {string} pergunta
 * @param {string|null|undefined} alunoId
 */
function montarPrimeiroTurno(pergunta, alunoId) {
  const foco = alunoId
    ? `\n\nO aluno em foco na interface tem id ${alunoId}. ` +
      'Use as ferramentas para obter os dados dele; o id sozinho não é dado.'
    : '';
  return [{ type: 'text', text: pergunta + foco }];
}

/**
 * Executa o laço de tool use até o provider produzir uma resposta final.
 *
 * O laço é o mesmo para o provider real e para o demonstrativo — é essa
 * partilha que faz o modo demo exercitar o código de produção em vez de ser
 * uma fachada (ADR 0005). O que muda entre os dois é unicamente quem produz
 * a `Decisao`.
 *
 * @param {{ provider: any, executarFerramenta: (c: any) => Promise<any> }} deps
 */
export function criarResponderPergunta({ provider, executarFerramenta }) {
  /**
   * @param {{ pergunta: string, alunoId?: string|null }} entrada
   */
  return async function responderPergunta({ pergunta, alunoId }) {
    const mensagens = [{ role: 'user', content: montarPrimeiroTurno(pergunta, alunoId) }];
    /** @type {string[]} */
    const ferramentasUsadas = [];
    /** @type {Map<string, any>} */
    const fontes = new Map();

    for (let volta = 0; volta < MAX_VOLTAS; volta++) {
      const decisao = await provider.decidir({ mensagens, ferramentas: FERRAMENTAS });

      if (decisao.tipo === 'resposta') {
        // Barreira 3 de docs/05 §5: resposta factual sem nenhuma ferramenta
        // usada é, por construção, resposta sem fonte. Não chega ao usuário.
        if (ferramentasUsadas.length === 0 && pareceAfirmacaoFactual(decisao.texto)) {
          throw iaRespostaInvalida('O assistente respondeu sem consultar os dados.');
        }
        return {
          resposta: decisao.texto,
          modo: provider.nome,
          ferramentasUsadas,
          fontes: [...fontes.values()],
        };
      }

      // O conteúdo bruto volta inteiro: os blocos tool_use precisam retornar
      // na íntegra, ou a requisição seguinte é rejeitada.
      mensagens.push({ role: 'assistant', content: decisao.conteudoBruto });

      const resultados = await Promise.all(decisao.chamadas.map(executarFerramenta));
      for (const r of resultados) {
        ferramentasUsadas.push(r.nome);
        for (const f of r.fontes) fontes.set(`${f.tipo}:${f.id}`, f);
      }

      // Todos os tool_result em UM único turno de usuário.
      mensagens.push({ role: 'user', content: resultados.map((r) => r.bloco) });
    }

    throw iaRespostaInvalida(
      `O assistente não concluiu a resposta em ${MAX_VOLTAS} consultas.`,
    );
  };
}
