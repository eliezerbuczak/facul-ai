// @ts-check

/**
 * @param {string|undefined} valor
 * @param {number} padrao
 * @param {string} nome
 */
function inteiroPositivo(valor, padrao, nome) {
  if (valor === undefined || valor === '') return padrao;
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${nome} deve ser um inteiro positivo; recebido: ${valor}`);
  }
  return n;
}

/**
 * @param {string|undefined} valor
 * @param {string[]} opcoes
 * @param {string} padrao
 * @param {string} nome
 */
function umDe(valor, opcoes, padrao, nome) {
  if (valor === undefined || valor === '') return padrao;
  if (!opcoes.includes(valor)) {
    throw new Error(`${nome} deve ser um de: ${opcoes.join(', ')}; recebido: ${valor}`);
  }
  return valor;
}

/**
 * Lê e valida a configuração do ambiente.
 *
 * Único ponto do sistema que toca `process.env` — todo o resto recebe config
 * por parâmetro. Falha **na inicialização** com mensagem legível, em vez de
 * produzir comportamento estranho na primeira requisição.
 *
 * A chave da API fica fora do objeto retornado: vai separada, em
 * `segredos`, que é não-enumerável. Config aparece em log de diagnóstico;
 * a chave não pode aparecer junto (RNF-03).
 *
 * @param {Record<string, string|undefined>} [env]
 */
export function lerConfig(env = process.env) {
  const chave = (env.ANTHROPIC_API_KEY ?? '').trim();

  const config = {
    ambiente: env.NODE_ENV ?? 'development',
    porta: inteiroPositivo(env.PORT, 3000, 'PORT'),
    logLevel: env.LOG_LEVEL ?? 'info',
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5173',
    persistencia: umDe(env.PERSISTENCIA, ['memoria', 'mysql'], 'memoria', 'PERSISTENCIA'),
    modoAssistente: chave ? 'anthropic' : 'demo',
    anthropic: {
      modelo: env.ANTHROPIC_MODEL ?? 'claude-opus-5',
      timeoutMs: inteiroPositivo(
        env.ANTHROPIC_TIMEOUT_MS,
        20_000,
        'ANTHROPIC_TIMEOUT_MS',
      ),
      effort: umDe(
        env.ANTHROPIC_EFFORT,
        ['low', 'medium', 'high'],
        'low',
        'ANTHROPIC_EFFORT',
      ),
    },
  };

  Object.defineProperty(config, 'segredos', {
    value: Object.freeze({ anthropicApiKey: chave || null }),
    enumerable: false,
  });

  return Object.freeze(config);
}
