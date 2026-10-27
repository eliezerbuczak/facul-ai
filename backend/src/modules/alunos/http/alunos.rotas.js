// @ts-check
import * as schemas from './alunos.schemas.js';

/**
 * O schema de resposta não é decoração: o Fastify serializa a partir dele, o
 * que garante que nenhum campo novo da entidade vaze para a API sem passar
 * por aqui.
 *
 * @param {any} casosDeUso
 */
export function rotasDeAlunos(casosDeUso) {
  return async function plugin(/** @type {import('fastify').FastifyInstance} */ app) {
    app.get('/alunos', { schema: schemas.listarAlunos }, async (req) => {
      const query = /** @type {any} */ (req.query);
      const { dados, total } = await casosDeUso.listarAlunos(query);
      return {
        dados,
        paginacao: {
          pagina: query.pagina,
          limite: query.limite,
          total,
          totalPaginas: Math.ceil(total / query.limite),
        },
      };
    });

    app.get('/alunos/:id', { schema: schemas.obterAluno }, async (req) =>
      casosDeUso.obterAluno(/** @type {any} */ (req.params).id),
    );
  };
}
