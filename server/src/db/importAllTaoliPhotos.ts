import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 导入所有桃李厅照片并创建杰出校友记录
 * 按照文件名序号设置显示顺序
 */

interface PhotoInfo {
  序号: number;
  姓名: string;
  文件名: string;
  类别?: string;
  成就?: string;
}

const SOURCE_DIR = path.join(__dirname, '../../../docs/资料/杰出校友（照片）/桃李（照片）');
const TARGET_DIR = path.join(__dirname, '../../../client/public/alumni-photos');

// 从桃李厅文档中提取的校友信息（根据序号）
const taoliInfo: Record<string, { category: string; achievement: string }> = {
  '金日成': { category: '政界', achievement: '朝鲜民主主义人民共和国创建者、国家主席' },
  '赵尚志': { category: '革命烈士', achievement: '东北抗日联军创建人和领导人之一' },
  '隋任民': { category: '革命烈士', achievement: '抗日英雄' },
  '纪儒林': { category: '革命烈士', achievement: '革命先烈' },
  '陈翰章': { category: '革命烈士', achievement: '东北抗日联军将领' },
  '彭桓武': { category: '学术', achievement: '两弹一星功勋科学家、中国科学院院士' },
  '马宗晋': { category: '学术', achievement: '地质学家、中国科学院院士' },
  // 其他校友使用默认类别
};

async function importAllTaoliPhotos() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    console.log('=== 导入桃李厅照片 ===\n');
    console.log(`源目录: ${SOURCE_DIR}`);
    console.log(`目标目录: ${TARGET_DIR}\n`);
    
    // 确保目标目录存在
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }
    
    // 读取所有照片文件
    const files = fs.readdirSync(SOURCE_DIR).filter(file => 
      /\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i.test(file)
    );
    
    console.log(`找到 ${files.length} 个照片文件\n`);
    
    const photoInfos: PhotoInfo[] = [];
    
    // 解析文件名
    for (const file of files) {
      const match = file.match(/^(\d+)[\.\s]*(.+)\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i);
      if (match) {
        const 序号 = parseInt(match[1]);
        const 姓名 = match[2].trim();
        photoInfos.push({ 序号, 姓名, 文件名: file });
      } else {
        // 没有序号的文件（如"郑墉.png"）
        const nameMatch = file.match(/^(.+)\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i);
        if (nameMatch) {
          const 姓名 = nameMatch[1].trim();
          photoInfos.push({ 序号: 999, 姓名, 文件名: file });
        }
      }
    }
    
    // 按序号排序
    photoInfos.sort((a, b) => a.序号 - b.序号);
    
    let copiedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const info of photoInfos) {
      console.log(`处理 ${info.序号}. ${info.姓名}`);
      
      // 复制照片
      const sourcePath = path.join(SOURCE_DIR, info.文件名);
      const ext = path.extname(info.文件名).toLowerCase();
      const targetFileName = `${info.姓名}${ext}`;
      const targetPath = path.join(TARGET_DIR, targetFileName);
      
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`  ✓ 复制照片: ${targetFileName}`);
        copiedCount++;
      } else {
        console.log(`  - 照片已存在: ${targetFileName}`);
      }
      
      // 查找或创建校友记录
      let alumniResult = await pool.query(
        'SELECT id FROM alumni WHERE name = $1',
        [info.姓名]
      );
      
      let alumniId: string;
      
      if (alumniResult.rows.length === 0) {
        // 创建新校友记录
        const insertResult = await pool.query(
          `INSERT INTO alumni (name, graduation_year, class_name, photo_url, extra_info)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            info.姓名,
            null,
            null,
            `/alumni-photos/${targetFileName}`,
            JSON.stringify({ source: '桃李厅', 序号: info.序号 })
          ]
        );
        alumniId = insertResult.rows[0].id;
        console.log(`  ✓ 创建校友记录`);
      } else {
        alumniId = alumniResult.rows[0].id;
        // 更新照片URL
        await pool.query(
          'UPDATE alumni SET photo_url = $1 WHERE id = $2',
          [`/alumni-photos/${targetFileName}`, alumniId]
        );
        console.log(`  ✓ 更新照片URL`);
      }
      
      // 检查是否已有杰出校友记录
      const distinguishedResult = await pool.query(
        'SELECT id FROM distinguished_alumni WHERE alumni_id = $1',
        [alumniId]
      );
      
      if (distinguishedResult.rows.length === 0) {
        // 创建杰出校友记录
        const alumniInfo = taoliInfo[info.姓名] || {
          category: '学术',
          achievement: '杰出校友'
        };
        
        // 使用序号作为 popularity，序号越小越靠前
        const popularity = 1000 - info.序号;
        
        await pool.query(
          `INSERT INTO distinguished_alumni (alumni_id, category, achievement, popularity)
           VALUES ($1, $2, $3, $4)`,
          [alumniId, alumniInfo.category, alumniInfo.achievement, popularity]
        );
        console.log(`  ✓ 创建杰出校友记录 (类别: ${alumniInfo.category}, 优先级: ${popularity})`);
        createdCount++;
      } else {
        // 更新 popularity
        const popularity = 1000 - info.序号;
        await pool.query(
          'UPDATE distinguished_alumni SET popularity = $1 WHERE alumni_id = $2',
          [popularity, alumniId]
        );
        console.log(`  ✓ 更新优先级: ${popularity}`);
        updatedCount++;
      }
      
      console.log('');
    }
    
    // 统计
    const totalResult = await pool.query('SELECT COUNT(*) FROM distinguished_alumni');
    const photoResult = await pool.query(`
      SELECT COUNT(*) 
      FROM distinguished_alumni da
      JOIN alumni a ON da.alumni_id = a.id
      WHERE a.photo_url IS NOT NULL
    `);
    
    console.log('=== 导入统计 ===');
    console.log(`照片复制: ${copiedCount}`);
    console.log(`杰出校友记录创建: ${createdCount}`);
    console.log(`杰出校友记录更新: ${updatedCount}`);
    console.log(`杰出校友总数: ${totalResult.rows[0].count}`);
    console.log(`有照片的杰出校友: ${photoResult.rows[0].count}`);
    
  } catch (error) {
    console.error('导入失败:', error);
  } finally {
    await pool.end();
  }
}

importAllTaoliPhotos();
