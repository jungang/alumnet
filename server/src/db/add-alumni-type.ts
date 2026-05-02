import { pool } from '../config/database';

async function addAlumniTypeField() {
  try {
    console.log('开始为校友表添加 type 字段...');

    // 检查字段是否存在
    const checkResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'alumni_system'
      AND table_name = 'alumni'
      AND column_name = 'type'
    `);

    if (checkResult.rows.length === 0) {
      console.log('type 字段不存在，开始添加...');

      // 添加 type 字段
      await pool.query(`
        ALTER TABLE alumni_system.alumni
        ADD COLUMN type VARCHAR(20) DEFAULT '校友'
        CHECK (type IN ('校友', '名师', '状元', '革命烈士', '政界', '学术', '商界', '文化', '医疗', '教育'))
      `);
      console.log('✅ type 字段添加成功');

      // 创建索引
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_alumni_type
        ON alumni_system.alumni(type)
      `);
      console.log('✅ 索引创建成功');

      // 根据杰出校友表更新 type 字段
      await pool.query(`
        UPDATE alumni_system.alumni a
        SET type = CASE
          WHEN da.category = '状元榜' THEN '状元'
          WHEN da.category = '革命烈士' THEN '革命烈士'
          WHEN da.category IN ('政界', '学术', '商界', '文化', '医疗', '教育') THEN da.category
          ELSE '校友'
        END
        FROM alumni_system.distinguished_alumni da
        WHERE a.id = da.alumni_id
      `);
      console.log('✅ 已根据杰出校友数据更新 type 字段');
    } else {
      console.log('type 字段已存在，无需添加');
    }

    // 查看统计
    const statsResult = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM alumni_system.alumni
      GROUP BY type
      ORDER BY count DESC
    `);
    console.log('\n校友类型分布:');
    statsResult.rows.forEach(row => {
      console.log(`  ${row.type}: ${row.count}人`);
    });

    console.log('\n数据库迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

addAlumniTypeField();
