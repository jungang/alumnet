import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 增加到30秒
};

console.log('数据库配置:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  ssl: !!dbConfig.ssl,
});

export const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('数据库连接池错误:', err);
});

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    // 设置默认 schema 为 alumni_system
    await client.query('SET search_path TO alumni_system, public');
    await client.query('SELECT 1');
    client.release();
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
}

// 初始化连接池时设置默认 schema
pool.on('connect', (client) => {
  client.query('SET search_path TO alumni_system, public');
});
