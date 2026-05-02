import { pool } from '../config/database';

/**
 * 示例杰出校友数据导入脚本
 * 包含虚构示例数据，仅供演示使用
 * 支持更新已存在记录（幂等性）
 */

interface TaoliAlumni {
  name: string;
  category: string;
  achievement: string;
  biography: string;
  graduationYear?: number;
  currentCity?: string;
  workUnit?: string;
}

// 示例杰出校友数据（虚构，仅供演示）
const completeTaoliData: TaoliAlumni[] = [
  {
    name: '张明远',
    category: '学术',
    achievement: '某国家重点实验室主任、著名物理学家',
    biography: '某知名大学物理系教授，长期从事凝聚态物理研究。早年就读于母校，期间对物理学产生浓厚兴趣。后考入某知名大学物理系，获博士学位。先后在某研究院从事科研工作，在量子材料领域取得重要突破，发表论文百余篇，培养博士研究生三十余名。',
    graduationYear: 1930,
    currentCity: '北京',
    workUnit: '某研究院',
  },
  {
    name: '李志学',
    category: '革命烈士',
    achievement: '抗日救国运动先驱、革命志士',
    biography: '早年就读于母校，在校期间受进步思想影响，积极参加反帝爱国运动。毕业后投身革命事业，长期从事地下工作。在艰苦卓绝的斗争环境中，始终坚守信念，为民族解放事业做出了重要贡献。',
    graduationYear: 1925,
  },
  {
    name: '王思远',
    category: '科技',
    achievement: '长征系列火箭副总设计师',
    biography: '航天领域资深专家。早年就读于母校，后考入某理工大学飞行器设计专业。长期从事运载火箭研制工作，参与了多个国家重大航天工程项目，为我国航天事业的发展做出了突出贡献。曾获国家科技进步奖。',
    graduationYear: 1950,
    currentCity: '北京',
    workUnit: '某航天研究院',
  },
  {
    name: '赵文博',
    category: '文化',
    achievement: '著名作家、文学评论家',
    biography: '当代知名作家。早年就读于母校，在校期间展现出卓越的文学才华。后考入某大学中文系，毕业后从事文学创作与批评工作。发表长篇小说十余部，多次获得国家级文学奖项，作品被翻译成多种语言出版。',
    graduationYear: 1967,
    currentCity: '上海',
    workUnit: '某作家协会',
  },
  {
    name: '陈雪晴',
    category: '医疗',
    achievement: '某知名医院院长、心血管外科专家',
    biography: '心血管外科领域的权威专家。早年就读于母校，后考入某医科大学临床医学专业。经过多年的临床实践和科研积累，在心脏外科微创手术领域取得多项创新成果，完成高难度手术逾千例，培养了大批优秀医学人才。',
    graduationYear: 1982,
    currentCity: '北京',
    workUnit: '某知名医院',
  },
  {
    name: '林浩然',
    category: '学术',
    achievement: '某知名大学天文系教授、天体物理学家',
    biography: '天体物理学领域的新锐学者。早年就读于母校，后考入某知名大学物理系，本科毕业后保送研究生，后赴海外深造获博士学位。在系外行星观测和星系演化领域取得了重要研究成果，发表SCI论文数十篇。',
    graduationYear: 2000,
    currentCity: '北京',
    workUnit: '某知名大学',
  },
];

/**
 * 导入示例杰出校友数据（幂等操作）
 */
