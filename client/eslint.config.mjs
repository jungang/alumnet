import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import prettier from 'eslint-config-prettier';

export default [
  // 全局忽略
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.js', '*.cjs', '*.mjs'],
  },

  // Vue + TypeScript 文件
  {
    files: ['src/**/*.vue', 'src/**/*.ts'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsparser,
        ecmaVersion: 2022,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      vue: vuePlugin,
    },
    rules: {
      // Vue 推荐
      ...vuePlugin.configs['vue3-recommended'].rules,
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/no-setup-props-destructure': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': ['error', {
        html: { void: 'always', normal: 'never', component: 'always' },
        svg: 'always',
        math: 'always',
      }],

      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // 代码质量
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Prettier 兼容（放最后）
  prettier,
];
