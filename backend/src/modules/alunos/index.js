// @ts-check
/**
 * API pública do módulo de alunos.
 *
 * Nenhum outro módulo — nem `platform/` — deve importar de `domain/`,
 * `application/` ou `infra/` daqui. A regra é verificada pelo ESLint
 * (docs/02 §2, regra 5).
 */
export { criarAluno } from './domain/aluno.js';
export {
  STATUS_ACADEMICO,
  STATUS_VALIDOS,
  ehStatusValido,
} from './domain/status-academico.js';

export { criarAlunoRepositoryEmMemoria } from './infra/aluno.repository.memoria.js';
