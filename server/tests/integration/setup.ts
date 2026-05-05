/**
 * 集成测试环境设置
 * 
 * 使用真实的 HTTP 服务器（通过 supertest）+ 模拟数据库
 * 覆盖核心 API 端点，验证请求/响应流程
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { Pool } from 'pg';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
process.env.JWT_EXPIRES_IN_SECONDS = '3600';
process.env.PORT = '0'; // 让系统分配可用端口

// 创建模拟的数据库连接池
// 集成测试模拟数据库层，测试 HTTP 层完整性
const mockPool = {
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn(),
  }),
  on: vi.fn(),
  end: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../src/config/database', () => ({
  pool: mockPool,
  testConnection: vi.fn().mockResolvedValue(true),
}));

// 模拟 Qdrant（RAG 服务依赖）
vi.mock('../../src/services/ragService', () => ({
  queryRAG: vi.fn().mockResolvedValue({
    answer: '测试回答',
    relatedAlumni: [],
  }),
  sanitizeQuery: vi.fn((q: string) => q),
}));

export { mockPool };

// 测试辅助：重置所有模拟
export function resetMocks() {
  mockPool.query.mockReset();
  mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
  mockPool.connect.mockReset();
  mockPool.connect.mockResolvedValue({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: vi.fn(),
  });
}

// 测试辅助：设置数据库查询返回值
export function mockDbQuery(rows: any[], rowCount?: number) {
  mockPool.query.mockResolvedValue({
    rows,
    rowCount: rowCount ?? rows.length,
  });
}

// 测试辅助：设置数据库查询序列返回值
export function mockDbQuerySequence(responses: Array<{ rows: any[]; rowCount?: number }>) {
  mockPool.query.mockImplementation(() => {
    const response = responses.shift();
    if (!response) return Promise.resolve({ rows: [], rowCount: 0 });
    return Promise.resolve({
      rows: response.rows,
      rowCount: response.rowCount ?? response.rows.length,
    });
  });
}

// 测试辅助：生成有效 JWT Token
export function generateTestToken(payload: {
  userId: string;
  role: string;
  expiresIn?: string;
}): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { user_id: payload.userId, role: payload.role },
    process.env.JWT_SECRET!,
    { expiresIn: payload.expiresIn || '1h' }
  );
}

// 测试辅助：生成过期 Token
export function generateExpiredToken(payload: {
  userId: string;
  role: string;
}): string {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { user_id: payload.userId, role: payload.role },
    process.env.JWT_SECRET!,
    { expiresIn: '0s' }
  );
}
