import { criarParcela } from './parcela.js';

const BASE = {
  alunoId: 'aluno-1',
  competencia: '2026-09',
  valorCentavos: 125_000,
  vencimento: '2026-09-10',
};

let sequencia = 0;
const proximoId = () => `parcela-${(sequencia += 1)}`;

/** Parcela não paga. */
export function parcelaEmAberto(sobrescritas = {}) {
  return criarParcela({
    id: proximoId(),
    ...BASE,
    pagoEm: null,
    valorPagoCentavos: null,
    ...sobrescritas,
  });
}

/** Parcela paga integralmente. */
export function parcelaQuitada(sobrescritas = {}) {
  const valorCentavos = sobrescritas.valorCentavos ?? BASE.valorCentavos;
  return criarParcela({
    id: proximoId(),
    ...BASE,
    pagoEm: '2026-09-08',
    valorPagoCentavos: valorCentavos,
    ...sobrescritas,
  });
}

/** Parcela com pagamento registrado, porém insuficiente para quitá-la. */
export function parcelaParcial(sobrescritas = {}) {
  return criarParcela({
    id: proximoId(),
    ...BASE,
    pagoEm: '2026-09-08',
    valorPagoCentavos: 10_000,
    ...sobrescritas,
  });
}
