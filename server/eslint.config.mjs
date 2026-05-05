import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  // 全局忽略
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },

  // TypeScript 文件
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // ESLint 推荐
      'no-unused-vars': 'off',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-empty': ['error', { allowEmptyCatch: true }],

      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      // 代码质量
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
    },
  },

  // 测试文件宽松规则
  {
    files: ['tests/**/*.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // Prettier 兼容（放最后）
  prettier,

  // 迁移文件 (node-pg-migrate)
  {
    files: ['migrations/*.js'],
    languageOptions: {
      globals: {
        exports: 'readonly',
        pgm: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },

  // dbconfig.js (node-pg-migrate)
  {
    files: ['dbconfig.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
];
