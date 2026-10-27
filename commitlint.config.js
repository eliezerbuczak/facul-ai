/** Conventional Commits — ver docs/08-processo-e-qualidade.md §2. */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'alunos',
        'financeiro',
        'assistente',
        'web',
        'infra',
        'specs',
        'adr',
        'readme',
        'deps',
      ],
    ],
    // Aviso, não erro: `chore: iniciar repositório` é legítimo sem escopo.
    'scope-empty': [1, 'never'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
  },
};
