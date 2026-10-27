// @ts-check
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  NotFoundError,
  PermissionDeniedError,
  RateLimitError,
} from '@anthropic-ai/sdk';

import { ErroDeAplicacao, iaRespostaInvalida } from '../../../shared/erros.js';
import { PROMPT_DE_SISTEMA } from '../domain/prompt-de-sistema.js';

/**
 * Teto de tokens da resposta.
 *
 * No Claude Opus 5 o raciocínio vem ligado por padrão, e `max_tokens` limita
 * raciocínio **mais** texto somados — um valor apertado trunca a resposta no
 * meio. As respostas reais ficam em algumas centenas de tokens; isto é teto,
 * não alvo, e só se paga o que for gerado.
 */
const MAX_TOKENS = 8192;

const indisponivel = (causa) =>
  new ErroDeAplicacao('IA_INDISPONIVEL', 'Serviço de IA indisponível no momento.', {
    status: 503,
    causa,
  });

/**
 * Traduz a exceção do SDK para o catálogo de docs/04 §1.
 *
 * Encadeado da classe mais específica para a mais genérica. Nunca casar por
 * texto de mensagem: as classes existem exatamente para isso.
 *
 * `AuthenticationError` vira 503 e não 401 de propósito: do ponto de vista de
 * quem chama a nossa API, uma chave **nossa** inválida é indisponibilidade do
 * serviço — não há o que ele faça com um 401. O detalhe vai para o log, e a
 * mensagem original nunca é repassada, porque ela cita a chave.
 *
 * @param {unknown} erro
 * @returns {never}
 */
function traduzirErro(erro) {
  if (erro instanceof AuthenticationError) throw indisponivel(erro);
  if (erro instanceof PermissionDeniedError) throw indisponivel(erro);
  if (erro instanceof NotFoundError) throw indisponivel(erro);

  if (erro instanceof RateLimitError) {
    throw new ErroDeAplicacao(
      'LIMITE_DE_REQUISICOES',
      'Limite de requisições ao serviço de IA atingido. Tente novamente em instantes.',
      { status: 429, causa: erro },
    );
  }

  // Timeout antes de APIConnectionError: é subclasse dele.
  if (erro instanceof APIConnectionTimeoutError) {
    throw new ErroDeAplicacao(
      'IA_TIMEOUT',
      'O serviço de IA demorou demais a responder.',
      {
        status: 504,
        causa: erro,
      },
    );
  }
  if (erro instanceof APIConnectionError) throw indisponivel(erro);

  if (erro instanceof APIError) {
    // 5xx é problema do provedor; 4xx é requisição nossa malformada.
    if ((erro.status ?? 500) >= 500) throw indisponivel(erro);
    throw iaRespostaInvalida('O serviço de IA recusou a requisição.');
  }

  throw erro;
}

/**
 * Provider real: delega a decisão ao Claude via tool use.
 *
 * Implementa o mesmo contrato do provider demonstrativo — o laço, o despacho e
 * a verificação de grounding não sabem qual dos dois está rodando (ADR 0005).
 *
 * @param {{ cliente: any, config: any }} deps
 */
export function criarAnthropicProvider({ cliente, config }) {
  return {
    nome: 'anthropic',

    /** @param {{ mensagens: any[], ferramentas: any[] }} contexto */
    async decidir({ mensagens, ferramentas }) {
      let resposta;
      try {
        resposta = await cliente.messages.create({
          model: config.anthropic.modelo,
          max_tokens: MAX_TOKENS,
          system: PROMPT_DE_SISTEMA,
          tools: ferramentas,
          messages: mensagens,
          // `effort` é o controle de custo. Não se desliga o raciocínio: com
          // thinking desligado o modelo ocasionalmente escreve a chamada de
          // ferramenta como texto visível em vez de emitir o bloco tool_use —
          // a chamada nunca executa e nenhum erro é levantado (docs/05 §4).
          output_config: { effort: config.anthropic.effort },
        });
      } catch (erro) {
        traduzirErro(erro);
      }

      // stop_reason ANTES de content: uma recusa do classificador retorna
      // HTTP 200 com content vazio, e ler content[0].text direto quebra com
      // TypeError nesse caminho.
      if (resposta.stop_reason === 'refusal') {
        throw iaRespostaInvalida(
          'O serviço de IA recusou responder a esta pergunta por política de segurança.',
        );
      }
      if (resposta.stop_reason === 'max_tokens') {
        throw iaRespostaInvalida('A resposta do serviço de IA foi truncada.');
      }

      const blocos = resposta.content ?? [];

      if (resposta.stop_reason === 'tool_use') {
        return {
          tipo: 'ferramentas',
          chamadas: blocos
            .filter((b) => b.type === 'tool_use')
            .map((b) => ({ id: b.id, nome: b.name, argumentos: b.input })),
          // Inteiro, com os blocos tool_use: devolver só o texto faz a
          // requisição seguinte ser rejeitada por tool_use sem tool_result.
          conteudoBruto: blocos,
        };
      }

      const texto = blocos
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();

      if (!texto)
        throw iaRespostaInvalida('O serviço de IA devolveu uma resposta vazia.');
      return { tipo: 'resposta', texto };
    },
  };
}
