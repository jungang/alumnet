import { pool } from '../config/database';

async function verifyKimIlSung() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    // 查询金日成的基本信息
    const alumniResult = await pool.query(
      'SELECT id, name, biography, graduation_year, industry, photo_url FROM alumni WHERE name = $1',
      ['金日成']
    );
    
    console.log('=== 金日成基本信息 ===');
    console.log(JSON.stringify(alumniResult.rows[0], null, 2));
    
    if (alumniResult.rows.length > 0) {
      const alumniId = alumniResult.rows[0].id;
      
      // 查询杰出校友信息
      const distinguishedResult = await pool.query(
        'SELECT * FROM distinguished_alumni WHERE alumni_id = $1',
        [alumniId]
      );
      
      console.log('\n=== 金日成杰出校友信息 ===');
      console.log(JSON.stringify(distinguishedResult.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await pool.end();
  }
}

verifyKimIlSung();
