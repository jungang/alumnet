import { pool } from '../config/database';

async function countDistinguished() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    // 统计杰出校友总数
    const totalResult = await pool.query('SELECT COUNT(*) FROM distinguished_alumni');
    console.log('杰出校友总数:', totalResult.rows[0].count);
    
    // 按类别统计
    const categoryResult = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM distinguished_alumni
      GROUP BY category
      ORDER BY count DESC
    `);
    
    console.log('\n按类别统计:');
    categoryResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count}`);
    });
    
    // 统计有照片的校友
    const photoResult = await pool.query(`
      SELECT COUNT(*) 
      FROM distinguished_alumni da
      JOIN alumni a ON da.alumni_id = a.id
      WHERE a.photo_url IS NOT NULL
    `);
    console.log('\n有照片的校友:', photoResult.rows[0].count);
    
    // 列出所有杰出校友
    const listResult = await pool.query(`
      SELECT a.name, a.photo_url, da.category
      FROM distinguished_alumni da
      JOIN alumni a ON da.alumni_id = a.id
      ORDER BY da.category, a.name
    `);
    
    console.log('\n所有杰出校友列表:');
    listResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} (${row.category}) - 照片: ${row.photo_url ? '有' : '无'}`);
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await pool.end();
  }
}

countDistinguished();
