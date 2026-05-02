import { pool } from '../config/database';

async function checkTopScholarPhotos() {
  const client = await pool.connect();
  try {
    // 查询状元榜校友的照片情况 (通过 alumni_id 关联 alumni 表)
    const result = await client.query(`
      SELECT a.name, a.graduation_year, a.photo_url, d.category, d.achievement
      FROM distinguished_alumni d
      JOIN alumni a ON d.alumni_id = a.id
      WHERE d.category = '状元榜'
      ORDER BY a.graduation_year DESC
    `);
    
    console.log('状元榜校友照片情况:');
    console.log('='.repeat(70));
    
    let withPhoto = 0;
    let withoutPhoto = 0;
    
    for (const row of result.rows) {
      const hasPhoto = row.photo_url ? '✓' : '✗';
      if (row.photo_url) withPhoto++;
      else withoutPhoto++;
      console.log(`${hasPhoto} ${row.name} (${row.graduation_year}届) - ${row.photo_url || '无照片'}`);
    }
    
    console.log('='.repeat(70));
    console.log(`总计: ${result.rows.length} 人`);
    console.log(`有照片: ${withPhoto} 人`);
    console.log(`无照片: ${withoutPhoto} 人`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkTopScholarPhotos().catch(console.error);
