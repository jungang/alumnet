/**
 * Redis 缓存层 — ioredis
 * 高频接口走缓存：校友筛选、杰出校友、RAG 查询结果
 * 无 Redis 时自动降级为内存缓存
 */
import logger from './logger';

// 尝试连接 Redis，失败则降级内存缓存
let redis: any = null;
let memoryCache = new Map<string, { value: string; expiresAt: number }>();

async function initRedis() {
  try {
    const Redis = (await import('ioredis')).default;
    const url = process.env.REDIS_URL;
    if (!url) {
      logger.info('未配置 REDIS_URL，使用内存缓存');
      return;
    }
    redis = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      connectTimeout: 5000,
    });
    await redis.ping();
    logger.info('Redis 连接成功');
  } catch {
    logger.warn('Redis 连接失败，降级为内存缓存');
    redis = null;
  }
}

initRedis();

export interface CacheOptions {
  ttl?: number; // 秒，默认 300 (5分钟)
  prefix?: string;
}

/**
 * 获取缓存
 */
export async function cacheGet(key: string): Promise<string | null> {
  const fullKey = key;

  if (redis) {
    try {
      return await redis.get(fullKey);
    } catch {
      return null;
    }
  }

  // 内存缓存降级
  const entry = memoryCache.get(fullKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(fullKey);
    return null;
  }
  return entry.value;
}

/**
 * 设置缓存
 */
export async function cacheSet(key: string, value: string, ttl: number = 300): Promise<void> {
  if (redis) {
    try {
      await redis.setex(key, ttl, value);
      return;
    } catch {
      // 降级到内存
    }
  }

  // 内存缓存
  memoryCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });

  // 防止内存泄漏：超过 1000 条时清理过期
  if (memoryCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of memoryCache) {
      if (v.expiresAt < now) memoryCache.delete(k);
    }
  }
}

/**
 * 删除缓存（支持前缀匹配）
 */
export async function cacheDel(pattern: string): Promise<void> {
  if (redis) {
    try {
      if (pattern.includes('*')) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) await redis.del(...keys);
      } else {
        await redis.del(pattern);
      }
      return;
    } catch {
      // 降级
    }
  }

  // 内存缓存：前缀匹配
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) memoryCache.delete(key);
    }
  } else {
    memoryCache.delete(pattern);
  }
}

/**
 * 缓存包装器 — 自动缓存函数结果
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 300,
): Promise<T> {
  const cached = await cacheGet(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // 缓存损坏，重新获取
    }
  }

  const result = await fn();
  await cacheSet(key, JSON.stringify(result), ttl);
  return result;
}

/**
 * 获取缓存统计
 */
export function getCacheStats() {
  return {
    provider: redis ? 'redis' : 'memory',
    memorySize: memoryCache.size,
  };
}
