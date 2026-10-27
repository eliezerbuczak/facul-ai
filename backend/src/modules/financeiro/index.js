// @ts-check
/** API pública do módulo financeiro. Ver docs/02 §2, regra 5. */
export { criarParcela, estaQuitada, situacaoDaParcela } from './domain/parcela.js';
export {
  ADIMPLENTE,
  INADIMPLENTE,
  calcularSituacao,
} from './domain/situacao-financeira.js';

export { criarParcelaRepositoryEmMemoria } from './infra/parcela.repository.memoria.js';
export { rotasDeFinanceiro } from './http/financeiro.rotas.js';
