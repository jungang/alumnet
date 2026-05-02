import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('开始执行数据库迁移...\n');
    
    // 迁移文件列表
    const migrations = [
      '001_admin_management_tables.sql',
      '002_time_corridor_tables.sql'
    ];
    
    for (const migrationFile of migrations) {
      console.log(`执行迁移: ${migrationFile}`);
      
      const migrationPath = path.join(__dirname, 'migrations', migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`  ⚠️ 文件不存在，跳过`);
        continue;
      }
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      
      // 开始事务
      await client.query('BEGIN');
      
      try {
        // 执行迁移
        await client.query(migrationSQL);
        
        // 提交事务
        await client.query('COMMIT');
        console.log(`  ✅ 完成\n`);
      } catch (error: any) {
        await client.query('ROLLBACK');
        // 如果是"已存在"类型的错误，继续执行
        if (error.code === '42P07' || error.code === '42710') {
          console.log(`  ⚠️ 表或约束已存在，跳过\n`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ 所有数据库迁移完成！');
    console.log('\n新增/更新的表：');
    console.log('  - donation_projects (捐赠项目表)');
    console.log('  - alumni_associations (校友会表)');
    console.log('  - alumni_news (校友动态表)');
    console.log('  - system_config (系统配置表)');
    console.log('  - vintage_items (老物件表)');
    console.log('  - class_rosters (班级名录表)');
    console.log('  - class_students (班级学生表)');
    console.log('  - class_photo_links (班级照片关联表)');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 运行迁移
runMigration().catch(console.error);
