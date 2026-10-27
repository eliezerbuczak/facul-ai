// @ts-check
import { randomUUID } from 'node:crypto';

import cors from '@fastify/cors';
import Fastify from 'fastify';

import { rotasDeAlunos } from '../modules/alunos/index.js';
import { rotasDeAssistente } from '../modules/assistente/index.js';
import { rotasDeFinanceiro } from '../modules/financeiro/index.js';
import { registrarTratamentoDeErros } from './tratador-de-erros.js';

/**
 * Monta a aplicação Fastify com as dependências já resolvidas.
 *
 * Os casos de uso chegam por parâmetro em vez de serem construídos aqui: é o
 * que permite aos testes injetar um relógio fixo e um seed controlado, e
 * exercitar o ciclo requisição→resposta inteiro com `app.inject()`, sem
 * abrir porta.
 *
 * @param {{ config: any, casosDeUso: any }} params
 */
export async function criarServidor({ config, casosDeUso }) {
  const app = Fastify({
    logger: { level: config.logLevel },
    ajv: {
      customOptions: {
        // O padrão do Fastify é removeAdditional: true, que faz
        // `additionalProperties: false` DESCARTAR o campo extra em silêncio em
        // vez de recusar a requisição. Num endpoint que recebe prompt, aceitar
        // calado um campo que o cliente achou que estava enviando é pior que
        // devolver 400 — o erro de integração só apareceria em produção.
        removeAdditional: false,
        coerceTypes: 'array',
        useDefaults: true,
        allErrors: false,
      },
    },
    // O padrão do Fastify é um contador por processo ("req-1"), que colide
    // entre reinícios e entre instâncias. UUID correlaciona de verdade.
    genReqId: () => randomUUID(),
    disableRequestLogging: config.logLevel === 'silent',
  });

  await app.register(cors, { origin: config.corsOrigin });

  // Correlaciona a resposta com as linhas de log da requisição (docs/04 §7).
  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', String(req.id));
  });

  registrarTratamentoDeErros(app);

  app.get('/api/health', async () => ({
    status: 'ok',
    persistencia: config.persistencia,
    assistente: { modo: config.modoAssistente ?? 'demo' },
  }));

  await app.register(rotasDeAlunos(casosDeUso), { prefix: '/api' });
  await app.register(rotasDeFinanceiro(casosDeUso), { prefix: '/api' });
  await app.register(rotasDeAssistente(casosDeUso), { prefix: '/api' });

  return app;
}
