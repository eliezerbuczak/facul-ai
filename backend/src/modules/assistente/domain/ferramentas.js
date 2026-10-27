// @ts-check
import { STATUS_VALIDOS } from '../../alunos/index.js';

/**
 * Teto de registros que uma única consulta pode trazer para o contexto.
 *
 * Aplicado no back-end, não confiado ao modelo: é o limite de quanto dado pode
 * entrar no prompt por chamada (RNF-04, "enviar ao modelo somente os dados
 * necessários").
 */
export const LIMITE_DE_REGISTROS = 50;

const SITUACOES = ['ADIMPLENTE', 'INADIMPLENTE'];

/**
 * Definições das ferramentas de consulta oferecidas ao modelo.
 *
 * Cada uma mapeia para um caso de uso que já serve a API REST — o assistente
 * não tem caminho privilegiado até os dados.
 *
 * `strict: true` exige `additionalProperties: false` e todas as propriedades
 * em `required`; opcionalidade se expressa aceitando `null`. Em troca, a API
 * garante que os argumentos validam contra o schema, o que elimina validação
 * defensiva no despacho.
 *
 * As descrições dizem **quando** usar, não só o que a ferramenta faz: descrição
 * prescritiva eleva a taxa de acerto na escolha.
 */
export const FERRAMENTAS = Object.freeze([
  {
    name: 'listar_alunos',
    description:
      'Lista alunos do sistema acadêmico, com filtros opcionais. Use quando a ' +
      'pergunta envolver mais de um aluno, ou pedir um recorte por status ' +
      'acadêmico ou por situação financeira — por exemplo "quais alunos estão ' +
      'inadimplentes". A situação financeira é calculada a partir das parcelas ' +
      'e da data de hoje; não é um campo armazenado.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        status: { type: ['string', 'null'], enum: [...STATUS_VALIDOS, null] },
        situacaoFinanceira: { type: ['string', 'null'], enum: [...SITUACOES, null] },
        busca: {
          type: ['string', 'null'],
          description: 'Trecho de nome ou matrícula',
        },
        limite: {
          type: ['integer', 'null'],
          description: `Padrão 20, máximo ${LIMITE_DE_REGISTROS}`,
        },
      },
      required: ['status', 'situacaoFinanceira', 'busca', 'limite'],
      additionalProperties: false,
    },
  },
  {
    name: 'obter_aluno',
    description:
      'Busca um aluno específico por matrícula ou por trecho do nome. Use ' +
      'quando a pergunta citar um aluno nominalmente ou pela matrícula, e você ' +
      'precisar do id dele para consultar o financeiro. Devolve encontrado: ' +
      'false quando não há correspondência — nesse caso, diga que o aluno não ' +
      'foi encontrado em vez de supor.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        matriculaOuNome: {
          type: 'string',
          description: 'Matrícula completa ou trecho do nome',
        },
      },
      required: ['matriculaOuNome'],
      additionalProperties: false,
    },
  },
  {
    name: 'obter_financeiro',
    description:
      'Devolve a situação financeira de um aluno: adimplente ou inadimplente, ' +
      'os totalizadores e cada parcela com a própria situação. Use quando a ' +
      'pergunta for sobre pagamentos, mensalidades, dívida ou situação de um ' +
      'aluno específico. Exige o id do aluno — obtenha-o antes com obter_aluno ' +
      'se você tiver apenas o nome ou a matrícula.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { alunoId: { type: 'string', description: 'UUID do aluno' } },
      required: ['alunoId'],
      additionalProperties: false,
    },
  },
  {
    name: 'contar_alunos',
    description:
      'Conta quantos alunos satisfazem um filtro, sem trazer a lista. Use ' +
      'quando a pergunta for quantitativa — "quantos alunos estão com matrícula ' +
      'ativa", "quantos estão inadimplentes". Prefira esta ferramenta a listar e ' +
      'contar no texto: é mais barata e não erra quando a lista passa do limite.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        status: { type: ['string', 'null'], enum: [...STATUS_VALIDOS, null] },
        situacaoFinanceira: { type: ['string', 'null'], enum: [...SITUACOES, null] },
      },
      required: ['status', 'situacaoFinanceira'],
      additionalProperties: false,
    },
  },
]);
