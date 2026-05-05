import { Router, Response } from 'express';
import { pool } from '../config/database';
import { authMiddleware, requireVerifiedAlumni, AuthRequest } from '../middleware/auth';
import { messageService } from '../services/messageService';
import { searchNoticeService } from '../services/searchNoticeService';
import { videoGreetingService } from '../services/videoGreetingService';
import { topScholarService } from '../services/topScholarService';
import { donationService } from '../services/donationService';
import { MessageCategory } from '../types/models';

const router: Router = Router();

// ========== 留言板 ==========

// 获取已审核的留言列表（支持分类筛选）
router.get('/messages', async (req, res: Response) => {
  try {
    const { category, page, pageSize } = req.query;
    const result = await messageService.getPublicList(
      category as MessageCategory | undefined,
      page ? parseInt(page as string) : 1,
      pageSize ? parseInt(pageSize as string) : 20
    );
    res.json({ success: true, data: result.items, total: result.total });
  } catch (error) {
    console.error('获取留言失败:', error);
    res.status(500).json({ success: false, message: '获取留言失败' });
  }
});

// 获取留言分类统计
router.get('/messages/stats', async (_req, res: Response) => {
  try {
    const stats = await messageService.getCategoryStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取留言统计失败:', error);
    res.status(500).json({ success: false, message: '获取留言统计失败' });
  }
});

// 创建留言（支持分类）
router.post('/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content, category, handwritingImageUrl } = req.body;
    
    // 获取作者信息
    let authorId: string | undefined;
    let authorName = '匿名访客';
    let authorClass: string | undefined;

    if (req.userSession?.alumniId) {
      const alumniResult = await pool.query(
        'SELECT name, class_name FROM alumni_system.alumni WHERE id = $1',
        [req.userSession.alumniId]
      );
      if (alumniResult.rows.length > 0) {
        authorId = req.userSession.alumniId;
        authorName = alumniResult.rows[0].name;
        authorClass = alumniResult.rows[0].class_name;
      }
    }

    const result = await messageService.create({
      content,
      category: category || 'school',
      authorId,
      authorName,
      authorClass,
      handwritingImageUrl,
    });

    res.json({ success: true, data: result, message: '留言已提交，等待审核' });
  } catch (error: any) {
    console.error('创建留言失败:', error);
    res.status(400).json({ success: false, message: error.message || '提交留言失败' });
  }
});

// ========== 寻人启事 ==========

// 获取寻人启事列表
router.get('/search-notices', async (req, res: Response) => {
  try {
    const { keyword, page, pageSize } = req.query;
    
    let result;
    if (keyword) {
      result = await searchNoticeService.search(
        keyword as string,
        page ? parseInt(page as string) : 1,
        pageSize ? parseInt(pageSize as string) : 20
      );
    } else {
      result = await searchNoticeService.getPublicList(
        page ? parseInt(page as string) : 1,
        pageSize ? parseInt(pageSize as string) : 20
      );
    }
    
    res.json({ success: true, data: result.items, total: result.total });
  } catch (error) {
    console.error('获取寻人启事失败:', error);
    res.status(500).json({ success: false, message: '获取寻人启事失败' });
  }
});

// 发布寻人启事（需要已验证校友身份）
router.post('/search-notices', authMiddleware, requireVerifiedAlumni, async (req: AuthRequest, res: Response) => {
  try {
    const { targetName, targetClass, description, story, contactPreference } = req.body;
    
    const result = await searchNoticeService.create({
      publisherId: req.userSession!.alumniId!,
      targetName,
      targetClass,
      description,
      story,
      contactPreference: contactPreference || 'system',
    }, true);

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('发布寻人启事失败:', error);
    res.status(400).json({ success: false, message: error.message || '发布失败' });
  }
});

