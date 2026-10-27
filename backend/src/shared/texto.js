// @ts-check

/**
 * Normaliza texto para comparação de busca: sem acento, em minúsculas.
 *
 * Espelha o comportamento da collation `utf8mb4_0900_ai_ci` do MySQL, que é
 * *accent-insensitive* e *case-insensitive*. Sem isso, o adaptador de memória
 * e o de MySQL divergiriam na busca — e um bug reproduzível num sumiria no
 * outro (docs/03 §3).
 *
 * NFD separa a letra do diacrítico; a remoção apaga só o diacrítico.
 *
 * @param {string} texto
 * @returns {string}
 */
export function normalizarParaBusca(texto) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
