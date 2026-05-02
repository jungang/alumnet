import { pool } from '../config/database';

async function checkMissingBiography() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    // 查找有照片但缺少传记的校友
    const missingBio = await pool.query(`
      SELECT 
        a.name,
        a.graduation_year,
        a.biography,
        a.extra_info->>'photo' as photo,
        d.achievement
      FROM alumni a
      LEFT JOIN distinguished_alumni d ON a.id = d.alumni_id
      WHERE a.extra_info->>'photo' IS NOT NULL
        AND (a.biography IS NULL OR a.biography = '' OR LENGTH(a.biography) < 20)
      ORDER BY a.name
    `);
    
    console.log('=== 有照片但缺少完整传记的校友 ===');
    console.log(`共 ${missingBio.rows.length} 人\n`);
    
    missingBio.rows.forEach(row => {
      console.log(`- ${row.name} (${row.graduation_year || '未知'}届)`);
      console.log(`  照片: ${row.photo}`);
      console.log(`  传记: ${row.biography ? row.biography.substring(0, 50) + '...' : '无'}`);
      console.log(`  成就: ${row.achievement || '无'}`);
      console.log('');
    });
    
    // 查找所有杰出校友的数据完整性
    const allDistinguished = await pool.query(`
      SELECT 
        a.name,
        a.graduation_year,
        CASE WHEN a.biography IS NOT NULL AND LENGTH(a.biography) > 20 THEN '✓' ELSE '✗' END as has_bio,
        CASE WHEN a.extra_info->>'photo' IS NOT NULL THEN '✓' ELSE '✗' END as has_photo,
        CASE WHEN d.achievement IS NOT NULL AND d.achievement != '' THEN '✓' ELSE '✗' END as has_achievement
      FROM alumni a
      JOIN distinguished_alumni d ON a.id = d.alumni_id
      ORDER BY a.name
    `);
    
    console.log('\n=== 杰出校友数据完整性检查 ===');
    console.log('姓名\t\t传记\t照片\t成就');
    console.log('-'.repeat(50));
    
    let incompleteCount = 0;
    allDistinguished.rows.forEach(row => {
      const name = row.name.padEnd(10, '　');
      const isComplete = row.has_bio === '✓' && row.has_achievement === '✓';
      if (!isComplete) incompleteCount++;
      console.log(`${name}\t${row.has_bio}\t${row.has_photo}\t${row.has_achievement}`);
    });
    
    console.log('-'.repeat(50));
    console.log(`总计: ${allDistinguished.rows.length} 人, 不完整: ${incompleteCount} 人`);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await pool.end();
  }
}

checkMissingBiography();
