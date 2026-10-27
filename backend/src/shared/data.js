// @ts-check

const FUSO_PADRAO = 'America/Sao_Paulo';

/**
 * Data de hoje como `'YYYY-MM-DD'` no fuso informado.
 *
 * Datas trafegam como string ISO em todo o sistema, nunca como `Date`, porque
 * `'YYYY-MM-DD'` compara corretamente por ordem lexicográfica — `a < b` é
 * verdadeiro exatamente quando `a` é anterior a `b`. Isso elimina a classe
 * inteira de bugs de fuso: `new Date('2026-10-26')` é meia-noite em UTC, que
 * são 21h do dia 25 em Brasília, e comparar esse instante com `new Date()`
 * classifica errado entre 21h e meia-noite (causa-raiz D de docs/06 §2).
 *
 * `agora` é parâmetro para que a conversão seja testável sem mocar relógio.
 *
 * @param {string} [fuso]   identificador IANA; padrão `America/Sao_Paulo`
 * @param {Date} [agora]    instante de referência; padrão, o relógio do sistema
 * @returns {string} data no formato `'YYYY-MM-DD'`
 */
export function hojeEm(fuso = FUSO_PADRAO, agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora);

  const por = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${por.year}-${por.month}-${por.day}`;
}
