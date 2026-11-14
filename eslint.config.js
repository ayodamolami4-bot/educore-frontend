import { defineConfig } from 'eslint/config';
import expo from 'eslint-config-expo/flat';

export default defineConfig([
  expo,
  { ignores: ['dist/**', '.expo/**', 'coverage/**'] },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]);
