import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // SSL 配置：生产环境应设置 DB_SSL=true 并配置有效证书
  // rejectUnauthorized 必须为 true，否则 SSL 等于没用
  ssl: process.env.DB_SSL === 'true'
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        // 如需自定义 CA 证书，设置 DB_SSL_CA_PATH 环境变量
        ...(process.env.DB_SSL_CA_PATH ? { ca: require('fs').readFileSync(process.env.DB_SSL_CA_PATH).toString() } : {}),
      }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
};

// 启动时仅打印非敏感信息
logger.info({ host: dbConfig.host, port: dbConfig.port, ssl: !!dbConfig.ssl, poolMax: dbConfig.max }, '数据库配置');

export const pool = new Pool(dbConfig);

// 慢查询日志 — 记录超过阈值的查询
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500');

pool.on('error', (err) => {
  logger.error({ err }, '数据库连接池错误');
});

/**
 * 执行查询并记录慢查询
 * 用法: await query('SELECT ...', [params])
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn({ sql: text.substring(0, 200), duration, rows: result.rowCount }, '慢查询');
    }
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error({ err: error, sql: text.substring(0, 200), duration }, '查询失败');
    throw error;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    // 设置默认 schema 为 alumni_system
    await client.query('SET search_path TO alumni_system, public');
    await client.query('SELECT 1');
    client.release();
    logger.info('数据库连接成功');
    return true;
  } catch (error) {
    logger.error({ err: error }, '数据库连接失败');
    return false;
  }
}

// 初始化连接池时设置默认 schema
pool.on('connect', (client) => {
  client.query('SET search_path TO alumni_system, public');
});
