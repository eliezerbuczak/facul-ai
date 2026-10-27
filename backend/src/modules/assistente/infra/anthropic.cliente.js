// @ts-check
import Anthropic from '@anthropic-ai/sdk';

/**
 * Cria o cliente do SDK a partir da configuração.
 *
 * Isolado do provider para que os testes injetem um cliente de mentira sem
 * precisar da chave nem de rede.
 *
 * @param {any} config
 */
export function criarClienteAnthropic(config) {
  return new Anthropic({
    apiKey: config.segredos.anthropicApiKey,
    // Milissegundos no SDK de TypeScript, não segundos. O padrão é 10 minutos,
    // inviável dentro de uma requisição web.
    timeout: config.anthropic.timeoutMs,
    // O SDK já faz backoff exponencial em 408, 409, 429 e 5xx. Não
    // reimplementar por fora.
    maxRetries: 2,
  });
}
