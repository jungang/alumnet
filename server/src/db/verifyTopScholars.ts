import { pool } from '../config/database';

async function verifyTopScholars() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    // 查询状元榜类别的杰出校友
    const result = await pool.query(`
      SELECT 
        a.name,
        a.graduation_year,
        a.biography,
        a.extra_info,
        d.category,
        d.achievement
      FROM alumni a
      JOIN distinguished_alumni d ON a.id = d.alumni_id
      WHERE d.category = '状元榜'
      ORDER BY a.graduation_year DESC
    `);
    
    console.log('=== 状元榜类别杰出校友 ===');
    console.log(`共 ${result.rows.length} 人\n`);
    
    result.rows.forEach(row => {
      console.log(`${row.name} (${row.graduation_year}届)`);
      console.log(`  成就: ${row.achievement}`);
      console.log('');
    });
    
    // 查询所有标记为状元的校友（包括其他类别）
    const allScholars = await pool.query(`
      SELECT 
        a.name,
        a.graduation_year,
        d.category,
        d.achievement,
        a.extra_info->>'rankDescription' as rank_desc
      FROM alumni a
      JOIN distinguished_alumni d ON a.id = d.alumni_id
      WHERE a.extra_info->>'isTopScholar' = 'true'
      ORDER BY a.graduation_year DESC
    `);
    
    console.log('\n=== 所有标记为状元的校友 ===');
    console.log(`共 ${allScholars.rows.length} 人\n`);
    
    allScholars.rows.forEach(row => {
      console.log(`${row.name} (${row.graduation_year}届) - 类别: ${row.category}`);
      console.log(`  ${row.rank_desc || row.achievement}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await pool.end();
  }
}

verifyTopScholars();
