// @ts-check
import { formatarReais } from '../../../shared/dinheiro.js';
import { normalizarParaBusca } from '../../../shared/texto.js';

const FALLBACK =
  'Estou em modo demonstrativo e respondo a perguntas sobre os dados ' +
  'acadêmicos: quem está inadimplente ou em dia, quantos alunos há por ' +
  'status, dados de um aluno por nome ou matrícula, e o resumo financeiro ' +
  'de um aluno. Pode reformular nesses termos?';

const STATUS_POR_TERMO = [
  [/\bativ/, 'ATIVO'],
  [/tranca/, 'TRANCADO'],
  [/cancel/, 'CANCELADO'],
  [/formad|formar/, 'FORMADO'],
];

let sequencia = 0;
const proximoId = () => `demo_${(sequencia += 1)}`;

/** @param {any[]} mensagens */
function textoDaPergunta(mensagens) {
  const primeira = mensagens.find((m) => m.role === 'user');
  return (primeira?.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join(' ');
}

/**
 * Emparelha cada tool_use do assistente com o tool_result correspondente.
 * @param {any[]} mensagens
 */
function resultadosEmMao(mensagens) {
  /** @type {Map<string, string>} */
  const nomePorId = new Map();
  for (const m of mensagens) {
    if (m.role !== 'assistant') continue;
    for (const b of m.content ?? []) {
      if (b.type === 'tool_use') nomePorId.set(b.id, b.name);
    }
  }

  const resultados = [];
  for (const m of mensagens) {
    if (m.role !== 'user') continue;
    for (const b of m.content ?? []) {
      if (b.type !== 'tool_result') continue;
      resultados.push({
        nome: nomePorId.get(b.tool_use_id),
        erro: b.is_error === true,
        conteudo: b.content,
      });
    }
  }
  return resultados;
}

/**
 * Classificador de intenção: o papel que o LLM desempenha no modo real.
 *
 * @param {string} pergunta
 * @returns {{ id: string, nome: string, argumentos: any }|null}
 */
function classificar(pergunta) {
  const t = normalizarParaBusca(pergunta);
  const status = STATUS_POR_TERMO.find(([re]) => re.test(t))?.[1] ?? null;
  const idEmFoco = pergunta.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
  )?.[0];
  const matricula = pergunta.match(/\b\d{10}\b/)?.[0];

  const inadimplencia = /inadimplent|devendo|deve\b|atras|em aberto|pendent/.test(t);
  const adimplencia = /adimplent|em dia|quitad|pagaram/.test(t);
  const quantitativa = /quant[oa]s|numero de|total de|contagem/.test(t);
  const resumo = /resum|situacao financeira|financeiro/.test(t);

  if (quantitativa) {
    return {
      id: proximoId(),
      nome: 'contar_alunos',
      argumentos: {
        status,
        situacaoFinanceira: inadimplencia
          ? 'INADIMPLENTE'
          : adimplencia
            ? 'ADIMPLENTE'
            : null,
      },
    };
  }
  if (inadimplencia || adimplencia) {
    return {
      id: proximoId(),
      nome: 'listar_alunos',
      argumentos: {
        status,
        situacaoFinanceira: inadimplencia ? 'INADIMPLENTE' : 'ADIMPLENTE',
        busca: null,
        limite: null,
      },
    };
  }
  if (resumo && idEmFoco) {
    return {
      id: proximoId(),
      nome: 'obter_financeiro',
      argumentos: { alunoId: idEmFoco },
    };
  }
  if (matricula) {
    return {
      id: proximoId(),
      nome: 'obter_aluno',
      argumentos: { matriculaOuNome: matricula },
    };
  }
  if (status) {
    return {
      id: proximoId(),
      nome: 'listar_alunos',
      argumentos: { status, situacaoFinanceira: null, busca: null, limite: null },
    };
  }
  return null;
}

/** @param {{nome?: string, erro: boolean, conteudo: string}} r */
function formatar(r) {
  if (r.erro) return `Não foi possível concluir a consulta: ${r.conteudo}`;

  const d = JSON.parse(r.conteudo);
  switch (r.nome) {
    case 'contar_alunos':
      return `Encontrei ${d.total} ${d.total === 1 ? 'aluno' : 'alunos'} com esse critério.`;

    case 'listar_alunos': {
      if (d.total === 0) return 'Nenhum aluno encontrado com esse critério.';
      const linhas = d.alunos.map(
        (a) => `- ${a.nome} (matrícula ${a.matricula}, ${a.curso}, ${a.status})`,
      );
      const cabecalho = `${d.total} ${d.total === 1 ? 'aluno' : 'alunos'}:`;
      return [cabecalho, ...linhas].join('\n');
    }

    case 'obter_aluno':
      if (!d.encontrado) return `Não encontrei nenhum aluno para "${d.termo}".`;
      return (
        `${d.aluno.nome}, matrícula ${d.aluno.matricula}, ` +
        `${d.aluno.curso}, status ${d.aluno.status}.`
      );

    case 'obter_financeiro': {
      const r2 = d.resumo;
      const base =
        `Situação em ${d.referencia}: ${d.situacao}. ` +
        `${r2.totalParcelas} ${r2.totalParcelas === 1 ? 'parcela' : 'parcelas'}, ` +
        `${r2.parcelasPagas} ${r2.parcelasPagas === 1 ? 'paga' : 'pagas'}, ` +
        `${r2.parcelasVencidas} ${r2.parcelasVencidas === 1 ? 'vencida' : 'vencidas'}, ` +
        `${r2.parcelasAVencer} a vencer.`;
      if (r2.totalEmAbertoCentavos === 0) return `${base} Nada em aberto.`;
      return (
        `${base} Em aberto: ${formatarReais(r2.totalEmAbertoCentavos)}` +
        (r2.totalVencidoCentavos > 0
          ? `, dos quais ${formatarReais(r2.totalVencidoCentavos)} já venceram.`
          : '.')
      );
    }

    default:
      return 'Consulta concluída, mas não soube interpretar o resultado.';
  }
}

/**
 * Provider demonstrativo: substitui o LLM apenas na **decisão** de qual
 * ferramenta chamar e na redação final.
 *
 * Tudo depois disso — o laço, o despacho, os casos de uso, os repositórios e a
 * verificação de grounding — é o mesmo código do modo real (ADR 0005). O
 * contrato é idêntico ao do provider da Anthropic, inclusive na forma dos
 * blocos, para que a troca seja só uma variável de ambiente.
 */
export function criarDemoProvider() {
  return {
    nome: 'demo',

    /** @param {{ mensagens: any[] }} contexto */
    async decidir({ mensagens }) {
      const resultados = resultadosEmMao(mensagens);
      if (resultados.length > 0) {
        return { tipo: 'resposta', texto: resultados.map(formatar).join('\n\n') };
      }

      const chamada = classificar(textoDaPergunta(mensagens));
      if (!chamada) return { tipo: 'resposta', texto: FALLBACK };

      return {
        tipo: 'ferramentas',
        chamadas: [chamada],
        conteudoBruto: [
          {
            type: 'tool_use',
            id: chamada.id,
            name: chamada.nome,
            input: chamada.argumentos,
          },
        ],
      };
    },
  };
}
