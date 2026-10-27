// @ts-check
/** API pública do módulo do assistente. Ver docs/02 §2, regra 5. */
export { FERRAMENTAS, LIMITE_DE_REGISTROS } from './domain/ferramentas.js';
export { criarExecutarFerramenta } from './application/executar-ferramenta.js';
export { criarResponderPergunta } from './application/responder-pergunta.js';
export { criarDemoProvider } from './infra/demo.provider.js';
export { rotasDeAssistente } from './http/assistente.rotas.js';
