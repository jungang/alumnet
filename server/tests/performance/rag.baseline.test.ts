/**
 * RAG 性能基线测试
 * 测量 P50/P95 延迟 + 并发吞吐 + 降级场景
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ragService } from '../../services/ragService';

// 性能计时工具
function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = Date.now();
  return fn().then(result => ({ result, durationMs: Date.now() - start }));
}

describe('RAG Performance Baseline', () => {
  // 基线记录（仅记录，不硬性断言，避免 CI 抖动）
  const timings: number[] = [];

  describe('单个查询延迟', () => {
    const testQueries = [
      '学校有多少校友',
      '最著名的校友是谁',
      '有哪些科技行业的校友',
      '1980年毕业的校友',
      '校友分布',
    ];

    testQueries.forEach((query) => {
      it(`P50 查询: "${query}"`, async () => {
        const { durationMs } = await measureTime(() => ragService.query(query));
        timings.push(durationMs);
        console.log(`  "${query}" → ${durationMs}ms`);
        // 软断言：正常情况下 <10s
        expect(durationMs).toBeLessThan(30000);
      });
    });

    afterAll(() => {
      if (timings.length === 0) return;
      timings.sort((a, b) => a - b);
      const p50 = timings[Math.floor(timings.length * 0.5)];
      const p95 = timings[Math.floor(timings.length * 0.95)];
      const avg = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
      console.log(`\n=== RAG 性能基线 ===`);
      console.log(`样本数: ${timings.length}`);
      console.log(`P50: ${p50}ms`);
      console.log(`P95: ${p95}ms`);
      console.log(`平均: ${avg}ms`);
      console.log(`最小: ${timings[0]}ms / 最大: ${timings[timings.length - 1]}ms`);
    });
  });

  describe('缓存命中', () => {
    it('重复查询应命中缓存且更快', async () => {
      const query = '测试缓存命中性能';
      const first = await measureTime(() => ragService.query(query));
      const second = await measureTime(() => ragService.query(query));
      console.log(`  首次: ${first.durationMs}ms, 缓存: ${second.durationMs}ms`);
      expect(second.durationMs).toBeLessThanOrEqual(first.durationMs);
    });
  });

  describe('并发吞吐', () => {
    it('5 并发查询应全部完成', async () => {
      const queries = ['校友总数', '科技校友', '教师', '捐赠', '活动'];
      const start = Date.now();
      const results = await Promise.all(queries.map(q => ragService.query(q)));
      const totalMs = Date.now() - start;
      console.log(`  5 并发总耗时: ${totalMs}ms, 平均: ${Math.round(totalMs / 5)}ms`);
      expect(results).toHaveLength(5);
      results.forEach(r => expect(r).toHaveProperty('answer'));
    });
  });

  describe('降级场景', () => {
    it('空查询应返回友好提示', async () => {
      const result = await ragService.query('');
      expect(result.answer).toBeTruthy();
      expect(result.relatedAlumni).toEqual([]);
    });

    it('超短查询应正常处理', async () => {
      const result = await ragService.query('张');
      expect(result).toHaveProperty('answer');
    });
  });
});
