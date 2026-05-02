import { pool } from '../config/database';

/**
 * 将状元数据导入为杰出校友（类别：状元榜）
 * 基于状元文字.doc完整资料
 */

interface TopScholarData {
  name: string;
  examYear: number;
  rankDescription: string;
  university: string;
  biography: string;
}

// 状元榜完整数据
const topScholarsData: TopScholarData[] = [
  {
    name: '吕万革',
    examYear: 1986,
    rankDescription: '1986年全国高考吉林地区理科第一名',
    university: '南开大学',
    biography: '1986年全国高考吉林地区理科第一名，考入南开大学。美国哈佛大学博士、加州大学终身教授。',
  },
  {
    name: '刘旸',
    examYear: 1987,
    rankDescription: '1987年全国高考吉林省文科第一名',
    university: '北京大学',
    biography: '1987年全国高考吉林省文科第一名，考入北京大学。',
  },
  {
    name: '张晓也',
    examYear: 1996,
    rankDescription: '1996年全国高考吉林地区文科第一名、吉林省第二名',
    university: '中国政法大学',
    biography: '1996年全国高考吉林地区文科第一名、吉林省第二名，考入中国政法大学。',
  },
  {
    name: '王琳',
    examYear: 1998,
    rankDescription: '1998年全国高考吉林地区文科第一名',
    university: '北京大学',
    biography: '1998年全国高考吉林地区文科第一名，考入北京大学。',
  },
  {
    name: '陈超',
    examYear: 1999,
    rankDescription: '1999年全国高考吉林地区文科第一名',
    university: '北京大学',
    biography: '1999年全国高考吉林地区文科第一名，考入北京大学。',
  },
  {
    name: '邱爽',
    examYear: 2001,
    rankDescription: '2001年全国高考吉林地区文科第一名',
    university: '北京大学',
    biography: '2001年全国高考吉林地区文科第一名，考入北京大学。',
  },
  {
    name: '王博宇',
    examYear: 2004,
    rankDescription: '2004年全国高考吉林地区文科第一名',
    university: '中国人民大学',
    biography: '2004年全国高考吉林地区文科第一名，考入中国人民大学。',
  },
  {
    name: '佟爽',
    examYear: 2005,
    rankDescription: '2005年全国高考吉林地区文科第一名',
    university: '北京大学',
    biography: '2005年全国高考吉林地区文科第一名，考入北京大学。',
  },
  {
    name: '孙一丁',
    examYear: 2006,
    rankDescription: '2006年全国高考吉林省文科第一名',
    university: '北京大学',
    biography: '2006年全国高考吉林省文科第一名，考入北京大学。',
  },
  {
    name: '王重远',
    examYear: 2007,
    rankDescription: '2007年全国高考吉林地区文科第一名',
    university: '中国人民大学',
    biography: '2007年全国高考吉林地区文科第一名，考入中国人民大学。',
  },
  {
    name: '高林溪',
    examYear: 2008,
    rankDescription: '2008年全国高考吉林地区文科第一名',
    university: '北京大学',
    biography: '2008年全国高考吉林地区文科第一名，考入北京大学。',
  },
  {
    name: '段然佳',
    examYear: 2010,
    rankDescription: '2010年全国高考吉林地区文科第一名',
    university: '北京大学',
    biography: '2010年全国高考吉林地区文科第一名，考入北京大学。',
  },
  {
    name: '吴明轩',
    examYear: 2016,
    rankDescription: '2016年全国高考吉林地区文科第一名',
    university: '北京大学',
    biography: '2016年全国高考吉林地区文科第一名，考入北京大学。',
  },
  {
    name: '马境晗',
    examYear: 2024,
    rankDescription: '2024年全国高考吉林地区历史类第一名、吉林省第四名',
    university: '北京大学元培学院',
    biography: '2024年全国高考吉林地区历史类第一名、吉林省第四名，考入北京大学元培学院。',
  },
];