// 更新寻人启事状态（发布者可以标记为已找到）
router.put('/search-notices/:id/status', authMiddleware, requireVerifiedAlumni, async (req: AuthRequest, res: Response) => {
  try {
    const { status, reunionStory } = req.body;
    
    // 验证是否为发布者
    const notice = await searchNoticeService.getById(req.params.id);
    if (!notice) {
      return res.status(404).json({ success: false, message: '寻人启事不存在' });
    }
    if (notice.publisherId !== req.userSession?.alumniId) {
      return res.status(403).json({ success: false, message: '只有发布者可以更新状态' });
    }

    const result = await searchNoticeService.updateStatus(req.params.id, status, reunionStory);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('更新寻人启事状态失败:', error);
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// ========== 视频寄语墙 ==========

// 获取公开视频列表
router.get('/video-greetings', async (req, res: Response) => {
  try {
    const { page, pageSize } = req.query;
    const result = await videoGreetingService.getPublicList(
      page ? parseInt(page as string) : 1,
      pageSize ? parseInt(pageSize as string) : 20
    );
    res.json({ success: true, data: result.items, total: result.total });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({ success: false, message: '获取视频列表失败' });
  }
});

// 获取精选视频
router.get('/video-greetings/featured', async (req, res: Response) => {
  try {
    const { limit } = req.query;
    const result = await videoGreetingService.getFeatured(
      limit ? parseInt(limit as string) : 5
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取精选视频失败:', error);
    res.status(500).json({ success: false, message: '获取精选视频失败' });
  }
});

// 获取视频详情
router.get('/video-greetings/:id', async (req, res: Response) => {
  try {
    const result = await videoGreetingService.getById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取视频详情失败:', error);
    res.status(500).json({ success: false, message: '获取视频详情失败' });
  }
});

// 上传视频寄语
router.post('/video-greetings', authMiddleware, requireVerifiedAlumni, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, videoUrl, thumbnailUrl, durationSeconds } = req.body;
    
    // 获取校友信息
    const alumniResult = await pool.query(
      'SELECT name, class_name FROM alumni_system.alumni WHERE id = $1',
      [req.userSession!.alumniId]
    );
    
    if (!alumniResult.rows[0]) {
      return res.status(400).json({ success: false, message: '校友信息不存在' });
    }

    const result = await videoGreetingService.upload(
      {
        alumniId: req.userSession!.alumniId,
        alumniName: alumniResult.rows[0].name,
        alumniClass: alumniResult.rows[0].class_name,
        title,
        description,
      },
      videoUrl,
      thumbnailUrl,
      durationSeconds
    );

    res.json({ success: true, data: result, message: '视频已提交，等待审核' });
  } catch (error: any) {
    console.error('上传视频失败:', error);
    res.status(400).json({ success: false, message: error.message || '上传失败' });
  }
});

// 增加视频观看次数
router.put('/video-greetings/:id/view', async (req, res: Response) => {
  try {
    await videoGreetingService.incrementViewCount(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('更新观看次数失败:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// 获取杰出校友列表
router.get('/distinguished', async (_req, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT da.*, a.name, a.graduation_year, a.class_name, a.industry,
              a.photo_url, a.updated_at as alumni_updated_at, a.created_at as alumni_created_at
       FROM alumni_system.distinguished_alumni da
       JOIN alumni_system.alumni a ON da.alumni_id = a.id
       ORDER BY da.popularity DESC`
    );
    // 为 photoUrl 添加时间戳缓存破坏者
    const data = result.rows.map((row: any) => ({
      ...row,
      photoUrl: row.photo_url ? `${row.photo_url}?t=${new Date(row.alumni_updated_at || row.alumni_created_at).getTime()}` : row.photo_url,
      photo_url: undefined,
      alumni_updated_at: undefined,
      alumni_created_at: undefined,
    }));

    // 合并 top_scholars 中未被 distinguished_alumni 覆盖的状元
    const existingScholarNames = new Set(
      data.filter((r: any) => r.category === '状元榜').map((r: any) => r.name)
    );
    const scholarsResult = await pool.query(
      `SELECT id, name, exam_year, rank_description, university, photo_url,
              biography, sort_order, updated_at, created_at
       FROM alumni_system.top_scholars
       WHERE is_deleted = FALSE
       ORDER BY exam_year DESC, sort_order DESC`
    );
    for (const scholar of scholarsResult.rows) {
      if (!existingScholarNames.has(scholar.name)) {
        data.push({
          id: `scholar_${scholar.id}`,
          alumni_id: scholar.alumni_id || null,
          name: scholar.name,
          category: '状元榜',
          graduation_year: scholar.exam_year,
          class_name: null,
          industry: null,
          achievement: scholar.rank_description,
          photoUrl: scholar.photo_url ? `${scholar.photo_url}?t=${new Date(scholar.updated_at || scholar.created_at).getTime()}` : null,
          popularity: 0,
          biography: scholar.biography || null,
          university: scholar.university || null,
        });
        existingScholarNames.add(scholar.name);
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('获取杰出校友失败:', error);
    res.status(500).json({ success: false, message: '获取杰出校友失败' });
  }
});

// 获取毕业照列表
router.get('/graduation-photos', async (req, res: Response) => {
  try {
    const { year, className } = req.query;
    
    let query = 'SELECT * FROM alumni_system.graduation_photos WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (year) {
      query += ` AND year = $${paramIndex++}`;
      params.push(parseInt(year as string));
    }

    if (className) {
      query += ` AND class_name = $${paramIndex++}`;
      params.push(className);
    }

    query += ' ORDER BY year DESC, class_name';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取毕业照失败:', error);
    res.status(500).json({ success: false, message: '获取毕业照失败' });
  }
});

// ========== 老物件数字馆（公开） ==========

// 获取老物件列表
router.get('/vintage-items', async (req, res: Response) => {
  try {
    const { itemType, era, keyword, page, pageSize } = req.query;
    
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (itemType) {
      conditions.push(`item_type = $${paramIndex++}`);
      params.push(itemType);
    }

    if (era) {
      conditions.push(`era = $${paramIndex++}`);
      params.push(era);
    }

    if (keyword) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const pageNum = page ? parseInt(page as string) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize as string) : 20;
    const offset = (pageNum - 1) * pageSizeNum;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.vintage_items WHERE ${whereClause}`,
      params
    );

    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.vintage_items 
       WHERE ${whereClause}
       ORDER BY sort_order ASC, created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, pageSizeNum, offset]
    );

    res.json({ 
      success: true, 
      data: {
        items: dataResult.rows,
        total: parseInt(countResult.rows[0].count),
      }
    });
  } catch (error) {
    console.error('获取老物件列表失败:', error);
    res.status(500).json({ success: false, message: '获取老物件列表失败' });
  }
});

// 获取老物件详情
router.get('/vintage-items/:id', async (req, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM alumni_system.vintage_items WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: '老物件不存在' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('获取老物件详情失败:', error);
    res.status(500).json({ success: false, message: '获取老物件详情失败' });
  }
});

// 获取老物件筛选选项
router.get('/vintage-items-options', async (_req, res: Response) => {
  try {
    const [types, eras] = await Promise.all([
      pool.query('SELECT DISTINCT item_type FROM alumni_system.vintage_items ORDER BY item_type'),
      pool.query('SELECT DISTINCT era FROM alumni_system.vintage_items WHERE era IS NOT NULL ORDER BY era'),
    ]);
    res.json({ 
      success: true, 
      data: {
        types: types.rows.map(r => r.item_type),
        eras: eras.rows.map(r => r.era),
      }
    });
  } catch (error) {
    console.error('获取筛选选项失败:', error);
    res.status(500).json({ success: false, message: '获取筛选选项失败' });
  }
});

// ========== 班级名录墙（公开） ==========

// 获取班级名录列表
router.get('/class-rosters', async (req, res: Response) => {
  try {
    const { graduationYear, keyword, page, pageSize } = req.query;
    
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (graduationYear) {
      conditions.push(`graduation_year = $${paramIndex++}`);
      params.push(parseInt(graduationYear as string));
    }

    if (keyword) {
      conditions.push(`(class_name ILIKE $${paramIndex} OR head_teacher ILIKE $${paramIndex})`);
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const pageNum = page ? parseInt(page as string) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize as string) : 20;
    const offset = (pageNum - 1) * pageSizeNum;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.class_rosters WHERE ${whereClause}`,
      params
    );

    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.class_rosters 
       WHERE ${whereClause}
       ORDER BY graduation_year DESC, class_name ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, pageSizeNum, offset]
    );

    res.json({ 
      success: true, 
      data: {
        items: dataResult.rows,
        total: parseInt(countResult.rows[0].count),
      }
    });
  } catch (error) {
    console.error('获取班级名录列表失败:', error);
    res.status(500).json({ success: false, message: '获取班级名录列表失败' });
  }
});

// 获取班级名录详情（包含学生和照片）
router.get('/class-rosters/:id', async (req, res: Response) => {
  try {
    const rosterResult = await pool.query(
      'SELECT * FROM alumni_system.class_rosters WHERE id = $1',
      [req.params.id]
    );
    
    if (!rosterResult.rows[0]) {
      return res.status(404).json({ success: false, message: '班级名录不存在' });
    }

    // 获取学生列表
    const studentsResult = await pool.query(
      'SELECT * FROM alumni_system.class_students WHERE class_id = $1 ORDER BY seat_number, student_name',
      [req.params.id]
    );

    // 获取关联的毕业照
    const photosResult = await pool.query(
      `SELECT gp.* FROM alumni_system.graduation_photos gp
       INNER JOIN alumni_system.class_photo_links cpl ON gp.id = cpl.photo_id
       WHERE cpl.class_id = $1
       ORDER BY gp.year DESC`,
      [req.params.id]
    );

    res.json({ 
      success: true, 
      data: {
        ...rosterResult.rows[0],
        students: studentsResult.rows,
        photos: photosResult.rows,
      }
    });
  } catch (error) {
    console.error('获取班级名录详情失败:', error);
    res.status(500).json({ success: false, message: '获取班级名录详情失败' });
  }
});

// 获取班级名录筛选选项
router.get('/class-rosters-options', async (_req, res: Response) => {
  try {
    const years = await pool.query('SELECT DISTINCT graduation_year FROM alumni_system.class_rosters ORDER BY graduation_year DESC');
    res.json({ 
      success: true, 
      data: {
        years: years.rows.map(r => r.graduation_year),
      }
    });
  } catch (error) {
    console.error('获取筛选选项失败:', error);
    res.status(500).json({ success: false, message: '获取筛选选项失败' });
  }
});

// 获取捐赠榜单
router.get('/donations/leaderboard', async (_req, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT donor_name, SUM(amount) as total_amount, COUNT(*) as donation_count
       FROM alumni_system.donations
       GROUP BY donor_name
       ORDER BY total_amount DESC
       LIMIT 100`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取捐赠榜单失败:', error);
    res.status(500).json({ success: false, message: '获取捐赠榜单失败' });
  }
});

// 创建捐赠记录
router.post('/donations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, projectId, message, donorName } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: '捐赠金额无效' });
    }

    const result = await pool.query(
      `INSERT INTO alumni_system.donations (donor_id, donor_name, amount, project_id, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.userSession?.alumniId, donorName || '爱心人士', amount, projectId, message]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('创建捐赠记录失败:', error);
    res.status(500).json({ success: false, message: '捐赠记录创建失败' });
  }
});

// ========== 校友会服务区 ==========

// 获取校友会列表（公开）
router.get('/associations', async (req, res: Response) => {
  try {
    const { city, keyword, page, pageSize } = req.query;
    
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (city) {
      conditions.push(`city ILIKE $${paramIndex++}`);
      params.push(`%${city}%`);
    }

    if (keyword) {
      conditions.push(`(city ILIKE $${paramIndex} OR contact_name ILIKE $${paramIndex})`);
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const pageNum = page ? parseInt(page as string) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize as string) : 50;
    const offset = (pageNum - 1) * pageSizeNum;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.alumni_associations WHERE ${whereClause}`,
      params
    );

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.alumni_associations 
       WHERE ${whereClause}
       ORDER BY member_count DESC, city ASC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSizeNum, offset]
    );

    res.json({ 
      success: true, 
      data: {
        items: dataResult.rows,
        total: parseInt(countResult.rows[0].count),
      }
    });
  } catch (error) {
    console.error('获取校友会列表失败:', error);
    res.status(500).json({ success: false, message: '获取校友会列表失败' });
  }
});

