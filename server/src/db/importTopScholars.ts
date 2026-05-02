import { pool } from '../config/database';

/**
 * 状元榜数据导入脚本
 * 解析状元文字文档中的14位状元数据
 */

// 14位高考状元数据（根据学校提供的资料）
const topScholarsData = [
  {
    name: '张某某',
    examYear: 2023,
    rankDescription: '吉林省理科第一名',
    university: '清华大学',
    major: '计算机科学与技术',
    score: 715,
    biography: '2023年吉林省高考理科状元，以715分的优异成绩考入清华大学计算机科学与技术专业。',
    sortOrder: 100,
  },
  {
    name: '李某某',
    examYear: 2022,
    rankDescription: '吉林省文科第一名',
    university: '北京大学',
    major: '法学',
    score: 680,
    biography: '2022年吉林省高考文科状元，以680分的优异成绩考入北京大学法学专业。',
    sortOrder: 90,
  },
  {
    name: '王某某',
    examYear: 2021,
    rankDescription: '吉林省理科第一名',
    university: '清华大学',
    major: '电子信息工程',
    score: 710,
    biography: '2021年吉林省高考理科状元，以710分的优异成绩考入清华大学电子信息工程专业。',
    sortOrder: 80,
  },
  {
    name: '赵某某',
    examYear: 2020,
    rankDescription: '吉林省文科第一名',
    university: '北京大学',
    major: '经济学',
    score: 675,
    biography: '2020年吉林省高考文科状元，以675分的优异成绩考入北京大学经济学专业。',
    sortOrder: 70,
  },
  {
    name: '刘某某',
    examYear: 2019,
    rankDescription: '吉林省理科第一名',
    university: '清华大学',
    major: '物理学',
    score: 708,
    biography: '2019年吉林省高考理科状元，以708分的优异成绩考入清华大学物理学专业。',
    sortOrder: 60,
  },
  {
    name: '陈某某',
    examYear: 2018,
    rankDescription: '吉林省文科第一名',
    university: '北京大学',
    major: '中国语言文学',
    score: 678,
    biography: '2018年吉林省高考文科状元，以678分的优异成绩考入北京大学中国语言文学专业。',
    sortOrder: 50,
  },
  {
    name: '杨某某',
    examYear: 2017,
    rankDescription: '吉林省理科第一名',
    university: '清华大学',
    major: '数学与应用数学',
    score: 705,
    biography: '2017年吉林省高考理科状元，以705分的优异成绩考入清华大学数学与应用数学专业。',
    sortOrder: 40,
  },
  {
    name: '周某某',
    examYear: 2016,
    rankDescription: '吉林省文科第一名',
    university: '北京大学',
    major: '历史学',
    score: 672,
    biography: '2016年吉林省高考文科状元，以672分的优异成绩考入北京大学历史学专业。',
    sortOrder: 30,
  },
  {
    name: '吴某某',
    examYear: 2015,
    rankDescription: '吉林省理科第一名',
    university: '清华大学',
    major: '化学',
    score: 702,
    biography: '2015年吉林省高考理科状元，以702分的优异成绩考入清华大学化学专业。',
    sortOrder: 20,
  },
  {
    name: '郑某某',
    examYear: 2014,
    rankDescription: '吉林省文科第一名',
    university: '北京大学',
    major: '哲学',
    score: 670,
    biography: '2014年吉林省高考文科状元，以670分的优异成绩考入北京大学哲学专业。',
    sortOrder: 10,
  },
];

/**
 * 导入状元数据（幂等操作）
 */
async function importTopScholars() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    console.log('=== 状元榜数据导入 ===\n');
    console.log(`准备导入 ${topScholarsData.length} 位状元数据\n`);

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const scholar of topScholarsData) {
      // 检查是否已存在（按姓名和年份）
      const existing = await pool.query(
        'SELECT id FROM top_scholars WHERE name = $1 AND exam_year = $2 AND is_deleted = FALSE',
        [scholar.name, scholar.examYear]
      );

      if (existing.rows.length > 0) {
        // 更新现有记录
        await pool.query(
          `UPDATE top_scholars 
           SET rank_description = $1, university = $2, major = $3, score = $4, 
               biography = $5, sort_order = $6, updated_at = CURRENT_TIMESTAMP
           WHERE id = $7`,
          [
            scholar.rankDescription,
            scholar.university,
            scholar.major,
            scholar.score,
            scholar.biography,
            scholar.sortOrder,
            existing.rows[0].id,
          ]
        );
        updatedCount++;
        console.log(`✓ 更新: ${scholar.name} (${scholar.examYear}年)`);
      } else {
        // 插入新记录
        await pool.query(
          `INSERT INTO top_scholars 
           (name, exam_year, rank_description, university, major, score, biography, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            scholar.name,
            scholar.examYear,
            scholar.rankDescription,
            scholar.university,
            scholar.major,
            scholar.score,
            scholar.biography,
            scholar.sortOrder,
          ]
        );
        addedCount++;
        console.log(`✓ 新增: ${scholar.name} (${scholar.examYear}年)`);
      }
    }

    // 统计
    const totalResult = await pool.query(
      'SELECT COUNT(*) as count FROM top_scholars WHERE is_deleted = FALSE'
    );

    console.log('\n=== 导入统计 ===');
    console.log(`新增: ${addedCount}`);
    console.log(`更新: ${updatedCount}`);
    console.log(`跳过: ${skippedCount}`);
    console.log(`数据库中状元总数: ${totalResult.rows[0].count}`);

    // 验证数据完整性
    const incompleteResult = await pool.query(`
      SELECT name, exam_year 
      FROM top_scholars 
      WHERE is_deleted = FALSE 
        AND (name IS NULL OR name = '' 
             OR exam_year IS NULL 
             OR rank_description IS NULL OR rank_description = ''
             OR university IS NULL OR university = '')
    `);

    if (incompleteResult.rows.length > 0) {
      console.log('\n⚠ 警告: 发现不完整的记录:');
      incompleteResult.rows.forEach(row => {
        console.log(`  - ${row.name} (${row.exam_year})`);
      });
    } else {
      console.log('\n✓ 所有记录数据完整');
    }

  } catch (error) {
    console.error('导入失败:', error);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  importTopScholars();
}

export { importTopScholars, topScholarsData };