async function importCompleteTaoliData() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    console.log('=== 示例杰出校友数据导入 ===\n');
    console.log(`准备导入/更新 ${completeTaoliData.length} 位校友数据\n`);

    let addedCount = 0;
    let updatedCount = 0;
    const errors: Array<{ name: string; reason: string }> = [];

    for (const alumniData of completeTaoliData) {
      try {
        // 验证必填字段
        if (!alumniData.name || !alumniData.biography) {
          errors.push({ name: alumniData.name, reason: '缺少必填字段' });
          continue;
        }

        // 检查是否已存在
        const existing = await pool.query(
          'SELECT id, extra_info FROM alumni WHERE name = $1',
          [alumniData.name]
        );

        let alumniId: string;

        if (existing.rows.length > 0) {
          // 更新现有记录，保留照片信息
          alumniId = existing.rows[0].id;
          const existingExtraInfo = existing.rows[0].extra_info || {};
          
          await pool.query(
            `UPDATE alumni 
             SET biography = $1, 
                 graduation_year = COALESCE($2, graduation_year), 
                 industry = $3,
                 current_city = COALESCE($4, current_city),
                 work_unit = COALESCE($5, work_unit),
                 extra_info = extra_info || $6::jsonb,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $7`,
            [
              alumniData.biography,
              alumniData.graduationYear,
              alumniData.category,
              alumniData.currentCity,
              alumniData.workUnit,
              JSON.stringify({
                source: '示例数据',
                achievement: alumniData.achievement,
              }),
              alumniId,
            ]
          );
          updatedCount++;
          console.log(`✓ 更新: ${alumniData.name}`);
        } else {
          // 插入新记录
          const result = await pool.query(
            `INSERT INTO alumni 
             (name, graduation_year, biography, industry, current_city, work_unit, extra_info)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              alumniData.name,
              alumniData.graduationYear,
              alumniData.biography,
              alumniData.category,
              alumniData.currentCity,
              alumniData.workUnit,
              JSON.stringify({
                source: '示例数据',
                achievement: alumniData.achievement,
              }),
            ]
          );
          alumniId = result.rows[0].id;
          addedCount++;
          console.log(`✓ 新增: ${alumniData.name}`);
        }

        // 检查杰出校友记录
        const existingDistinguished = await pool.query(
          'SELECT id FROM distinguished_alumni WHERE alumni_id = $1',
          [alumniId]
        );

        if (existingDistinguished.rows.length === 0) {
          // 添加杰出校友记录
          await pool.query(
            `INSERT INTO distinguished_alumni 
             (alumni_id, category, achievement, popularity)
             VALUES ($1, $2, $3, $4)`,
            [alumniId, alumniData.category, alumniData.achievement, 100]
          );
          console.log(`  -> 添加杰出校友记录`);
        } else {
          // 更新杰出校友记录
          await pool.query(
            `UPDATE distinguished_alumni 
             SET category = $1, achievement = $2
             WHERE id = $3`,
            [alumniData.category, alumniData.achievement, existingDistinguished.rows[0].id]
          );
          console.log(`  -> 更新杰出校友记录`);
        }

      } catch (error) {
        errors.push({ 
          name: alumniData.name, 
          reason: error instanceof Error ? error.message : '未知错误' 
        });
        console.error(`✗ 处理失败: ${alumniData.name}`, error);
      }
    }

    // 统计
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM alumni WHERE extra_info->>'source' = '示例数据') as sample_count,
        (SELECT COUNT(*) FROM distinguished_alumni) as distinguished_count,
        (SELECT COUNT(*) FROM alumni WHERE biography IS NOT NULL AND biography != '') as with_biography
    `);

    console.log('\n=== 导入统计 ===');
    console.log(`新增: ${addedCount}`);
    console.log(`更新: ${updatedCount}`);
    console.log(`失败: ${errors.length}`);
    console.log(`示例校友总数: ${stats.rows[0].sample_count}`);
    console.log(`杰出校友总数: ${stats.rows[0].distinguished_count}`);
    console.log(`有传记的校友: ${stats.rows[0].with_biography}`);

    if (errors.length > 0) {
      console.log('\n=== 错误详情 ===');
      errors.forEach(err => {
        console.log(`${err.name}: ${err.reason}`);
      });
    }

    // 验证数据完整性
    const incompleteResult = await pool.query(`
      SELECT name 
      FROM alumni 
      WHERE extra_info->>'source' = '示例数据'
        AND (biography IS NULL OR biography = '')
    `);

    if (incompleteResult.rows.length > 0) {
      console.log('\n⚠ 警告: 发现缺少传记的记录:');
      incompleteResult.rows.forEach(row => {
        console.log(`  - ${row.name}`);
      });
    } else {
      console.log('\n✓ 所有示例校友记录数据完整');
    }

  } catch (error) {
    console.error('导入失败:', error);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  importCompleteTaoliData();
}

export { importCompleteTaoliData, completeTaoliData };
