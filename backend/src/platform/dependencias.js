// @ts-check
import {
  criarAlunoRepositoryEmMemoria,
  criarContarAlunos,
  criarListarAlunos,
  criarObterAluno,
} from '../modules/alunos/index.js';
import {
  criarObterFinanceiroDoAluno,
  criarParcelaRepositoryEmMemoria,
} from '../modules/financeiro/index.js';
import {
  criarAnthropicProvider,
  criarClienteAnthropic,
  criarDemoProvider,
  criarExecutarFerramenta,
  criarResponderPergunta,
} from '../modules/assistente/index.js';
import { hojeEm } from '../shared/data.js';
import { carregarSeed } from './seed.js';

/**
 * Escolhe o provider de LLM conforme a configuração.
 *
 * Sem chave, a aplicação **sobe normalmente** em modo demonstrativo — não
 * falha na inicialização. Um avaliador sem chave precisa conseguir rodar o
 * projeto inteiro (RF-08).
 *
 * @param {any} config
 */
export function selecionarProvider(config) {
  if (config.modoAssistente !== 'anthropic') return criarDemoProvider();
  return criarAnthropicProvider({ cliente: criarClienteAnthropic(config), config });
}

/**
 * Raiz de composição: escolhe os adaptadores conforme a configuração e monta
 * os casos de uso. É o único lugar que conhece as implementações concretas.
 *
 * `overrides` existe para os testes injetarem um seed resolvido numa data
 * fixa e um relógio determinístico, sem precisar refazer a fiação inteira.
 *
 * @param {any} config
 * @param {{ seed?: any, relogio?: () => string }} [overrides]
 */
export function montarCasosDeUso(config, overrides = {}) {
  if (config.persistencia !== 'memoria') {
    throw new Error(
      `Adaptador de persistência "${config.persistencia}" ainda não implementado.`,
    );
  }

  const seed = overrides.seed ?? carregarSeed();
  const deps = {
    alunoRepo: criarAlunoRepositoryEmMemoria(seed),
    parcelaRepo: criarParcelaRepositoryEmMemoria(seed),
    relogio: overrides.relogio ?? (() => hojeEm()),
  };

  const consultas = {
    listarAlunos: criarListarAlunos(deps),
    obterAluno: criarObterAluno(deps),
    contarAlunos: criarContarAlunos(deps),
    obterFinanceiroDoAluno: criarObterFinanceiroDoAluno(deps),
  };

  const provider = selecionarProvider(config);

  return {
    ...consultas,
    responderPergunta: criarResponderPergunta({
      provider,
      executarFerramenta: criarExecutarFerramenta({
        ...consultas,
        alunoRepo: deps.alunoRepo,
      }),
    }),
  };
}
