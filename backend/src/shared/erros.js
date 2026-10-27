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
