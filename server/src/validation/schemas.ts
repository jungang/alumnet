/**
 * Zod 输入验证层
 * 所有写操作 API 的输入 schema 定义
 * 配合 validate() 中间件使用
 */

import { z } from 'zod';

// ============ 通用 ============

export const uuidSchema = z.string().uuid();
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
});

// ============ 校友 ============

export const createAlumniSchema = z.object({
  name: z.string().min(1).max(50),
  graduation_year: z.number().int().min(1900).max(2100).optional(),
  class_name: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().max(100).optional(),
  bio: z.string().max(2000).optional(),
  alumni_id: z.string().max(50).optional(),
});

export const updateAlumniSchema = createAlumniSchema.partial();

export const importAlumniSchema = z.object({
  alumni: z.array(createAlumniSchema).min(1).max(500),
  classId: z.string().uuid().optional(),
});

// ============ 留言 ============

export const reviewMessageSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
});

export const batchReviewSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
});

// ============ 杰出校友 ============

export const createDistinguishedSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.string().max(50).optional(),
  graduation_year: z.number().int().min(1900).max(2100).optional(),
  achievement: z.string().max(2000).optional(),
  photo_url: z.string().url().max(500).optional(),
  bio: z.string().max(5000).optional(),
});

export const updateDistinguishedSchema = createDistinguishedSchema.partial();

// ============ 班级名录 ============

export const createClassRosterSchema = z.object({
  name: z.string().min(1).max(100),
  year: z.number().int().min(1900).max(2100).optional(),
  teacher: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
});

export const updateClassRosterSchema = createClassRosterSchema.partial();

export const addStudentSchema = z.object({
  classId: z.string().uuid(),
  studentName: z.string().min(1).max(50),
  studentId: z.string().max(50).optional(),
  alumniId: z.string().uuid().optional(),
  seatNumber: z.number().int().positive().optional(),
});

export const importStudentsSchema = z.object({
  students: z.array(z.object({
    studentName: z.string().min(1).max(50),
    studentId: z.string().max(50).optional(),
    seatNumber: z.number().int().positive().optional(),
  })).min(1).max(500),
});

// ============ 毕业照 ============

export const createPhotoSchema = z.object({
  title: z.string().min(1).max(100),
  year: z.number().int().min(1900).max(2100).optional(),
  class_name: z.string().max(50).optional(),
  photo_url: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
});

export const updatePhotoSchema = createPhotoSchema.partial();

export const updateFaceTagsSchema = z.object({
  faceTags: z.array(z.object({
    name: z.string().max(50),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1),
    height: z.number().min(0).max(1),
    alumniId: z.string().uuid().optional(),
  })),
});

// ============ 寻人启事 ============

export const reviewNoticeSchema = z.object({
  status: z.enum(['found', 'closed']),
  reunionStory: z.string().max(2000).optional(),
});

// ============ 捐赠项目 ============

export const createDonationProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  targetAmount: z.number().positive(),
});

export const updateDonationProjectSchema = createDonationProjectSchema.partial();

// ============ 校友会 ============

export const createAssociationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  region: z.string().max(50).optional(),
  contact: z.string().max(100).optional(),
});

export const updateAssociationSchema = createAssociationSchema.partial();

// ============ 新闻 ============

export const createNewsSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  summary: z.string().max(500).optional(),
  cover_url: z.string().url().max(500).optional(),
  source: z.string().max(100).optional(),
});

export const updateNewsSchema = createNewsSchema.partial();

// ============ 老物件 ============

export const createVintageItemSchema = z.object({
  title: z.string().min(1).max(100),
  item_type: z.string().max(50).optional(),
  era: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  photo_url: z.string().max(500).optional(),
  donor: z.string().max(50).optional(),
  year: z.number().int().min(1800).max(2100).optional(),
});

export const updateVintageItemSchema = createVintageItemSchema.partial();

// ============ 视频寄语 ============

export const reviewVideoSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
});

export const featureVideoSchema = z.object({
  featured: z.boolean(),
});

// ============ 知识库 ============

export const createKnowledgeTextSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
});

export const createKnowledgeWebpageSchema = z.object({
  url: z.string().url().max(500),
  title: z.string().max(200).optional(),
});

export const createKnowledgeBaseSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['text', 'webpage', 'document']).default('text'),
  content: z.string().max(50000).optional(),
  source: z.string().max(500).optional(),
});

export const updateKnowledgeBaseSchema = z.object({
  title: z.string().max(200).optional(),
  type: z.enum(['text', 'webpage', 'document']).optional(),
  content: z.string().max(50000).optional(),
  source: z.string().max(500).optional(),
  status: z.enum(['processing', 'completed', 'failed']).optional(),
});

// ============ 顶尖学者 ============

export const createTopScholarSchema = z.object({
  name: z.string().min(1).max(50),
  field: z.string().max(100).optional(),
  graduation_year: z.number().int().min(1900).max(2100).optional(),
  achievement: z.string().max(2000).optional(),
  institution: z.string().max(100).optional(),
  photo_url: z.string().url().max(500).optional(),
});

export const updateTopScholarSchema = createTopScholarSchema.partial();

// ============ RAG 配置 ============

export const updateRagConfigSchema = z.object({
  school_name: z.string().max(100).optional(),
  school_since: z.string().max(20).optional(),
  school_motto: z.string().max(200).optional(),
  rag_system_prompt: z.string().max(5000).optional(),
});

// ============ RAG 查询 ============

export const ragQuerySchema = z.object({
  query: z.string().min(1).max(500),
});

// ============ 系统配置 ============

export const updateConfigSchema = z.record(z.string(), z.string().max(5000));

// ============ 验证中间件 ============

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../middleware/errorHandler';

export function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(errors.join('; '));
    }
    req.body = result.data;
    next();
  };
}
