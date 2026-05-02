import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// 从学校官网获取的校友照片数据
const alumniPhotos = [
  { name: '金日成', photo: '/Uploads/Picture/2018-09-05/5b8facfd7a306.png' },
  { name: '赵尚志', photo: '/Uploads/Picture/2018-09-05/5b8face188ebf.png' },
  { name: '隋任民', photo: '/Uploads/Picture/2018-09-05/5b8faccc86389.png' },
  { name: '纪儒林', photo: '/Uploads/Picture/2018-09-05/5b8facb67a478.png' },
  { name: '陈翰章', photo: '/Uploads/Picture/2018-09-05/5b8fac90268fd.png' },
  { name: '彭桓武', photo: '/Uploads/Picture/2018-09-05/5b8fac7396446.png' }, // 网站写的彭恒武
  { name: '祖国华', photo: '/Uploads/Picture/2018-09-05/5b8fac448af8b.png' },
  { name: '谢邦治', photo: '/Uploads/Picture/2018-09-05/5b8f995547a95.png' },
  { name: '马宗晋', photo: '/Uploads/Picture/2018-09-05/5b8f98f64c8c8.png' },
  { name: '刘萍', photo: '/Uploads/Picture/2018-09-05/5b8f98c6e8b4c.png' },
  { name: '范士合', photo: '/Uploads/Picture/2018-09-05/5b8f993518809.png' },
  { name: '潘占春', photo: '/Uploads/Picture/2018-09-05/5b8f98666d66e.png' },
  { name: '吕万革', photo: '/Uploads/Picture/2018-09-05/5b8f984296a1c.png' },
  { name: '刘旸', photo: '/Uploads/Picture/2018-09-05/5b8f97cf637c5.png' },
  { name: '邱利民', photo: '/Uploads/Picture/2018-09-05/5b8f9798a4a19.png' },
  { name: '郎峰蔚', photo: '/Uploads/Picture/2018-09-05/5b8f977a25479.png' },
  { name: '关琦', photo: '/Uploads/Picture/2018-10-30/5bd7bde40fdbd.png' },
  { name: '王鹤翔', photo: '/Uploads/Picture/2018-09-05/5b8f96892255c.png' },
  { name: '高鹏', photo: '/Uploads/Picture/2018-09-05/5b8f92c442029.png' },
  { name: '毛天一', photo: '/Uploads/Picture/2018-10-30/5bd7be89720c2.jpg' },
  { name: '陈昱璇', photo: '/Uploads/Picture/2018-09-05/5b8f928973b55.png' },
  { name: '徐丽', photo: '/Uploads/Picture/2018-09-05/5b8f925f33924.png' },
  { name: '韩戾军', photo: '/Uploads/Picture/2018-09-05/5b8f923ee6da6.png' },
  { name: '吴宝勋', photo: '/Uploads/Picture/2018-09-05/5b8f91e074e70.png' },
  { name: '刘守杰', photo: '/Uploads/Picture/2018-09-05/5b8f91afbcfd4.png' },
  { name: '蔡国伟', photo: '/Uploads/Picture/2018-09-05/5b8f91944c154.png' },
  { name: '刘亦兵', photo: '/Uploads/Picture/2018-09-05/5b8f913e66d33.png' },
  { name: '郭姝彤', photo: '/Uploads/Picture/2018-08-22/5b7cd3df080c3.jpg' },
];

const BASE_URL = 'https://www.jlywzx.com';
const PHOTOS_DIR = path.join(__dirname, '../../../client/public/alumni-photos');

// 下载文件
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`下载失败: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // 删除不完整的文件
      reject(err);
    });
  });
}

async function downloadAlumniPhotos() {
  try {
    // 创建照片目录
    if (!fs.existsSync(PHOTOS_DIR)) {
      fs.mkdirSync(PHOTOS_DIR, { recursive: true });
    }
    
    console.log('开始下载校友照片...\n');
    console.log(`照片保存目录: ${PHOTOS_DIR}\n`);
    
    await pool.query('SET search_path TO alumni_system, public');
    
    let downloaded = 0;
    let failed = 0;
    
    for (const alumni of alumniPhotos) {
      const photoUrl = BASE_URL + alumni.photo;
      const ext = path.extname(alumni.photo);
      const localFileName = `${alumni.name}${ext}`;
      const localPath = path.join(PHOTOS_DIR, localFileName);
      const dbPhotoPath = `/alumni-photos/${localFileName}`;
      
      try {
        // 下载照片
        console.log(`下载: ${alumni.name} <- ${photoUrl}`);
        await downloadFile(photoUrl, localPath);
        downloaded++;
        
        // 检查校友是否存在
        const existing = await pool.query(
          'SELECT id FROM alumni WHERE name = $1',
          [alumni.name]
        );
        
        if (existing.rows.length > 0) {
          // 更新照片路径
          await pool.query(
            `UPDATE alumni SET extra_info = extra_info || $1::jsonb WHERE name = $2`,
            [JSON.stringify({ photo: dbPhotoPath }), alumni.name]
          );
          console.log(`  -> 已更新数据库`);
        } else {
          // 创建新校友记录
          await pool.query(
            `INSERT INTO alumni (name, extra_info) VALUES ($1, $2)`,
            [alumni.name, JSON.stringify({ photo: dbPhotoPath, source: '学校官网' })]
          );
          console.log(`  -> 已创建新校友记录`);
        }
      } catch (err: any) {
        console.error(`  -> 失败: ${err.message}`);
        failed++;
      }
    }
    
    console.log(`\n=== 下载完成 ===`);
    console.log(`成功: ${downloaded}`);
    console.log(`失败: ${failed}`);
    
    // 统计有照片的校友
    const stats = await pool.query(`
      SELECT COUNT(*) as count FROM alumni 
      WHERE extra_info->>'photo' IS NOT NULL
    `);
    console.log(`数据库中有照片的校友: ${stats.rows[0].count}`);
    
  } catch (error) {
    console.error('下载失败:', error);
  } finally {
    await pool.end();
  }
}

downloadAlumniPhotos();
