// @ts-check

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Formata centavos como moeda brasileira.
 *
 * A divisão por 100 acontece só aqui, na borda de apresentação — todo o resto
 * do sistema trabalha com inteiros em centavos, sem float em nenhum ponto
 * (docs/03 §1).
 *
 * Usado pelo provider demonstrativo, que precisa produzir prosa para o
 * usuário. A API nunca devolve valor formatado em campo estruturado: isso é
 * decisão do front.
 *
 * @param {number} centavos
 * @returns {string}
 */
export function formatarReais(centavos) {
  // O Intl separa o símbolo com espaço não-separável (U+00A0); normaliza
  // para espaço comum, que é o que o resto do sistema e os testes esperam.
  return BRL.format(centavos / 100).replace(/\u00A0/g, ' ');
}
