import js from '@eslint/js';

const eslintConfig = [
  js.configs.recommended,
  {
    files: ['*.js', '*.mjs'],
    ignores: ['**/dist/**', '**/node_modules/**', 'client/**', 'server/**', 'admin/**'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
    },
  },
];

export default eslintConfig;
