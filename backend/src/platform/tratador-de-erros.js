// @ts-check
import { ErroDeAplicacao, ErroDeDominio } from '../shared/erros.js';

/**
 * Traduz uma falha de schema do ajv para português.
 *
 * O ajv responde em inglês, e essas mensagens chegam ao usuário final na
 * interface. Traduzir as palavras-chave que realmente ocorrem aqui custa menos
 * que somar uma dependência de i18n, e permite esconder detalhe interno:
 * `pattern` vira "está em formato inválido" em vez de despejar a regex.
 *
 * @param {any} falha  item de `erro.validation`
 * @returns {string}
 */
function traduzir(falha) {
  const p = falha.params ?? {};
  switch (falha.keyword) {
    case 'minimum':
      return `deve ser maior ou igual a ${p.limit}`;
    case 'maximum':
      return `deve ser menor ou igual a ${p.limit}`;
    case 'minLength':
      return `deve ter no mínimo ${p.limit} ${p.limit === 1 ? 'caractere' : 'caracteres'}`;
    case 'maxLength':
      return `deve ter no máximo ${p.limit} caracteres`;
    case 'enum':
      return `deve ser um de: ${(p.allowedValues ?? []).join(', ')}`;
    case 'pattern':
      return 'está em formato inválido';
    case 'type':
      return `deve ser do tipo ${p.type}`;
    case 'required':
      return 'é obrigatório';
    default:
      return falha.message ?? 'valor inválido';
  }
}

/**
 * Traduz os erros do núcleo para o envelope de docs/04 §1.
 *
 * O domínio e a aplicação não conhecem HTTP; a tradução mora aqui, num lugar
 * só. Nenhum 5xx vaza stack trace, mensagem de driver ou texto de exceção — o
 * detalhe vai para o log, correlacionado pelo x-request-id da resposta.
 *
 * @param {import('fastify').FastifyInstance} app
 */
export function registrarTratamentoDeErros(app) {
  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({
      erro: { codigo: 'ROTA_NAO_ENCONTRADA', mensagem: 'Rota não encontrada.' },
    });
  });

  app.setErrorHandler((erro, req, reply) => {
    // Falha de schema: o Fastify valida antes do handler.
    if (erro.validation) {
      return reply.code(400).send({
        erro: {
          codigo: 'REQUISICAO_INVALIDA',
          mensagem: 'Requisição inválida.',
          detalhes: erro.validation.map((v) => ({
            campo:
              v.instancePath.replace(/^\//, '') ||
              /** @type {any} */ (v.params)?.missingProperty ||
              '(requisição)',
            mensagem: traduzir(v),
          })),
        },
      });
    }

    if (erro instanceof ErroDeAplicacao) {
      return reply.code(erro.status).send({
        erro: {
          codigo: erro.codigo,
          mensagem: erro.message,
          ...(erro.detalhes ? { detalhes: erro.detalhes } : {}),
        },
      });
    }

    if (erro instanceof ErroDeDominio) {
      return reply.code(400).send({
        erro: {
          codigo: 'REQUISICAO_INVALIDA',
          mensagem: erro.message,
          detalhes: [{ campo: erro.campo ?? '(requisição)', mensagem: erro.message }],
        },
      });
    }

    req.log.error({ err: erro }, 'erro não tratado');
    return reply.code(500).send({
      erro: { codigo: 'ERRO_INTERNO', mensagem: 'Erro interno do servidor.' },
    });
  });
}
