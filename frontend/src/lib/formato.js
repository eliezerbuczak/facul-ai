const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Centavos inteiros → "R$ 1.250,00". A divisão por 100 acontece só aqui. */
export function formatarReais(centavos) {
  // Intl separa o símbolo com espaço não-separável (U+00A0).
  return BRL.format(centavos / 100).replace(/\u00A0/g, ' ');
}

/**
 * 'YYYY-MM-DD' → 'DD/MM/YYYY', sem passar por Date.
 *
 * `new Date('2026-10-26')` é meia-noite UTC, que são 21h do dia 25 em
 * Brasília — formatar por lá deslocaria o dia. A mesma armadilha do item 4,
 * agora no front.
 */
export function formatarData(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

const ROTULOS = { PAGA: 'Paga', VENCIDA: 'Vencida', A_VENCER: 'A vencer' };

export function rotuloSituacao(situacao) {
  return ROTULOS[situacao] ?? situacao;
}
