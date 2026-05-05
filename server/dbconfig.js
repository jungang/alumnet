/**
 * node-pg-migrate 配置
 * 读取环境变量连接数据库
 * @eslint
 * global process, module
 */
/* eslint no-undef: "off" */

module.exports = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : false,
  schema: 'alumni_system',
  migrationsTable: 'pgmigrations',
  dir: 'migrations',
  // 使用 JS 格式（不需要编译）
  language: 'js',
};
