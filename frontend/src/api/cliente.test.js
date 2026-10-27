import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ErroDaApi, requisitar } from './cliente.js';

/** @param {{status?: number, corpo?: any, rede?: boolean}} cfg */
function fetchFalso({ status = 200, corpo = {}, rede = false }) {
  return async () => {
    if (rede) throw new TypeError('Failed to fetch');
    return {
      ok: status >= 200 && status < 300,
      status,
      async json() {
        return corpo;
      },
    };
  };
}

test('resposta bem-sucedida devolve o corpo', async () => {
  const r = await requisitar('/api/alunos', {
    fetch: fetchFalso({ corpo: { dados: [1] } }),
  });
  assert.deepEqual(r, { dados: [1] });
});

test('erro da API vira ErroDaApi com código e mensagem do envelope', async () => {
  const fetch = fetchFalso({
    status: 404,
    corpo: {
      erro: { codigo: 'ALUNO_NAO_ENCONTRADO', mensagem: 'Aluno não encontrado.' },
    },
  });
  await assert.rejects(
    () => requisitar('/api/alunos/x', { fetch }),
    (e) => {
      assert.ok(e instanceof ErroDaApi);
      assert.equal(e.codigo, 'ALUNO_NAO_ENCONTRADO');
      assert.equal(e.message, 'Aluno não encontrado.');
      assert.equal(e.status, 404);
      return true;
    },
  );
});

test('erro de validação expõe os detalhes por campo', async () => {
  const fetch = fetchFalso({
    status: 400,
    corpo: {
      erro: {
        codigo: 'REQUISICAO_INVALIDA',
        mensagem: 'Requisição inválida.',
        detalhes: [{ campo: 'limite', mensagem: 'deve ser maior ou igual a 1' }],
      },
    },
  });
  await assert.rejects(
    () => requisitar('/api/alunos', { fetch }),
    (e) => {
      assert.match(e.message, /limite/);
      assert.match(e.message, /maior ou igual a 1/);
      return true;
    },
  );
});

test('falha de rede vira mensagem apresentável, não "Failed to fetch"', async () => {
  await assert.rejects(
    () => requisitar('/api/alunos', { fetch: fetchFalso({ rede: true }) }),
    (e) => {
      assert.ok(e instanceof ErroDaApi);
      assert.equal(e.codigo, 'SEM_CONEXAO');
      assert.equal(e.message.includes('Failed to fetch'), false);
      assert.match(e.message, /servidor/i);
      return true;
    },
  );
});

test('resposta de erro sem envelope ainda produz mensagem utilizável', async () => {
  // Um proxy ou o próprio Node podem devolver HTML ou corpo vazio num 502.
  const fetch = async () => ({
    ok: false,
    status: 502,
    async json() {
      throw new SyntaxError('Unexpected token <');
    },
  });
  await assert.rejects(
    () => requisitar('/api/alunos', { fetch }),
    (e) => {
      assert.equal(e.codigo, 'ERRO_INESPERADO');
      assert.equal(e.status, 502);
      assert.ok(e.message.length > 0);
      return true;
    },
  );
});

test('o erro é identificável por código, não por texto', async () => {
  const fetch = fetchFalso({
    status: 503,
    corpo: {
      erro: { codigo: 'IA_INDISPONIVEL', mensagem: 'Serviço de IA indisponível.' },
    },
  });
  const erro = await requisitar('/api/assistente', { fetch }).catch((e) => e);
  assert.equal(erro.ehDeIa, true);
});
