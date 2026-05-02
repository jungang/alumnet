import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function initDatabase() {
  console.log('开始初始化数据库...');

  try {
    // 读取并执行建表脚本
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf-8');
    
    console.log('执行建表脚本...');
    await pool.query(initSql);
    console.log('建表完成');

    // 读取并执行种子数据脚本
    const seedSqlPath = path.join(__dirname, 'seed.sql');
    const seedSql = fs.readFileSync(seedSqlPath, 'utf-8');
    
    console.log('插入初始数据...');
    await pool.query(seedSql);
    console.log('初始数据插入完成');

    // 验证数据
    const alumniCount = await pool.query('SELECT COUNT(*) FROM alumni');
    const messageCount = await pool.query('SELECT COUNT(*) FROM messages');
    const photoCount = await pool.query('SELECT COUNT(*) FROM graduation_photos');
    
    console.log('\n数据统计:');
    console.log(`- 校友数量: ${alumniCount.rows[0].count}`);
    console.log(`- 留言数量: ${messageCount.rows[0].count}`);
    console.log(`- 毕业照数量: ${photoCount.rows[0].count}`);

    console.log('\n数据库初始化完成!');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

initDatabase();