async function importTopScholarsAsDistinguished() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    console.log('=== 状元榜数据导入（作为杰出校友） ===\n');
    console.log(`准备导入 ${topScholarsData.length} 位状元\n`);

    let addedCount = 0;
    let updatedCount = 0;
    const errors: Array<{ name: string; reason: string }> = [];

    for (const scholar of topScholarsData) {
      try {
        // 检查校友是否已存在
        const existing = await pool.query(
          'SELECT id, biography FROM alumni WHERE name = $1',
          [scholar.name]
        );

        let alumniId: string;

        if (existing.rows.length > 0) {
          // 更新现有记录
          alumniId = existing.rows[0].id;
          const existingBio = existing.rows[0].biography || '';
          
          // 如果现有传记更详细，保留它；否则使用状元信息
          const newBio = existingBio.length > scholar.biography.length ? existingBio : scholar.biography;
          
          await pool.query(
            `UPDATE alumni 
             SET biography = COALESCE(NULLIF($1, ''), biography),
                 graduation_year = COALESCE($2, graduation_year),
                 extra_info = COALESCE(extra_info, '{}'::jsonb) || $3::jsonb,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [
              newBio,
              scholar.examYear,
              JSON.stringify({
                isTopScholar: true,
                examYear: scholar.examYear,
                rankDescription: scholar.rankDescription,
                university: scholar.university,
              }),
              alumniId,
            ]
          );
          updatedCount++;
          console.log(`✓ 更新校友: ${scholar.name}`);
        } else {
          // 插入新校友记录
          const result = await pool.query(
            `INSERT INTO alumni 
             (name, graduation_year, biography, industry, extra_info)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              scholar.name,
              scholar.examYear,
              scholar.biography,
              '状元榜',
              JSON.stringify({
                source: '状元榜',
                isTopScholar: true,
                examYear: scholar.examYear,
                rankDescription: scholar.rankDescription,
                university: scholar.university,
              }),
            ]
          );
          alumniId = result.rows[0].id;
          addedCount++;
          console.log(`✓ 新增校友: ${scholar.name}`);
        }

        // 检查杰出校友记录
        const existingDistinguished = await pool.query(
          'SELECT id, category FROM distinguished_alumni WHERE alumni_id = $1',
          [alumniId]
        );

        if (existingDistinguished.rows.length === 0) {
          // 添加杰出校友记录（类别：状元榜）
          await pool.query(
            `INSERT INTO distinguished_alumni 
             (alumni_id, category, achievement, popularity)
             VALUES ($1, $2, $3, $4)`,
            [alumniId, '状元榜', scholar.rankDescription, 100]
          );
          console.log(`  -> 添加杰出校友记录（状元榜）`);
        } else {
          // 如果已有杰出校友记录但不是状元榜类别，更新为状元榜
          // 或者保留原类别，只更新成就信息
          const currentCategory = existingDistinguished.rows[0].category;
          if (currentCategory !== '状元榜') {
            // 保留原类别，但在成就中添加状元信息
            await pool.query(
              `UPDATE distinguished_alumni 
               SET achievement = CASE 
                 WHEN achievement NOT LIKE '%高考%' THEN achievement || '；' || $1
                 ELSE achievement
               END
               WHERE id = $2`,
              [scholar.rankDescription, existingDistinguished.rows[0].id]
            );
            console.log(`  -> 更新杰出校友成就（保留原类别：${currentCategory}）`);
          } else {
            console.log(`  -> 已是状元榜类别，跳过`);
          }
        }

      } catch (error) {
        errors.push({ 
          name: scholar.name, 
          reason: error instanceof Error ? error.message : '未知错误' 
        });
        console.error(`✗ 处理失败: ${scholar.name}`, error);
      }
    }

    // 统计
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM distinguished_alumni WHERE category = '状元榜') as top_scholar_count,
        (SELECT COUNT(*) FROM alumni WHERE extra_info->>'isTopScholar' = 'true') as alumni_with_scholar_flag,
        (SELECT COUNT(*) FROM distinguished_alumni) as total_distinguished
    `);

    console.log('\n=== 导入统计 ===');
    console.log(`新增校友: ${addedCount}`);
    console.log(`更新校友: ${updatedCount}`);
    console.log(`失败: ${errors.length}`);
    console.log(`状元榜类别杰出校友: ${stats.rows[0].top_scholar_count}`);
    console.log(`标记为状元的校友: ${stats.rows[0].alumni_with_scholar_flag}`);
    console.log(`杰出校友总数: ${stats.rows[0].total_distinguished}`);

    if (errors.length > 0) {
      console.log('\n=== 错误详情 ===');
      errors.forEach(err => {
        console.log(`${err.name}: ${err.reason}`);
      });
    }

  } catch (error) {
    console.error('导入失败:', error);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  importTopScholarsAsDistinguished();
}

export { importTopScholarsAsDistinguished, topScholarsData };
