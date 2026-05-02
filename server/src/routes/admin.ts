import { Router, Response } from 'express';
import { pool } from '../config/database';
import { alumniRepository } from '../repositories/alumniRepository';
import { distinguishedAlumniRepository } from '../repositories/distinguishedAlumniRepository';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth';
import { ragService } from '../services/ragService';
import { distinguishedAlumniService } from '../services/distinguishedAlumniService';
import { graduationPhotoService } from '../services/graduationPhotoService';
import { searchNoticeService } from '../services/searchNoticeService';
import { donationProjectService } from '../services/donationProjectService';
import { alumniAssociationService } from '../services/alumniAssociationService';
import { alumniNewsService } from '../services/alumniNewsService';
import { messageService } from '../services/messageService';
import { vintageItemService } from '../services/vintageItemService';
import { classRosterService } from '../services/classRosterService';

const router: Router = Router();

// UUID 验证正则
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 安全记录操作日志（跳过无效 UUID）
async function logOperation(
  userId: string | undefined,
  operationType: string,
  targetType: string,
  targetId: string | undefined,
  details: any
): Promise<void> {
  try {
    // 如果 userId 不是有效 UUID，使用 null
    const validUserId = userId && UUID_REGEX.test(userId) ? userId : null;
    // 如果 targetId 不是有效 UUID，使用 null
    const validTargetId = targetId && UUID_REGEX.test(targetId) ? targetId : null;
    
    await pool.query(
      `INSERT INTO alumni_system.operation_logs (user_id, operation_type, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [validUserId, operationType, targetType, validTargetId, JSON.stringify(details)]
    );
  } catch (error) {
    console.warn('记录操作日志失败:', error);
  }
}

// 所有管理路由需要管理员权限
router.use(authMiddleware, requireAdmin);

// 获取校友列表（管理端）
router.get('/alumni', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, page, pageSize } = req.query;
    const result = await alumniRepository.search({
      keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取校友列表失败:', error);
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

// 创建校友
router.post('/alumni', async (req: AuthRequest, res: Response) => {
  try {
    const alumni = await alumniRepository.create(req.body);
    await logOperation(req.userSession?.userId, 'create', 'alumni', alumni.id, req.body);
    res.json({ success: true, data: alumni });
  } catch (error) {
    console.error('创建校友失败:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 更新校友
router.put('/alumni/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const alumni = await alumniRepository.update(id, req.body);
    
    if (!alumni) {
      return res.status(404).json({ success: false, message: '校友不存在' });
    }

    await logOperation(req.userSession?.userId, 'update', 'alumni', id, req.body);
    res.json({ success: true, data: alumni });
  } catch (error) {
    console.error('更新校友失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 删除校友
router.delete('/alumni/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = await alumniRepository.delete(id);
    
    if (!success) {
      return res.status(404).json({ success: false, message: '校友不存在' });
    }

    await logOperation(req.userSession?.userId, 'delete', 'alumni', id, { id });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除校友失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 批量导入校友 - 优化版本，支持批量插入
router.post('/alumni/import', async (req: AuthRequest, res: Response) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ success: false, message: '数据格式错误' });
    }

    // 限制单次导入数量
    if (data.length > 500) {
      return res.status(400).json({ 
        success: false, 
        message: '单次导入最多500条数据，请分批导入' 
      });
    }

    const results = { success: 0, failed: 0, failedItems: [] as any[] };
    const validItems: any[] = [];

    // 第一步：验证数据
    for (const item of data) {
      if (!item.name || !item.graduationYear) {
        results.failedItems.push({ ...item, reason: '缺少必要字段（姓名或届别）' });
        results.failed++;
        continue;
      }
      validItems.push(item);
    }

    // 第二步：批量插入（使用事务）
    if (validItems.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // 构建批量插入SQL
        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        for (const item of validItems) {
          const { name, studentId = '', graduationYear, className = '', 
                  department = '', industry = '', currentCity = '', 
                  workUnit = '', phone = '', email = '', photoUrl = '' } = item;
          
          placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, 
            $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, 
            $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`);
          
          values.push(name, studentId, graduationYear, className, department, 
                     industry, currentCity, workUnit, phone, email, photoUrl);
          paramIndex += 11;
        }

        const insertSQL = `
          INSERT INTO alumni_system.alumni 
          (name, student_id, graduation_year, class_name, department, industry, 
           current_city, work_unit, phone, email, photo_url, created_at, updated_at)
          VALUES ${placeholders.join(', ')}
          ON CONFLICT (student_id) DO UPDATE SET
            name = EXCLUDED.name,
            graduation_year = EXCLUDED.graduation_year,
            class_name = EXCLUDED.class_name,
            department = EXCLUDED.department,
            industry = EXCLUDED.industry,
            current_city = EXCLUDED.current_city,
            work_unit = EXCLUDED.work_unit,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            photo_url = EXCLUDED.photo_url,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, student_id
        `;

        const insertResult = await client.query(insertSQL, values);
        await client.query('COMMIT');
        
        results.success = insertResult.rowCount || validItems.length;
      } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('批量插入失败:', error);
        // 回退到逐条插入
        for (const item of validItems) {
          try {
            await alumniRepository.create(item);
            results.success++;
          } catch (e) {
            results.failedItems.push({ ...item, reason: '数据库插入失败' });
            results.failed++;
          }
        }
      } finally {
        client.release();
      }
    }

    // 记录操作日志
    await logOperation(req.userSession?.userId, 'batch_import', 'alumni', undefined, {
      total: data.length,
      success: results.success,
      failed: results.failed
    });

    res.json({ 
      success: true, 
      data: {
        success: results.success,
        failed: results.failed,
        failedItems: results.failedItems.slice(0, 50) // 最多返回50条失败记录
      }
    });
  } catch (error) {
    console.error('批量导入失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
});

