// @ts-check
import { readFileSync } from 'node:fs';

import { criarAluno } from '../modules/alunos/index.js';
import { criarParcela } from '../modules/financeiro/index.js';
import { deslocarDias, hojeEm } from '../shared/data.js';

const ARQUIVO = new URL('../../seed/dados.json', import.meta.url);

/**
 * @typedef {object} Seed
 * @property {import('../modules/alunos/domain/aluno.js').Aluno[]} alunos
 * @property {import('../modules/financeiro/domain/parcela.js').Parcela[]} parcelas
 */

/**
 * Converte o seed bruto — que guarda deslocamentos em dias — em entidades com
 * datas absolutas, válidas na data de referência informada.
 *
 * Guardar deslocamentos em vez de datas é o que mantém os casos de borda vivos:
 * com datas absolutas, o perfil "vence hoje" deixaria de demonstrar o caso 3 no
 * dia seguinte à geração, sem nenhum sinal de que parou (docs/03 §4).
 *
 * As entidades são construídas pelos construtores de domínio, não montadas à
 * mão: o seed passa pelas mesmas invariantes que qualquer outro dado.
 *
 * @param {{ alunos: any[] }} bruto
 * @param {string} hoje  'YYYY-MM-DD'
 * @returns {Seed}
 */
export function resolverSeed(bruto, hoje) {
  const alunos = [];
  const parcelas = [];

  for (const perfil of bruto.alunos) {
    alunos.push(
      criarAluno({
        id: perfil.id,
        nome: perfil.nome,
        matricula: perfil.matricula,
        curso: perfil.curso,
        status: perfil.status,
        ingressoEm: deslocarDias(hoje, perfil.ingressoEmDias),
      }),
    );

    perfil.parcelas.forEach((p, indice) => {
      const vencimento = deslocarDias(hoje, p.vencimentoEmDias);
      const pago = p.pagoEmDias !== null && p.pagoEmDias !== undefined;

      parcelas.push(
        criarParcela({
          id: `${perfil.id}-p${indice + 1}`,
          alunoId: perfil.id,
          competencia: vencimento.slice(0, 7),
          valorCentavos: p.valorCentavos,
          vencimento,
          pagoEm: pago ? deslocarDias(hoje, p.pagoEmDias) : null,
          // Sem valorPagoCentavos explícito, o pagamento quita integralmente.
          // Pagamento parcial é sempre declarado no seed, nunca inferido.
          valorPagoCentavos: pago ? (p.valorPagoCentavos ?? p.valorCentavos) : null,
        }),
      );
    });
  }

  return { alunos, parcelas };
}

/**
 * Lê `seed/dados.json` e resolve na data de referência.
 *
 * @param {string} [hoje]  padrão: hoje em America/Sao_Paulo
 * @returns {Seed}
 */
export function carregarSeed(hoje = hojeEm()) {
  return resolverSeed(JSON.parse(readFileSync(ARQUIVO, 'utf8')), hoje);
}
