import { pool } from '../config/database';

async function createKnowledgeTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS alumni_system.knowledge_base (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'webpage', 'document')),
        content TEXT,
        source VARCHAR(1000),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ knowledge_base 表创建成功');
  } catch (error) {
    console.error('创建表失败:', error);
  } finally {
    await pool.end();
  }
}

createKnowledgeTable();
