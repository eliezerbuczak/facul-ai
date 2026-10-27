// @ts-check

/**
 * Violação de uma regra do domínio.
 *
 * Lançado pelos construtores de entidade quando os dados recebidos não podem
 * formar um objeto válido. A camada HTTP traduz para `400 REQUISICAO_INVALIDA`
 * (docs/04 §1); o domínio não conhece códigos de status.
 */
export class ErroDeDominio extends Error {
  /**
   * @param {string} mensagem
   * @param {{ campo?: string }} [detalhes]
   */
  constructor(mensagem, detalhes = {}) {
    super(mensagem);
    this.name = 'ErroDeDominio';
    /** @type {string|undefined} */
    this.campo = detalhes.campo;
  }
}

/**
 * Falha prevista de um caso de uso, já com o código e o status que a API deve
 * devolver.
 *
 * Separado de `ErroDeDominio` porque são coisas diferentes: domínio é "estes
 * dados não formam uma entidade válida" (vira 400); aplicação é "a operação
 * não pôde ser concluída" e carrega o status apropriado para cada motivo.
 *
 * O catálogo de códigos está em docs/04 §1. `codigo` é estável e feito para o
 * cliente ramificar em cima; `mensagem` é texto para humano e pode mudar.
 */
export class ErroDeAplicacao extends Error {
  /**
   * @param {string} codigo    identificador estável, SCREAMING_SNAKE_CASE
   * @param {string} mensagem
   * @param {{ status?: number, detalhes?: unknown, causa?: unknown }} [opcoes]
   */
  constructor(codigo, mensagem, opcoes = {}) {
    super(mensagem, { cause: opcoes.causa });
    this.name = 'ErroDeAplicacao';
    this.codigo = codigo;
    this.status = opcoes.status ?? 500;
    this.detalhes = opcoes.detalhes;
  }
}

/** @returns {ErroDeAplicacao} */
export function alunoNaoEncontrado() {
  return new ErroDeAplicacao('ALUNO_NAO_ENCONTRADO', 'Aluno não encontrado.', {
    status: 404,
  });
}

/** @returns {ErroDeAplicacao} */
export function iaRespostaInvalida(
  mensagem = 'O assistente não produziu uma resposta utilizável.',
) {
  return new ErroDeAplicacao('IA_RESPOSTA_INVALIDA', mensagem, { status: 502 });
}
