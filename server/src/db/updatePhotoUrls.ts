import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 更新数据库中的照片URL
 * 基于 client/public/alumni-photos/ 目录中已存在的照片
 */

async function updatePhotoUrls() {
  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    console.log('=== 更新照片URL ===\n');
    
    // 照片目录
    const photoDir = path.join(__dirname, '../../../client/public/alumni-photos');
    
    // 读取所有照片文件
    const files = fs.readdirSync(photoDir).filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );
    
    console.log(`找到 ${files.length} 个照片文件\n`);
    
    let updated = 0;
    let notFound = 0;
    
    for (const file of files) {
      // 从文件名提取姓名（去掉扩展名）
      const name = file.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
      
      // 查找校友
      const result = await pool.query(
        'SELECT id, name FROM alumni WHERE name = $1',
        [name]
      );
      
      if (result.rows.length > 0) {
        const alumniId = result.rows[0].id;
        const photoUrl = `/alumni-photos/${file}`;
        
        // 更新照片URL
        await pool.query(
          'UPDATE alumni SET photo_url = $1 WHERE id = $2',
          [photoUrl, alumniId]
        );
        
        console.log(`✓ 更新: ${name} -> ${photoUrl}`);
        updated++;
      } else {
        console.log(`✗ 未找到: ${name}`);
        notFound++;
      }
    }
    
    console.log(`\n=== 统计 ===`);
    console.log(`更新成功: ${updated}`);
    console.log(`未找到: ${notFound}`);
    
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    await pool.end();
  }
}

updatePhotoUrls();
