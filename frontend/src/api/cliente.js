/**
 * Erro vindo da API, já traduzido para algo exibível.
 *
 * Carrega o `codigo` do envelope (docs/04 §1) para que a interface ramifique
 * em cima dele, nunca em cima do texto da mensagem — texto pode mudar.
 */
export class ErroDaApi extends Error {
  constructor(codigo, mensagem, { status, detalhes } = {}) {
    super(mensagem);
    this.name = 'ErroDaApi';
    this.codigo = codigo;
    this.status = status;
    this.detalhes = detalhes;
  }

  /** Falha do serviço de IA — a interface oferece "tentar de novo". */
  get ehDeIa() {
    return [
      'IA_INDISPONIVEL',
      'IA_TIMEOUT',
      'IA_RESPOSTA_INVALIDA',
      'LIMITE_DE_REQUISICOES',
    ].includes(this.codigo);
  }
}

/**
 * Requisição à API com o envelope de erro já desembrulhado.
 *
 * `fetch` é injetável para teste — sem isso a única forma de cobrir os
 * caminhos de erro seria subir um servidor.
 */
export async function requisitar(url, { fetch: f = globalThis.fetch, ...opcoes } = {}) {
  let resposta;
  try {
    resposta = await f(url, opcoes);
  } catch {
    // "Failed to fetch" não diz nada a quem está usando a tela.
    throw new ErroDaApi(
      'SEM_CONEXAO',
      'Não foi possível falar com o servidor. Verifique se a API está no ar.',
    );
  }

  let corpo = null;
  try {
    corpo = await resposta.json();
  } catch {
    // Corpo não-JSON: um proxy no caminho pode devolver HTML num 502.
  }

  if (resposta.ok) return corpo;

  const erro = corpo?.erro;
  if (!erro) {
    throw new ErroDaApi(
      'ERRO_INESPERADO',
      `O servidor respondeu com erro ${resposta.status}.`,
      {
        status: resposta.status,
      },
    );
  }

  const porCampo = erro.detalhes?.map((d) => `${d.campo}: ${d.mensagem}`).join('; ');
  throw new ErroDaApi(
    erro.codigo,
    porCampo ? `${erro.mensagem} ${porCampo}` : erro.mensagem,
    {
      status: resposta.status,
      detalhes: erro.detalhes,
    },
  );
}

const query = (params) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const api = {
  listarAlunos: (filtro = {}, opcoes) =>
    requisitar(`/api/alunos${query(filtro)}`, opcoes),
  obterFinanceiro: (id, opcoes) => requisitar(`/api/alunos/${id}/financeiro`, opcoes),
  perguntar: (corpo, opcoes) =>
    requisitar('/api/assistente', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
      ...opcoes,
    }),
  health: (opcoes) => requisitar('/api/health', opcoes),
};