// ========== 留言管理（增强） ==========

// 获取留言列表
router.get('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { status, keyword, page, pageSize } = req.query;
    const result = await messageService.getList({
      status: status as any, keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

// 获取留言详情
router.get('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const message = await messageService.getById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: '留言不存在' });
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

// 更新留言状态
router.put('/messages/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status, rejectionReason } = req.body;
    const message = await messageService.updateStatus(req.params.id, status, req.userSession?.userId, rejectionReason);
    await logOperation(req.userSession?.userId, 'review', 'message', req.params.id, { status, rejectionReason });
    res.json({ success: true, data: message });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 批量审核留言
router.post('/messages/batch-review', async (req: AuthRequest, res: Response) => {
  try {
    const count = await messageService.batchReview(req.body, req.userSession?.userId);
    await logOperation(req.userSession?.userId, 'batch_review', 'message', undefined, req.body);
    res.json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '批量审核失败' });
  }
});

// 删除留言
router.delete('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    await messageService.delete(req.params.id);
    await logOperation(req.userSession?.userId, 'delete', 'message', req.params.id, { id: req.params.id });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// ========== 校友照片管理增强 ==========

// 上传校友照片
router.post('/alumni/:id/photo', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { photoUrl } = req.body;
    
    if (!photoUrl) {
      return res.status(400).json({ success: false, message: '照片URL不能为空' });
    }

    const result = await pool.query(
      'UPDATE alumni_system.alumni SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [photoUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '校友不存在' });
    }

    await logOperation(req.userSession?.userId, 'upload_photo', 'alumni', id, { photoUrl });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('上传校友照片失败:', error);
    res.status(500).json({ success: false, message: '上传失败' });
  }
});

// 删除校友照片
router.delete('/alumni/:id/photo', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE alumni_system.alumni SET photo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '校友不存在' });
    }

    await logOperation(req.userSession?.userId, 'delete_photo', 'alumni', id, { id });

    res.json({ success: true, message: '照片删除成功' });
  } catch (error) {
    console.error('删除校友照片失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ========== 杰出校友管理 ==========

// 获取杰出校友列表
router.get('/distinguished', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, category, page, pageSize } = req.query;
    const result = await distinguishedAlumniService.getList({
      keyword: keyword as string,
      category: category as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取杰出校友列表失败:', error);
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

// 获取杰出校友详情
router.get('/distinguished/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const distinguished = await distinguishedAlumniService.getById(id);
    if (!distinguished) {
      return res.status(404).json({ success: false, message: '杰出校友不存在' });
    }
    res.json({ success: true, data: distinguished });
  } catch (error) {
    console.error('获取杰出校友详情失败:', error);
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

// 获取杰出校友类别列表
router.get('/distinguished-categories', async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await distinguishedAlumniService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取类别列表失败:', error);
    res.status(500).json({ success: false, message: '获取类别失败' });
  }
});

// 创建杰出校友
router.post('/distinguished', async (req: AuthRequest, res: Response) => {
  try {
    const distinguished = await distinguishedAlumniService.create(req.body);
    await logOperation(req.userSession?.userId, 'create', 'distinguished_alumni', distinguished.id, req.body);
    res.json({ success: true, data: distinguished });
  } catch (error: any) {
    console.error('创建杰出校友失败:', error);
    res.status(400).json({ success: false, message: error.message || '创建失败' });
  }
});

// 更新杰出校友
router.put('/distinguished/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const distinguished = await distinguishedAlumniService.update(id, req.body);
    
    if (!distinguished) {
      return res.status(404).json({ success: false, message: '杰出校友不存在' });
    }

    await logOperation(req.userSession?.userId, 'update', 'distinguished_alumni', id, req.body);
    res.json({ success: true, data: distinguished });
  } catch (error: any) {
    console.error('更新杰出校友失败:', error);
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 删除杰出校友（保留基础校友信息）
router.delete('/distinguished/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await distinguishedAlumniService.delete(id);
    await logOperation(req.userSession?.userId, 'delete', 'distinguished_alumni', id, { id });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('删除杰出校友失败:', error);
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// ========== 毕业照管理 ==========

// 获取毕业照列表
router.get('/photos', async (req: AuthRequest, res: Response) => {
  try {
    const { year, className, page, pageSize } = req.query;
    const result = await graduationPhotoService.getList({
      year: year ? parseInt(year as string) : undefined,
      className: className as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取毕业照列表失败:', error);
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

// 获取毕业照筛选选项
router.get('/photos/options', async (_req: AuthRequest, res: Response) => {
  try {
    const options = await graduationPhotoService.getFilterOptions();
    res.json({ success: true, data: options });
  } catch (error) {
    console.error('获取筛选选项失败:', error);
    res.status(500).json({ success: false, message: '获取选项失败' });
  }
});

// 获取毕业照详情
router.get('/photos/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const photo = await graduationPhotoService.getById(id);
    if (!photo) {
      return res.status(404).json({ success: false, message: '毕业照不存在' });
    }
    res.json({ success: true, data: photo });
  } catch (error) {
    console.error('获取毕业照详情失败:', error);
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

// 创建毕业照
router.post('/photos', async (req: AuthRequest, res: Response) => {
  try {
    const photo = await graduationPhotoService.create(req.body);
    
    await logOperation(req.userSession?.userId, 'create', 'graduation_photo', photo.id, req.body);

    res.json({ success: true, data: photo });
  } catch (error: any) {
    console.error('创建毕业照失败:', error);
    res.status(400).json({ success: false, message: error.message || '创建失败' });
  }
});

// 更新毕业照
router.put('/photos/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const photo = await graduationPhotoService.update(id, req.body);
    
    if (!photo) {
      return res.status(404).json({ success: false, message: '毕业照不存在' });
    }

    await logOperation(req.userSession?.userId, 'update', 'graduation_photo', id, req.body);

    res.json({ success: true, data: photo });
  } catch (error: any) {
    console.error('更新毕业照失败:', error);
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 更新人脸标记
router.put('/photos/:id/tags', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { faceTags } = req.body;
    const photo = await graduationPhotoService.updateFaceTags(id, faceTags);
    
    if (!photo) {
      return res.status(404).json({ success: false, message: '毕业照不存在' });
    }

    await logOperation(req.userSession?.userId, 'update_tags', 'graduation_photo', id, { faceTags });

    res.json({ success: true, data: photo });
  } catch (error: any) {
    console.error('更新人脸标记失败:', error);
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 删除毕业照
router.delete('/photos/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await graduationPhotoService.delete(id);

    await logOperation(req.userSession?.userId, 'delete', 'graduation_photo', id, { id });

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('删除毕业照失败:', error);
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// ========== 寻人启事管理 ==========

// 获取寻人启事列表
router.get('/notices', async (req: AuthRequest, res: Response) => {
  try {
    const { status, keyword, page, pageSize } = req.query;
    const result = await searchNoticeService.getList({
      status: status as any,
      keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取寻人启事列表失败:', error);
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

// 更新寻人启事状态
router.put('/notices/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const notice = await searchNoticeService.updateStatus(id, status);
    
    await logOperation(req.userSession?.userId, 'update_status', 'search_notice', id, { status });

    res.json({ success: true, data: notice });
  } catch (error: any) {
    console.error('更新寻人启事状态失败:', error);
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 删除寻人启事
router.delete('/notices/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await searchNoticeService.delete(id);

    await logOperation(req.userSession?.userId, 'delete', 'search_notice', id, { id });

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('删除寻人启事失败:', error);
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// ========== 捐赠项目管理 ==========

router.get('/donation-projects', async (req: AuthRequest, res: Response) => {
  try {
    const { status, keyword, page, pageSize } = req.query;
    const result = await donationProjectService.getList({
      status: status as any, keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

router.get('/donation-projects/:id', async (req: AuthRequest, res: Response) => {
  try {
    const project = await donationProjectService.getById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' });
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
// ==================== 班级名录管理 ====================

// 获取班级名录列表
router.get('/class-rosters', async (req: AuthRequest, res: Response) => {
  try {
    const { graduationYear, keyword, page, pageSize } = req.query;
    const result = await classRosterService.getList({
      graduationYear: graduationYear ? parseInt(graduationYear as string) : undefined,
      keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取班级名录列表失败:', error);
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

// 获取班级名录详情
router.get('/class-rosters/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await classRosterService.getById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: '班级名录不存在' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取班级名录详情失败:', error);
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

// 创建班级名录
router.post('/class-rosters', async (req: AuthRequest, res: Response) => {
  try {
    const result = await classRosterService.create(req.body);
    await logOperation(req.userSession?.userId, 'create', 'class_roster', result.id, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('创建班级名录失败:', error);
    res.status(400).json({ success: false, message: error.message || '创建失败' });
  }
});

// 更新班级名录
router.put('/class-rosters/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await classRosterService.update(req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ success: false, message: '班级名录不存在' });
    }
    await logOperation(req.userSession?.userId, 'update', 'class_roster', req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('更新班级名录失败:', error);
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 删除班级名录
router.delete('/class-rosters/:id', async (req: AuthRequest, res: Response) => {
  try {
    const success = await classRosterService.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: '班级名录不存在' });
    }
    await logOperation(req.userSession?.userId, 'delete', 'class_roster', req.params.id, { id: req.params.id });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('删除班级名录失败:', error);
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// 添加学生
router.post('/class-rosters/:classId/students', async (req: AuthRequest, res: Response) => {
  try {
    const result = await classRosterService.addStudent({
      classId: req.params.classId,
      ...req.body,
    });
    await logOperation(req.userSession?.userId, 'create', 'class_student', result.id, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('添加学生失败:', error);
    res.status(400).json({ success: false, message: error.message || '添加失败' });
  }
});

// 更新学生信息
router.put('/class-rosters/:classId/students/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const result = await classRosterService.updateStudent(req.params.studentId, req.body);
    if (!result) {
      return res.status(404).json({ success: false, message: '学生不存在' });
    }
    await logOperation(req.userSession?.userId, 'update', 'class_student', req.params.studentId, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('更新学生失败:', error);
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 删除学生
router.delete('/class-rosters/:classId/students/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const success = await classRosterService.removeStudent(req.params.studentId);
    if (!success) {
      return res.status(404).json({ success: false, message: '学生不存在' });
    }
    await logOperation(req.userSession?.userId, 'delete', 'class_student', req.params.studentId, { id: req.params.studentId });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('删除学生失败:', error);
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// 批量导入学生
router.post('/class-rosters/:classId/students/import', async (req: AuthRequest, res: Response) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students)) {
      return res.status(400).json({ success: false, message: '学生列表格式错误' });
    }
    const result = await classRosterService.importStudents(req.params.classId, students);
    await logOperation(req.userSession?.userId, 'import', 'class_students', undefined, { classId: req.params.classId, count: students.length });
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('批量导入学生失败:', error);
    res.status(400).json({ success: false, message: error.message || '导入失败' });
  }
});

// 获取筛选选项
router.get('/class-rosters-options', async (req: AuthRequest, res: Response) => {
  try {
    const result = await classRosterService.getFilterOptions();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取筛选选项失败:', error);
    res.status(500).json({ success: false, message: '获取选项失败' });
  }
});

});

router.get('/donation-projects/:id/records', async (req: AuthRequest, res: Response) => {
  try {
    const records = await donationProjectService.getDonationRecords(req.params.id);
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取记录失败' });
  }
});

router.post('/donation-projects', async (req: AuthRequest, res: Response) => {
  try {
    const project = await donationProjectService.create(req.body);
    await logOperation(req.userSession?.userId, 'create', 'donation_project', project.id, req.body);
    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '创建失败' });
  }
});

router.put('/donation-projects/:id', async (req: AuthRequest, res: Response) => {
  try {
    const project = await donationProjectService.update(req.params.id, req.body);
    await logOperation(req.userSession?.userId, 'update', 'donation_project', req.params.id, req.body);
    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

router.delete('/donation-projects/:id', async (req: AuthRequest, res: Response) => {
  try {
    await donationProjectService.delete(req.params.id);
    await logOperation(req.userSession?.userId, 'delete', 'donation_project', req.params.id, { id: req.params.id });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// ========== 校友会管理 ==========

router.get('/associations', async (req: AuthRequest, res: Response) => {
  try {
    const { city, keyword, page, pageSize } = req.query;
    const result = await alumniAssociationService.getList({
      city: city as string, keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

router.post('/associations', async (req: AuthRequest, res: Response) => {
  try {
    const association = await alumniAssociationService.create(req.body);
    await logOperation(req.userSession?.userId, 'create', 'alumni_association', association.id, req.body);
    res.json({ success: true, data: association });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '创建失败' });
  }
});

router.put('/associations/:id', async (req: AuthRequest, res: Response) => {
  try {
    const association = await alumniAssociationService.update(req.params.id, req.body);
    await logOperation(req.userSession?.userId, 'update', 'alumni_association', req.params.id, req.body);
    res.json({ success: true, data: association });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

router.delete('/associations/:id', async (req: AuthRequest, res: Response) => {
  try {
    await alumniAssociationService.delete(req.params.id);
    await logOperation(req.userSession?.userId, 'delete', 'alumni_association', req.params.id, { id: req.params.id });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// ========== 校友动态管理 ==========

router.get('/news', async (req: AuthRequest, res: Response) => {
  try {
    const { newsType, status, keyword, page, pageSize } = req.query;
    const result = await alumniNewsService.getList({
      newsType: newsType as any, status: status as any, keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

router.post('/news', async (req: AuthRequest, res: Response) => {
  try {
    const news = await alumniNewsService.create(req.body);
    await logOperation(req.userSession?.userId, 'create', 'alumni_news', news.id, req.body);
    res.json({ success: true, data: news });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '创建失败' });
  }
});

router.put('/news/:id', async (req: AuthRequest, res: Response) => {
  try {
    const news = await alumniNewsService.update(req.params.id, req.body);
    await logOperation(req.userSession?.userId, 'update', 'alumni_news', req.params.id, req.body);
    res.json({ success: true, data: news });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

router.delete('/news/:id', async (req: AuthRequest, res: Response) => {
  try {
    await alumniNewsService.delete(req.params.id);
    await logOperation(req.userSession?.userId, 'delete', 'alumni_news', req.params.id, { id: req.params.id });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// ========== 系统配置管理 ==========

// 获取系统配置
router.get('/config', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM alumni_system.system_config ORDER BY config_key');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

// 更新系统配置
router.put('/config', async (req: AuthRequest, res: Response) => {
  try {
    const configs = req.body;
    for (const [key, value] of Object.entries(configs)) {
      await pool.query(
        'UPDATE alumni_system.system_config SET config_value = $1, updated_at = CURRENT_TIMESTAMP WHERE config_key = $2',
        [value, key]
      );
    }
    await logOperation(req.userSession?.userId, 'update', 'system_config', undefined, configs);
    res.json({ success: true, message: '配置更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
});

// ========== 数据统计 ==========

// 获取统计概览
router.get('/stats/overview', async (_req: AuthRequest, res: Response) => {
  try {
    const [alumni, distinguished, messages, pendingMessages, donations] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM alumni_system.alumni'),
      pool.query('SELECT COUNT(*) FROM alumni_system.distinguished_alumni'),
      pool.query('SELECT COUNT(*) FROM alumni_system.messages'),
      pool.query("SELECT COUNT(*) FROM alumni_system.messages WHERE status = 'pending'"),
      pool.query('SELECT COUNT(*), COALESCE(SUM(amount), 0) as total FROM alumni_system.donations'),
    ]);
    res.json({
      success: true,
      data: {
        totalAlumni: parseInt(alumni.rows[0].count),
        totalDistinguished: parseInt(distinguished.rows[0].count),
        totalMessages: parseInt(messages.rows[0].count),
        pendingMessages: parseInt(pendingMessages.rows[0].count),
        totalDonations: parseInt(donations.rows[0].count),
        totalDonationAmount: parseFloat(donations.rows[0].total || 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 获取趋势数据
router.get('/stats/trends', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM alumni_system.messages 
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取趋势失败' });
  }
});

// ========== 知识库管理 ==========

// 获取知识库列表
router.get('/knowledge', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, title, type, status, source, content, created_at as "createdAt"
       FROM alumni_system.knowledge_base ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('获取知识库列表失败:', error);
    res.json({ success: true, data: [] });
  }
});

// 添加文本到知识库
router.post('/knowledge/text', async (req: AuthRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: '标题和内容不能为空' });
    }

    // 存入数据库
    const result = await pool.query(
      `INSERT INTO alumni_system.knowledge_base (title, type, content, status, created_at)
       VALUES ($1, 'text', $2, 'processing', NOW()) RETURNING id`,
      [title, content]
    );
    const id = result.rows[0].id;

    // 异步向量化（不阻塞响应）
    ragService.addToKnowledge(content, { title, type: 'text', id }).catch(console.error);

    // 更新状态为完成
    await pool.query(`UPDATE alumni_system.knowledge_base SET status = 'completed' WHERE id = $1`, [id]);

    res.json({ success: true, data: { id, title, type: 'text', status: 'completed' } });
  } catch (error) {
    console.error('添加文本失败:', error);
    res.status(500).json({ success: false, message: '添加失败' });
  }
});

// 抓取网页内容到知识库
router.post('/knowledge/webpage', async (req: AuthRequest, res: Response) => {
  try {
    const { url, title } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: '网址不能为空' });
    }

    // 先创建记录
    const result = await pool.query(
      `INSERT INTO alumni_system.knowledge_base (title, type, source, status, created_at)
       VALUES ($1, 'webpage', $2, 'processing', NOW()) RETURNING id`,
      [title || '网页内容', url]
    );
    const id = result.rows[0].id;

    // 抓取网页内容
    try {
      const response = await fetch(url);
      const html = await response.text();
      
      // 简单提取文本内容（去除HTML标签）
      const textContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50000); // 限制长度

      // 提取标题
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const pageTitle = title || (titleMatch ? titleMatch[1].trim() : '网页内容');

      // 更新数据库
      await pool.query(
        `UPDATE alumni_system.knowledge_base SET title = $1, content = $2, status = 'completed' WHERE id = $3`,
        [pageTitle, textContent, id]
      );

      // 向量化
      ragService.addToKnowledge(textContent, { title: pageTitle, type: 'webpage', source: url, id }).catch(console.error);

      res.json({ success: true, data: { id, title: pageTitle, type: 'webpage', status: 'completed', source: url } });
    } catch (fetchError) {
      await pool.query(`UPDATE alumni_system.knowledge_base SET status = 'failed' WHERE id = $1`, [id]);
      res.status(500).json({ success: false, message: '网页抓取失败' });
    }
  } catch (error) {
    console.error('抓取网页失败:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

// 删除知识库条目
router.delete('/knowledge/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM alumni_system.knowledge_base WHERE id = $1`, [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除知识库条目失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ========== 老物件管理 ==========

// 获取老物件列表
router.get('/vintage-items', async (req: AuthRequest, res: Response) => {
  try {
    const { itemType, era, keyword, page, pageSize } = req.query;
    const result = await vintageItemService.getList({
      itemType: itemType as any,
      era: era as string,
      keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

// 获取老物件筛选选项
router.get('/vintage-items/options', async (_req: AuthRequest, res: Response) => {
  try {
    const options = await vintageItemService.getFilterOptions();
    res.json({ success: true, data: options });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取选项失败' });
  }
});

// 获取老物件详情
router.get('/vintage-items/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await vintageItemService.getById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: '老物件不存在' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

// 创建老物件
router.post('/vintage-items', async (req: AuthRequest, res: Response) => {
  try {
    const item = await vintageItemService.create(req.body);
    await logOperation(req.userSession?.userId, 'create', 'vintage_item', item.id, req.body);
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '创建失败' });
  }
});

// 更新老物件
router.put('/vintage-items/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await vintageItemService.update(req.params.id, req.body);
    await logOperation(req.userSession?.userId, 'update', 'vintage_item', req.params.id, req.body);
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 删除老物件
router.delete('/vintage-items/:id', async (req: AuthRequest, res: Response) => {
  try {
    await vintageItemService.delete(req.params.id);
    await logOperation(req.userSession?.userId, 'delete', 'vintage_item', req.params.id, { id: req.params.id });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// ========== 班级名录管理 ==========

// 获取班级名录列表
router.get('/class-rosters', async (req: AuthRequest, res: Response) => {
  try {
    const { graduationYear, keyword, page, pageSize } = req.query;
    const result = await classRosterService.getList({
      graduationYear: graduationYear ? parseInt(graduationYear as string) : undefined,
      keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

// 获取班级名录筛选选项
router.get('/class-rosters/options', async (_req: AuthRequest, res: Response) => {
  try {
    const options = await classRosterService.getFilterOptions();
    res.json({ success: true, data: options });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取选项失败' });
  }
});

// 获取班级名录详情（包含学生和照片）
router.get('/class-rosters/:id', async (req: AuthRequest, res: Response) => {
  try {
    const roster = await classRosterService.getById(req.params.id);
    if (!roster) return res.status(404).json({ success: false, message: '班级名录不存在' });
    res.json({ success: true, data: roster });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

// 创建班级名录
router.post('/class-rosters', async (req: AuthRequest, res: Response) => {
  try {
    const roster = await classRosterService.create(req.body);
    await logOperation(req.userSession?.userId, 'create', 'class_roster', roster.id, req.body);
    res.json({ success: true, data: roster });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '创建失败' });
  }
});

// 更新班级名录
router.put('/class-rosters/:id', async (req: AuthRequest, res: Response) => {
  try {
    const roster = await classRosterService.update(req.params.id, req.body);
    await logOperation(req.userSession?.userId, 'update', 'class_roster', req.params.id, req.body);
    res.json({ success: true, data: roster });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 删除班级名录
router.delete('/class-rosters/:id', async (req: AuthRequest, res: Response) => {
  try {
    await classRosterService.delete(req.params.id);
    await logOperation(req.userSession?.userId, 'delete', 'class_roster', req.params.id, { id: req.params.id });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// 关联班级与毕业照
router.post('/class-rosters/:id/photos/:photoId', async (req: AuthRequest, res: Response) => {
  try {
    await classRosterService.linkPhoto(req.params.id, req.params.photoId);
    res.json({ success: true, message: '关联成功' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '关联失败' });
  }
});

// 取消关联班级与毕业照
router.delete('/class-rosters/:id/photos/:photoId', async (req: AuthRequest, res: Response) => {
  try {
    await classRosterService.unlinkPhoto(req.params.id, req.params.photoId);
    res.json({ success: true, message: '取消关联成功' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '取消关联失败' });
  }
});

// 添加学生
router.post('/class-rosters/:id/students', async (req: AuthRequest, res: Response) => {
  try {
    const student = await classRosterService.addStudent({
      classId: req.params.id,
      ...req.body,
    });
    res.json({ success: true, data: student });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '添加失败' });
  }
});

// 更新学生信息
router.put('/class-rosters/:classId/students/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const student = await classRosterService.updateStudent(req.params.studentId, req.body);
    if (!student) {
      return res.status(404).json({ success: false, message: '学生不存在' });
    }
    res.json({ success: true, data: student });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 删除学生
router.delete('/class-rosters/:classId/students/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    await classRosterService.removeStudent(req.params.studentId);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// 批量导入学生
router.post('/class-rosters/:id/students/import', async (req: AuthRequest, res: Response) => {
  try {
    const { students } = req.body;
    const result = await classRosterService.importStudents(req.params.id, students);
    await logOperation(req.userSession?.userId, 'import_students', 'class_roster', req.params.id, result);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || '导入失败' });
  }
});

// ========== 时空长廊统计 ==========

// 获取仪表盘统计概览
router.get('/stats/overview', async (_req: AuthRequest, res: Response) => {
  try {
    const [alumni, distinguished, messages, pendingMessages, donations] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM alumni_system.alumni'),
      pool.query('SELECT COUNT(*) FROM alumni_system.distinguished_alumni'),
      pool.query('SELECT COUNT(*) FROM alumni_system.messages'),
      pool.query('SELECT COUNT(*) FROM alumni_system.messages WHERE status = $1', ['pending']),
      pool.query('SELECT COUNT(*), COALESCE(SUM(amount), 0) as total FROM alumni_system.donations'),
    ]);
    res.json({
      success: true,
      data: {
        totalAlumni: parseInt(alumni.rows[0].count),
        totalDistinguished: parseInt(distinguished.rows[0].count),
        totalMessages: parseInt(messages.rows[0].count),
        pendingMessages: parseInt(pendingMessages.rows[0].count),
        totalDonations: parseInt(donations.rows[0].count),
        totalDonationAmount: parseFloat(donations.rows[0].total),
      },
    });
  } catch (error) {
    console.error('获取统计概览失败:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 获取时空长廊统计概览
router.get('/stats/time-corridor', async (_req: AuthRequest, res: Response) => {
  try {
    const [photos, items, rosters] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM alumni_system.graduation_photos'),
      pool.query('SELECT COUNT(*) FROM alumni_system.vintage_items'),
      pool.query('SELECT COUNT(*) FROM alumni_system.class_rosters'),
    ]);
    res.json({
      success: true,
      data: {
        totalPhotos: parseInt(photos.rows[0].count),
        totalVintageItems: parseInt(items.rows[0].count),
        totalClassRosters: parseInt(rosters.rows[0].count),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 获取毕业照按年份统计
router.get('/stats/photos-by-year', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT year, COUNT(*) as count 
       FROM alumni_system.graduation_photos 
       GROUP BY year 
       ORDER BY year DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 获取老物件按类型统计
router.get('/stats/items-by-type', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT item_type as type, COUNT(*) as count 
       FROM alumni_system.vintage_items 
       GROUP BY item_type 
       ORDER BY count DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 获取操作日志
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, pageSize = 20, operationType, startDate, endDate } = req.query;
    
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (operationType) {
      conditions.push(`operation_type = $${paramIndex++}`);
      params.push(operationType);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.operation_logs WHERE ${conditions.join(' AND ')}`,
      params
    );

    const offset = (Number(page) - 1) * Number(pageSize);
    params.push(Number(pageSize), offset);
    const limitParam = paramIndex++;
    const offsetParam = paramIndex;

    const result = await pool.query(
      `SELECT * FROM alumni_system.operation_logs 
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    res.json({
      success: true,
      data: {
        items: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.status(500).json({ success: false, message: '获取日志失败' });
  }
});

// ========== 视频寄语管理 ==========

import { videoGreetingService } from '../services/videoGreetingService';
import { interactionStatsService } from '../services/interactionStatsService';
import { topScholarService } from '../services/topScholarService';

// 获取视频列表（管理端）
router.get('/video-greetings', async (req: AuthRequest, res: Response) => {
  try {
    const { status, keyword, page, pageSize } = req.query;
    const result = await videoGreetingService.getList({
      status: status as any,
      keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取视频列表失败:', error);
    res.status(500).json({ success: false, message: '获取列表失败' });
  }
});

// 获取视频详情
router.get('/video-greetings/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await videoGreetingService.getById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: '视频不存在' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取视频详情失败:', error);
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

// 更新视频状态
router.put('/video-greetings/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status, rejectionReason } = req.body;
    const result = await videoGreetingService.updateStatus(
      req.params.id,
      status,
      rejectionReason,
      req.userSession?.userId
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('更新视频状态失败:', error);
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 设置/取消精选
router.put('/video-greetings/:id/feature', async (req: AuthRequest, res: Response) => {
  try {
    const { featured } = req.body;
    const result = await videoGreetingService.setFeatured(req.params.id, featured);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('设置精选失败:', error);
    res.status(400).json({ success: false, message: error.message || '设置失败' });
  }
});

// 删除视频
router.delete('/video-greetings/:id', async (req: AuthRequest, res: Response) => {
  try {
    await videoGreetingService.delete(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('删除视频失败:', error);
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

// ========== 互动统计 ==========

// 获取互动区统计概览
router.get('/interaction-stats', async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await interactionStatsService.getOverview();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取互动统计失败:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 获取趋势数据
router.get('/interaction-stats/trends', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, granularity } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const trends = await interactionStatsService.getTrends(
      start,
      end,
      (granularity as 'day' | 'week' | 'month') || 'day'
    );
    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    res.status(500).json({ success: false, message: '获取趋势数据失败' });
  }
});

// 导出互动数据
router.get('/interaction-export', async (req: AuthRequest, res: Response) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    if (!type || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: '请提供导出类型和日期范围' });
    }

    const csv = await interactionStatsService.exportData(
      type as 'messages' | 'notices' | 'videos',
      {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      }
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_export_${Date.now()}.csv`);
    res.send('\uFEFF' + csv); // 添加BOM以支持Excel中文
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// ========== 状元榜管理 ==========

// 获取状元榜列表（管理端，支持分页和搜索）
router.get('/top-scholars', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, page, pageSize } = req.query;
    const result = await topScholarService.getPaginated({
      keyword: keyword as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('获取状元榜列表失败:', error);
    res.status(500).json({ success: false, message: '获取列表失败', error: error.message });
  }
});

// ========== 知识库管理 ==========

// 获取知识库列表
router.get('/knowledge-base', async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, page, pageSize } = req.query;
    const pageNum = page ? parseInt(page as string) : 1;
    const size = pageSize ? parseInt(pageSize as string) : 20;
    const offset = (pageNum - 1) * size;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (keyword) {
      params.push(`%${keyword}%`);
      whereClause += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length})`;
    }
    
    // 获取总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.knowledge_base ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);
    
    // 获取分页数据
    params.push(size, offset);
    const result = await pool.query(
      `SELECT id, title, category, source, created_at, updated_at 
       FROM alumni_system.knowledge_base 
       ${whereClause}
       ORDER BY updated_at DESC 
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    
    res.json({
      success: true,
      data: {
        items: result.rows,
        total,
        page: pageNum,
        pageSize: size,
      }
    });
  } catch (error: any) {
    console.error('获取知识库列表失败:', error);
    res.status(500).json({ success: false, message: '获取列表失败', error: error.message });
  }
});

// 获取知识库详情
router.get('/knowledge-base/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM alumni_system.knowledge_base WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('获取知识库详情失败:', error);
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

// 创建知识库记录
router.post('/knowledge-base', async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, source, embedding } = req.body;
    const result = await pool.query(
      `INSERT INTO alumni_system.knowledge_base (title, content, category, source, embedding)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, content, category, source, embedding || null]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('创建知识库记录失败:', error);
    res.status(500).json({ success: false, message: '创建失败', error: error.message });
  }
});

// 更新知识库记录
router.put('/knowledge-base/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, source } = req.body;
    const result = await pool.query(
      `UPDATE alumni_system.knowledge_base 
       SET title = $1, content = $2, category = $3, source = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, content, category, source, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('更新知识库记录失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 删除知识库记录
router.delete('/knowledge-base/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `DELETE FROM alumni_system.knowledge_base WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('删除知识库记录失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 获取状元详情
router.get('/top-scholars/:id', async (req: AuthRequest, res: Response) => {
  try {
    const scholar = await topScholarService.getById(req.params.id);
    if (!scholar) {
      return res.status(404).json({ success: false, message: '状元记录不存在' });
    }
    res.json({ success: true, data: scholar });
  } catch (error) {
    console.error('获取状元详情失败:', error);
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

// 创建状元
router.post('/top-scholars', async (req: AuthRequest, res: Response) => {
  try {
    const result = await topScholarService.create(req.body);
    if (result.errors) {
      return res.status(400).json({ success: false, message: '验证失败', errors: result.errors });
    }
    await logOperation(req.userSession?.userId, 'create', 'top_scholar', result.scholar!.id, req.body);
    res.json({ success: true, data: result.scholar });
  } catch (error: any) {
    console.error('创建状元失败:', error);
    res.status(400).json({ success: false, message: error.message || '创建失败' });
  }
});

// 更新状元
router.put('/top-scholars/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await topScholarService.update(req.params.id, req.body);
    if (result.errors) {
      return res.status(400).json({ success: false, message: '验证失败', errors: result.errors });
    }
    await logOperation(req.userSession?.userId, 'update', 'top_scholar', req.params.id, req.body);
    res.json({ success: true, data: result.scholar });
  } catch (error: any) {
    console.error('更新状元失败:', error);
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

// 删除状元（软删除）
router.delete('/top-scholars/:id', async (req: AuthRequest, res: Response) => {
  try {
    const success = await topScholarService.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: '状元记录不存在' });
    }
    await logOperation(req.userSession?.userId, 'delete', 'top_scholar', req.params.id, { id: req.params.id });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('删除状元失败:', error);
    res.status(400).json({ success: false, message: error.message || '删除失败' });
  }
});

export default router;
