// @ts-check
import { FORMATO } from '../../../shared/validacao.js';

const schema = {
  body: {
    type: 'object',
    required: ['pergunta'],
    // Diferente da query de listagem: aqui não há custo de compatibilidade, e
    // a rigidez pega erro de integração cedo. Também impede que um cliente
    // tente injetar campos como systemPrompt (docs/04 §6).
    additionalProperties: false,
    properties: {
      pergunta: { type: 'string', minLength: 3, maxLength: 500 },
      alunoId: { type: ['string', 'null'], pattern: FORMATO.UUID_V4.source },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        resposta: { type: 'string' },
        modo: { type: 'string' },
        ferramentasUsadas: { type: 'array', items: { type: 'string' } },
        fontes: {
          type: 'array',
          items: {
            type: 'object',
            properties: { tipo: { type: 'string' }, id: { type: 'string' } },
          },
        },
      },
    },
  },
};

/** @param {any} casosDeUso */
export function rotasDeAssistente(casosDeUso) {
  return async function plugin(/** @type {import('fastify').FastifyInstance} */ app) {
    app.post('/assistente', { schema }, async (req) => {
      const { pergunta, alunoId = null } = /** @type {any} */ (req.body);

      // Precondição: o id que o cliente mandou precisa existir. Sem isso, um
      // id inválido viraria uma resposta genérica em vez de um 404 claro.
      if (alunoId) await casosDeUso.obterAluno(alunoId);

      return casosDeUso.responderPergunta({ pergunta: pergunta.trim(), alunoId });
    });
  };
}
