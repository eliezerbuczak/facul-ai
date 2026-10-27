import js from '@eslint/js';
import globals from 'globals';

/**
 * Regras de fronteira entre módulos — ver docs/02-arquitetura.md §2.
 *
 * O casamento é feito sobre o ESPECIFICADOR do import, não sobre o caminho
 * resolvido. Isso é o que permite distinguir import interno de externo:
 *
 *   ../domain/aluno.js            interno ao módulo        → permitido
 *   ../../alunos/index.js         API pública de outro      → permitido
 *   ../../alunos/domain/aluno.js  entranhas de outro módulo → bloqueado
 */
const CRUZAR_MODULO = [
  '../../*/domain/**',
  '../../*/application/**',
  '../../*/infra/**',
  '../../*/http/**',
];

const MSG_MODULO = 'Um módulo só enxerga outro pelo index.js dele (docs/02 §2, regra 5).';
const MSG_DOMINIO =
  'domain/ não pode depender de infraestrutura, HTTP ou biblioteca externa ' +
  '(docs/02 §2, regra 1). É o que impede a regra de negócio de vazar de camada — ' +
  'a causa-raiz do item 4, ver docs/06 §2.';

export default [
  { ignores: ['**/node_modules/**', '**/coverage/**', '**/dist/**'] },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: CRUZAR_MODULO, message: MSG_MODULO }],
        },
      ],
    },
  },

  // O domínio não conhece o mundo exterior.
  // Repete CRUZAR_MODULO porque flat config SUBSTITUI a configuração da regra,
  // não a acumula — omitir aqui desligaria a fronteira entre módulos no domain.
  {
    files: ['backend/src/modules/*/domain/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'fastify', message: MSG_DOMINIO },
            { name: 'mysql2', message: MSG_DOMINIO },
            { name: 'mysql2/promise', message: MSG_DOMINIO },
            { name: '@anthropic-ai/sdk', message: MSG_DOMINIO },
            { name: 'node:fs', message: MSG_DOMINIO },
            { name: 'node:fs/promises', message: MSG_DOMINIO },
            { name: 'node:http', message: MSG_DOMINIO },
          ],
          patterns: [
            { group: CRUZAR_MODULO, message: MSG_MODULO },
            {
              group: ['../infra/**', '../http/**', '../application/**', '**/platform/**'],
              message: MSG_DOMINIO,
            },
          ],
        },
      ],
    },
  },

  // platform/ é raiz de composição, não um passe livre. O salto daqui tem
  // forma diferente (../modules/x/...) e escapava de CRUZAR_MODULO, que casa
  // com ../../x/... — o buraco só apareceu quando um import real passou batido.
  {
    files: ['backend/src/platform/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../modules/*/domain/**',
                '../modules/*/application/**',
                '../modules/*/infra/**',
                '../modules/*/http/**',
              ],
              message: MSG_MODULO,
            },
          ],
        },
      ],
    },
  },

  // Scripts operacionais falam com o terminal.
  {
    files: ['scripts/**/*.js', 'backend/scripts/**/*.js'],
    rules: { 'no-console': 'off' },
  },
];
