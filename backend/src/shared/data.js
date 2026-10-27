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

/**
 * Soma (ou subtrai) dias a uma data ISO, devolvendo outra data ISO.
 *
 * Toda a aritmética acontece em UTC. Usar o fuso local aqui reintroduziria
 * exatamente o problema que `hojeEm` resolve: em um fuso com horário de verão,
 * somar 24 h a uma data pode cair no mesmo dia ou pular um.
 *
 * @param {string} dataIso  'YYYY-MM-DD'
 * @param {number} dias     positivo para frente, negativo para trás
 * @returns {string} 'YYYY-MM-DD'
 */
export function deslocarDias(dataIso, dias) {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 1, dia) + dias * 86_400_000);
  const mm = String(alvo.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(alvo.getUTCDate()).padStart(2, '0');
  return `${alvo.getUTCFullYear()}-${mm}-${dd}`;
}
