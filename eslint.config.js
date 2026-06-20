import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
  },
  {
    files: ['src/**/*.js'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-undef': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'always'],
      'no-var': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'package-lock.json'],
  },
  prettierConfig,
];
