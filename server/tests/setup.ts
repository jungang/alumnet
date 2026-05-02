/**
 * 测试初始化文件
 * 在所有测试运行前执行
 */

import { vi } from 'vitest';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.JWT_EXPIRES_IN_SECONDS = '3600';

// 模拟数据库连接池，避免测试依赖真实数据库
vi.mock('../src/config/database', () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: vi.fn(),
    }),
  },
}));

// 全局测试工具函数
export function createMockResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

export function createMockRequest(overrides: Record<string, any> = {}) {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
}

export function createMockNext() {
  return vi.fn();
}
