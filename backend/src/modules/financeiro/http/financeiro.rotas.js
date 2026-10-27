// @ts-check
import { FORMATO } from '../../../shared/validacao.js';

const PARAMS_ID = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', pattern: FORMATO.UUID_V4.source } },
};

/** @param {any} casosDeUso */
export function rotasDeFinanceiro(casosDeUso) {
  return async function plugin(/** @type {import('fastify').FastifyInstance} */ app) {
    app.get('/alunos/:id/financeiro', { schema: { params: PARAMS_ID } }, async (req) =>
      casosDeUso.obterFinanceiroDoAluno(/** @type {any} */ (req.params).id),
    );
  };
}
