// @ts-check
import { FORMATO } from '../../../shared/validacao.js';
import { STATUS_VALIDOS } from '../domain/status-academico.js';

export const ALUNO = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    nome: { type: 'string' },
    matricula: { type: 'string' },
    curso: { type: 'string' },
    status: { type: 'string' },
    ingressoEm: { type: 'string' },
  },
};

export const PARAMS_ID = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', pattern: FORMATO.UUID_V4.source } },
};

export const listarAlunos = {
  querystring: {
    type: 'object',
    // Parâmetro desconhecido é ignorado, não é erro: não vale quebrar o
    // cliente por causa de um ?utm_source= (docs/04 §3).
    additionalProperties: true,
    properties: {
      busca: { type: 'string', minLength: 1, maxLength: 120 },
      status: { type: 'string', enum: [...STATUS_VALIDOS] },
      pagina: { type: 'integer', minimum: 1, default: 1 },
      limite: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        dados: { type: 'array', items: ALUNO },
        paginacao: {
          type: 'object',
          properties: {
            pagina: { type: 'integer' },
            limite: { type: 'integer' },
            total: { type: 'integer' },
            totalPaginas: { type: 'integer' },
          },
        },
      },
    },
  },
};

export const obterAluno = { params: PARAMS_ID, response: { 200: ALUNO } };
