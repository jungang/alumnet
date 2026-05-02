import { pool } from '../config/database';

async function findMissingDistinguished() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    // 查找有照片但不在杰出校友表中的校友
    const result = await pool.query(`
      SELECT a.id, a.name, a.photo_url, a.graduation_year, a.industry
      FROM alumni a
      WHERE a.photo_url IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM distinguished_alumni da WHERE da.alumni_id = a.id
        )
      ORDER BY a.name
    `);
    
    console.log(`找到 ${result.rows.length} 位有照片但不在杰出校友表中的校友:\n`);
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.name} (${row.graduation_year}届, ${row.industry || '未分类'})`);
      console.log(`   照片: ${row.photo_url}`);
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await pool.end();
  }
}

findMissingDistinguished();
