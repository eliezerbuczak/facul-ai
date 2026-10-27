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
import { hojeEm } from '../shared/data.js';
import { carregarSeed } from './seed.js';

/**
 * Raiz de composição: escolhe os adaptadores conforme a configuração e monta
 * os casos de uso. É o único lugar que conhece as implementações concretas.
 *
 * @param {any} config
 */
export function montarCasosDeUso(config) {
  if (config.persistencia !== 'memoria') {
    throw new Error(
      `Adaptador de persistência "${config.persistencia}" ainda não implementado.`,
    );
  }

  const seed = carregarSeed();
  const deps = {
    alunoRepo: criarAlunoRepositoryEmMemoria(seed),
    parcelaRepo: criarParcelaRepositoryEmMemoria(seed),
    relogio: () => hojeEm(),
  };

  return {
    listarAlunos: criarListarAlunos(deps),
    obterAluno: criarObterAluno(deps),
    contarAlunos: criarContarAlunos(deps),
    obterFinanceiroDoAluno: criarObterFinanceiroDoAluno(deps),
  };
}