// 获取捐赠项目列表（公开）
router.get('/donation-projects', async (req, res: Response) => {
  try {
    const { status, page, pageSize } = req.query;
    
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    // 默认只显示进行中的项目
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    } else {
      conditions.push(`status = $${paramIndex++}`);
      params.push('active');
    }

    const whereClause = conditions.join(' AND ');
    const pageNum = page ? parseInt(page as string) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize as string) : 20;
    const offset = (pageNum - 1) * pageSizeNum;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.donation_projects WHERE ${whereClause}`,
      params
    );

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.donation_projects 
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSizeNum, offset]
    );

    res.json({ 
      success: true, 
      data: {
        items: dataResult.rows,
        total: parseInt(countResult.rows[0].count),
      }
    });
  } catch (error) {
    console.error('获取捐赠项目列表失败:', error);
    res.status(500).json({ success: false, message: '获取捐赠项目列表失败' });
  }
});

// ========== 校友动态（公开） ==========

// 获取校友动态列表
router.get('/alumni-news', async (req, res: Response) => {
  try {
    const { newsType, page, pageSize } = req.query;
    
    const conditions: string[] = ["status = 'published'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (newsType) {
      conditions.push(`news_type = $${paramIndex++}`);
      params.push(newsType);
    }

    const whereClause = conditions.join(' AND ');
    const pageNum = page ? parseInt(page as string) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize as string) : 20;
    const offset = (pageNum - 1) * pageSizeNum;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.alumni_news WHERE ${whereClause}`,
      params
    );

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.alumni_news 
       WHERE ${whereClause}
       ORDER BY publish_date DESC NULLS LAST, created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSizeNum, offset]
    );

    res.json({ 
      success: true, 
      data: {
        items: dataResult.rows,
        total: parseInt(countResult.rows[0].count),
      }
    });
  } catch (error) {
    console.error('获取校友动态失败:', error);
    res.status(500).json({ success: false, message: '获取校友动态失败' });
  }
});

