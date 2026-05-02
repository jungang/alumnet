import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 照片导入脚本
 * 从源目录复制照片到 client/public/alumni-photos/
 * 实现文件名与校友姓名匹配
 * 更新数据库中的 photo_url 字段
 */

interface ImportStats {
  total: number;
  matched: number;
  copied: number;
  failed: number;
  skipped: number;
  errors: Array<{ file: string; reason: string }>;
}

// 配置
const SOURCE_DIR = path.join(__dirname, '../../../docs/资料/杰出校友（照片）');
const TARGET_DIR = path.join(__dirname, '../../../client/public/alumni-photos');
const PHOTO_URL_PREFIX = '/xyl/alumni-photos';

/**
 * 从文件名提取可能的姓名
 */
function extractNameFromFilename(filename: string): string[] {
  // 移除扩展名
  const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
  
  // 可能的姓名模式
  const patterns = [
    // 直接是姓名
    nameWithoutExt,
    // 姓名-其他信息
    nameWithoutExt.split('-')[0],
    nameWithoutExt.split('_')[0],
    // 移除数字
    nameWithoutExt.replace(/\d+/g, ''),
    // 移除括号内容
    nameWithoutExt.replace(/[（(].*?[）)]/g, ''),
  ];
  
  return [...new Set(patterns.map(p => p.trim()).filter(p => p.length > 0))];
}

/**
 * 姓名相似度匹配
 */
function isNameMatch(filename: string, alumniName: string): boolean {
  const possibleNames = extractNameFromFilename(filename);
  
  for (const name of possibleNames) {
    // 完全匹配
    if (name === alumniName) return true;
    
    // 包含匹配
    if (name.includes(alumniName) || alumniName.includes(name)) return true;
    
    // 字符匹配（至少2个字符相同）
    const commonChars = name.split('').filter(char => alumniName.includes(char));
    if (commonChars.length >= 2) return true;
  }
  
  return false;
}

/**
 * 确保目标目录存在
 */
function ensureDirectoryExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录: ${dir}`);
  }
}

/**
 * 复制文件
 */
function copyFile(source: string, target: string): boolean {
  try {
    fs.copyFileSync(source, target);
    return true;
  } catch (error) {
    console.error(`复制文件失败: ${source} -> ${target}`, error);
    return false;
  }
}

/**
 * 主导入函数
 */
async function importPhotos() {
  const stats: ImportStats = {
    total: 0,
    matched: 0,
    copied: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    await pool.query('SET search_path TO alumni_system, public');
    
    console.log('=== 照片导入脚本 ===\n');
    console.log(`源目录: ${SOURCE_DIR}`);
    console.log(`目标目录: ${TARGET_DIR}\n`);

    // 检查源目录
    if (!fs.existsSync(SOURCE_DIR)) {
      console.error(`错误: 源目录不存在: ${SOURCE_DIR}`);
      console.log('提示: 请将照片放在 docs/资料/杰出校友（照片）/ 目录下');
      return;
    }

    // 确保目标目录存在
    ensureDirectoryExists(TARGET_DIR);

    // 获取所有杰出校友
    const alumniResult = await pool.query(`
      SELECT a.id, a.name, a.photo_url, da.category
      FROM alumni a
      INNER JOIN distinguished_alumni da ON a.id = da.alumni_id
      ORDER BY a.name
    `);

    const alumni = alumniResult.rows;
    console.log(`找到 ${alumni.length} 位杰出校友\n`);

    // 读取源目录中的所有照片文件
    const files = fs.readdirSync(SOURCE_DIR).filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    stats.total = files.length;
    console.log(`找到 ${files.length} 个照片文件\n`);

    // 处理每个照片文件
    for (const file of files) {
      const sourcePath = path.join(SOURCE_DIR, file);
      
      // 尝试匹配校友
      let matched = false;
      for (const alumnus of alumni) {
        if (isNameMatch(file, alumnus.name)) {
          matched = true;
          stats.matched++;

          // 生成目标文件名（使用校友ID确保唯一性）
          const ext = path.extname(file);
          const targetFilename = `${alumnus.id}${ext}`;
          const targetPath = path.join(TARGET_DIR, targetFilename);
          const photoUrl = `${PHOTO_URL_PREFIX}/${targetFilename}`;

          // 复制文件
          if (copyFile(sourcePath, targetPath)) {
            stats.copied++;
            
            // 更新数据库
            await pool.query(
              'UPDATE alumni SET photo_url = $1 WHERE id = $2',
              [photoUrl, alumnus.id]
            );
            
            console.log(`✓ ${file} -> ${alumnus.name} (${alumnus.category})`);
          } else {
            stats.failed++;
            stats.errors.push({ file, reason: '文件复制失败' });
          }
          
          break;
        }
      }

      if (!matched) {
        stats.skipped++;
        console.log(`✗ ${file} - 未匹配到校友`);
        stats.errors.push({ file, reason: '未匹配到校友' });
      }
    }

    // 输出统计报告
    console.log('\n=== 导入统计 ===');
    console.log(`总文件数: ${stats.total}`);
    console.log(`匹配成功: ${stats.matched}`);
    console.log(`复制成功: ${stats.copied}`);
    console.log(`复制失败: ${stats.failed}`);
    console.log(`未匹配: ${stats.skipped}`);

    if (stats.errors.length > 0) {
      console.log('\n=== 错误详情 ===');
      stats.errors.forEach(err => {
        console.log(`${err.file}: ${err.reason}`);
      });
    }

    // 验证结果
    const updatedCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM alumni a
      INNER JOIN distinguished_alumni da ON a.id = da.alumni_id
      WHERE a.photo_url IS NOT NULL AND a.photo_url != ''
    `);

    console.log(`\n已有照片的杰出校友: ${updatedCount.rows[0].count} / ${alumni.length}`);

  } catch (error) {
    console.error('导入失败:', error);
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  importPhotos();
}

export { importPhotos, extractNameFromFilename, isNameMatch };
