import { pool } from '../config/database';

async function checkMessageStatus() {
  try {
    console.log('检查messages表状态值...');
    
    // 查看不同状态的数量
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM alumni_system.messages
      GROUP BY status
    `);
    console.log('状态分布:', statusResult.rows);
    
    // 查看前5条留言的详细信息
    const messagesResult = await pool.query(`
      SELECT id, author_name, status, category, created_at
      FROM alumni_system.messages
      LIMIT 5
    `);
    console.log('留言示例:', messagesResult.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}

checkMessageStatus();