// ========== 统一搜索 ==========

// 时空长廊统一搜索
router.get('/time-corridor/search', async (req, res: Response) => {
  try {
    const { keyword, type, limit = 20 } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ success: false, message: '请提供搜索关键词' });
    }

    const searchKeyword = `%${keyword}%`;
    const limitNum = Math.min(50, parseInt(limit as string) || 20);
    const results: any = { photos: [], vintageItems: [], classRosters: [] };

    // 根据type参数决定搜索范围
    const searchTypes = type ? [type as string] : ['photos', 'vintageItems', 'classRosters'];

    if (searchTypes.includes('photos')) {
      const photosResult = await pool.query(
        `SELECT id, year, class_name, original_url, face_tags
         FROM alumni_system.graduation_photos 
         WHERE class_name ILIKE $1 
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(face_tags) AS tag 
              WHERE tag->>'name' ILIKE $1
            )
         ORDER BY year DESC
         LIMIT $2`,
        [searchKeyword, limitNum]
      );
      results.photos = photosResult.rows;
    }

    if (searchTypes.includes('vintageItems')) {
      const itemsResult = await pool.query(
        `SELECT id, name, item_type, era, description, images
         FROM alumni_system.vintage_items 
         WHERE name ILIKE $1 OR description ILIKE $1 OR donor_name ILIKE $1
         ORDER BY sort_order ASC, created_at DESC
         LIMIT $2`,
        [searchKeyword, limitNum]
      );
      results.vintageItems = itemsResult.rows;
    }

    if (searchTypes.includes('classRosters')) {
      const rostersResult = await pool.query(
        `SELECT cr.id, cr.class_name, cr.graduation_year, cr.head_teacher, cr.student_count
         FROM alumni_system.class_rosters cr
         WHERE cr.class_name ILIKE $1 
            OR cr.head_teacher ILIKE $1 
            OR EXISTS (
              SELECT 1 FROM alumni_system.class_students cs 
              WHERE cs.class_id = cr.id AND cs.student_name ILIKE $1
            )
         ORDER BY cr.graduation_year DESC
         LIMIT $2`,
        [searchKeyword, limitNum]
      );
      results.classRosters = rostersResult.rows;
    }

    const totalCount = results.photos.length + results.vintageItems.length + results.classRosters.length;

    res.json({ 
      success: true, 
      data: {
        ...results,
        keyword,
        totalCount,
      }
    });
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

