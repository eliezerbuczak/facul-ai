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
  criarDemoProvider,
  criarExecutarFerramenta,
  criarResponderPergunta,
} from '../modules/assistente/index.js';
import { hojeEm } from '../shared/data.js';
import { carregarSeed } from './seed.js';

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

  // O provider real entra aqui quando houver chave; o laço é o mesmo.
  const provider = criarDemoProvider();

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
