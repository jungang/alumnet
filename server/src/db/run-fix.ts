import { pool } from '../config/database';

async function fixMessagesCategory() {
  try {
    console.log('开始修复messages表category字段...');
    
    // 检查字段是否存在
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'alumni_system' 
      AND table_name = 'messages' 
      AND column_name = 'category'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('category字段不存在，开始添加...');
      
      // 添加字段
      await pool.query(`
        ALTER TABLE alumni_system.messages 
        ADD COLUMN category VARCHAR(20) DEFAULT 'school' 
        CHECK (category IN ('school', 'teacher', 'classmate'))
      `);
      console.log('✅ category字段添加成功');
      
      // 更新现有数据
      await pool.query(`
        UPDATE alumni_system.messages 
        SET category = 'school' 
        WHERE category IS NULL
      `);
      console.log('✅ 现有数据已更新');
      
      // 创建索引
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_messages_category 
        ON alumni_system.messages(category)
      `);
      console.log('✅ 索引创建成功');
    } else {
      console.log('category字段已存在，无需修复');
    }
    
    console.log('数据库修复完成！');
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixMessagesCategory();
