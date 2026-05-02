import { pool } from '../config/database';

async function verifyGuanQi() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    const result = await pool.query(`
      SELECT 
        a.id,
        a.name,
        a.graduation_year,
        a.biography,
        a.industry,
        a.current_city,
        a.work_unit,
        a.extra_info,
        d.achievement as d_achievement,
        d.category as d_category
      FROM alumni a
      LEFT JOIN distinguished_alumni d ON a.id = d.alumni_id
      WHERE a.name = '关琦'
    `);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('=== 关琦的完整数据 ===');
      console.log('姓名:', row.name);
      console.log('毕业年份:', row.graduation_year);
      console.log('行业:', row.industry);
      console.log('所在城市:', row.current_city);
      console.log('工作单位:', row.work_unit);
      console.log('传记:', row.biography);
      console.log('成就:', row.d_achievement);
      console.log('类别:', row.d_category);
      console.log('额外信息:', JSON.stringify(row.extra_info, null, 2));
    } else {
      console.log('未找到关琦的数据');
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await pool.end();
  }
}

verifyGuanQi();
