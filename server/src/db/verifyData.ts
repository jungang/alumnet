import { pool } from '../config/database';

async function verifyData() {
  try {
    // 设置 schema
    await pool.query('SET search_path TO alumni_system, public');

    console.log('=== 数据验证 ===\n');

    // 校友数据
    const alumni = await pool.query('SELECT name, graduation_year, class_name, industry FROM alumni LIMIT 5');
    console.log('校友示例数据:');
    alumni.rows.forEach(row => {
      console.log(`  ${row.name} - ${row.graduation_year}届 ${row.class_name} - ${row.industry}`);
    });

    // 杰出校友
    const distinguished = await pool.query(`
      SELECT a.name, d.category, d.achievement 
      FROM distinguished_alumni d 
      JOIN alumni a ON d.alumni_id = a.id
    `);
    console.log('\n杰出校友:');
    distinguished.rows.forEach(row => {
      console.log(`  ${row.name} (${row.category}): ${row.achievement?.substring(0, 30)}...`);
    });

    // 留言
    const messages = await pool.query('SELECT author_name, content FROM messages WHERE status = \'approved\' LIMIT 3');
    console.log('\n已审核留言:');
    messages.rows.forEach(row => {
      console.log(`  ${row.author_name}: ${row.content?.substring(0, 30)}...`);
    });

    // 毕业照
    const photos = await pool.query('SELECT year, class_name FROM graduation_photos ORDER BY year LIMIT 5');
    console.log('\n毕业照:');
    photos.rows.forEach(row => {
      console.log(`  ${row.year}年 ${row.class_name}`);
    });

    // 统计
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM alumni) as alumni_count,
        (SELECT COUNT(*) FROM distinguished_alumni) as distinguished_count,
        (SELECT COUNT(*) FROM messages) as message_count,
        (SELECT COUNT(*) FROM graduation_photos) as photo_count,
        (SELECT COUNT(*) FROM donations) as donation_count,
        (SELECT COUNT(*) FROM users) as user_count
    `);
    console.log('\n数据统计:');
    const s = stats.rows[0];
    console.log(`  校友: ${s.alumni_count}`);
    console.log(`  杰出校友: ${s.distinguished_count}`);
    console.log(`  留言: ${s.message_count}`);
    console.log(`  毕业照: ${s.photo_count}`);
    console.log(`  捐赠记录: ${s.donation_count}`);
    console.log(`  管理员: ${s.user_count}`);

  } catch (error) {
    console.error('验证失败:', error);
  } finally {
    await pool.end();
  }
}

verifyData();
