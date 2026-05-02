import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

// 状元照片目录
const PHOTO_SOURCE_DIR = 'D:\\校友录\\docs\\资料\\状元照片\\状元照片';
// 目标目录 (服务器上的 alumni-photos)
const PHOTO_TARGET_DIR = 'D:\\校友录\\client\\public\\alumni-photos';

// 照片文件名到校友名的映射
const photoMapping: Record<string, string> = {
  '1. 吕万革.jpg': '吕万革',
  '2. 刘旸.jpg': '刘旸',
  '3.张晓也.jpg': '张晓也',
  '4 .王琳.jpg': '王琳',
  '5 。陈超.JPG': '陈超',
  '6.邱爽.JPG': '邱爽',
  '7 .王博宇.JPG': '王博宇',
  '8.佟爽.jpg': '佟爽',
  '9.孙一丁.jpg': '孙一丁',
  '10.王重远.JPG': '王重远',
  '11 .高林溪.JPG': '高林溪',
  '12 .段然佳.JPG': '段然佳',
  '13 .吴明轩.jpg': '吴明轩',
  '14.马境晗.png': '马境晗',
};

async function importTopScholarPhotos() {
  const client = await pool.connect();
  
  try {
    // 确保目标目录存在
    if (!fs.existsSync(PHOTO_TARGET_DIR)) {
      fs.mkdirSync(PHOTO_TARGET_DIR, { recursive: true });
    }
    
    console.log('开始导入状元照片...');
    console.log('='.repeat(60));
    
    let success = 0;
    let failed = 0;
    
    for (const [filename, alumniName] of Object.entries(photoMapping)) {
      const sourcePath = path.join(PHOTO_SOURCE_DIR, filename);
      
      // 检查源文件是否存在
      if (!fs.existsSync(sourcePath)) {
        console.log(`✗ ${alumniName}: 源文件不存在 - ${filename}`);
        failed++;
        continue;
      }
      
      // 生成新文件名 (统一为 .jpg)
      const ext = path.extname(filename).toLowerCase();
      const newFilename = `zhuangyuan_${alumniName}${ext}`;
      const targetPath = path.join(PHOTO_TARGET_DIR, newFilename);
      
      // 复制文件
      fs.copyFileSync(sourcePath, targetPath);
      
      // 更新数据库
      const photoUrl = `/alumni-photos/${newFilename}`;
      
      const result = await client.query(`
        UPDATE alumni 
        SET photo_url = $1
        WHERE name = $2
        RETURNING id, name
      `, [photoUrl, alumniName]);
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`✓ ${alumniName}: 照片已导入 - ${photoUrl}`);
        success++;
      } else {
        console.log(`? ${alumniName}: 文件已复制但数据库中未找到该校友`);
        failed++;
      }
    }
    
    console.log('='.repeat(60));
    console.log(`导入完成: 成功 ${success}, 失败 ${failed}`);
    
    // 验证结果
    console.log('\n验证状元榜照片情况:');
    const verifyResult = await client.query(`
      SELECT a.name, a.graduation_year, a.photo_url
      FROM distinguished_alumni d
      JOIN alumni a ON d.alumni_id = a.id
      WHERE d.category = '状元榜'
      ORDER BY a.graduation_year DESC
    `);
    
    for (const row of verifyResult.rows) {
      const hasPhoto = row.photo_url ? '✓' : '✗';
      console.log(`${hasPhoto} ${row.name} (${row.graduation_year}届) - ${row.photo_url || '无照片'}`);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

importTopScholarPhotos().catch(console.error);
