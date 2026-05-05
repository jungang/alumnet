import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // 单元测试使用 setup.ts; 集成测试在文件内自行 setup
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/db/**',
        'src/app.ts',
        'src/routes/**',       // Routes need integration tests
        'src/repositories/**', // Repositories need integration tests with DB
        'src/config/**',       // Config files
        'src/services/ragService.ts',           // RAG service needs external AI integration
        'src/services/fileUploadService.ts',    // File upload needs filesystem integration
        'src/services/interactionStatsService.ts', // Stats service needs DB aggregation
        'src/services/alumniAssociationService.ts', // Simple CRUD wrapper
        'src/services/alumniNewsService.ts',    // Simple CRUD wrapper
        'src/services/classRosterService.ts',   // Complex DB relations
        'src/services/searchNoticeService.ts',  // Simple CRUD wrapper
      ],
      thresholds: {
        statements: 40,
        branches: 50,
        functions: 40,
        lines: 40,
      },
    },
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