export default router;

// ========== 状元榜（公开） ==========

// 获取状元榜列表
router.get('/top-scholars', async (_req, res: Response) => {
  try {
    const scholars = await topScholarService.getAll();
    res.json({ success: true, data: scholars });
  } catch (error) {
    console.error('获取状元榜失败:', error);
    res.status(500).json({ success: false, message: '获取状元榜失败' });
  }
});

// 获取状元详情
router.get('/top-scholars/:id', async (req, res: Response) => {
  try {
    const scholar = await topScholarService.getById(req.params.id);
    if (!scholar) {
      return res.status(404).json({ success: false, message: '状元记录不存在' });
    }
    res.json({ success: true, data: scholar });
  } catch (error) {
    console.error('获取状元详情失败:', error);
    res.status(500).json({ success: false, message: '获取状元详情失败' });
  }
});

// ========== 捐赠公示（公开） ==========

router.get('/donations', async (_req, res: Response) => {
  try {
    const projects = await donationService.getPublicProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取捐赠项目失败' });
  }
});

router.get('/donations/:projectId/records', async (req, res: Response) => {
  try {
    const records = await donationService.getPublicRecords(req.params.projectId);
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取捐赠记录失败' });
  }
});

router.post('/donations/:projectId/thank-you', async (req, res: Response) => {
  try {
    const { donorName, amount } = req.body;
    if (!donorName || !amount) return res.status(400).json({ success: false, message: '缺少捐赠人信息' });
    const letter = donationService.generateThankYouLetter(donorName, amount, req.params.projectId);
    res.json({ success: true, data: { letter } });
  } catch (error) {
    res.status(500).json({ success: false, message: '生成感谢信失败' });
  }
});

router.post('/donations/:projectId/certificate', async (req, res: Response) => {
  try {
    const { donorName, amount } = req.body;
    if (!donorName || !amount) return res.status(400).json({ success: false, message: '缺少捐赠人信息' });
    const cert = donationService.generateCertificate(donorName, amount, req.params.projectId);
    res.json({ success: true, data: { certificate: cert } });
  } catch (error) {
    res.status(500).json({ success: false, message: '生成证书失败' });
  }
});
