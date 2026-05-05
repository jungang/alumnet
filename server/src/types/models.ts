// 可见性级别
export type VisibilityLevel = 'public' | 'classmates_only' | 'private';

// 校友状态
export type AlumniStatus = 'active' | 'lost_contact' | 'deceased';

// 用户角色
export type UserRole = 'guest' | 'verified_alumni' | 'admin' | 'super_admin';

// 留言状态
export type MessageStatus = 'pending' | 'approved' | 'rejected';

// 寻人启事状态
export type SearchNoticeStatus = 'active' | 'found' | 'closed';

// 隐私握手状态
export type HandshakeStatus = 'pending' | 'approved' | 'rejected' | 'expired';

// 隐私设置
export interface PrivacySettings {
  phoneVisibility: VisibilityLevel;
  emailVisibility: VisibilityLevel;
  workUnitVisibility: VisibilityLevel;
  addressVisibility: VisibilityLevel;
}

// 校友基础信息
export interface Alumni {
  id: string;
  name: string;
  studentId?: string;
  graduationYear: number;
  className: string;
  industry?: string;
  currentCity?: string;
  workUnit?: string;
  phone?: string;
  email?: string;
  phoneVisibility: VisibilityLevel;
  emailVisibility: VisibilityLevel;
  status: AlumniStatus;
  biography?: string;
  photoUrl?: string;
  extraInfo?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// 校友详情（包含更多信息）
export interface AlumniDetail extends Alumni {
  biography?: string;
  achievements?: string[];
  photoUrl?: string;
}

// 杰出校友
export interface DistinguishedAlumni {
  alumniId: string;
  category: string;
  achievement: string;
  biography: string;
  videoUrl?: string;
  popularity: number;
  timeline: TimelineEvent[];
}

// 时间线事件
export interface TimelineEvent {
  year: number;
  title: string;
  description: string;
}

// 毕业照
export interface GraduationPhoto {
  id: string;
  year: number;
  className: string;
  originalUrl: string;
  restoredUrl?: string;
  faceTags: FaceTag[];
}

// 人脸标记
export interface FaceTag {
  alumniId?: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  name: string;
}

// 留言
export interface Message {
  id: string;
  authorId?: string;
  authorName: string;
  authorClass?: string;
  content: string;
  handwritingImageUrl?: string;
  status: MessageStatus;
  createdAt: Date;
}

// 寻人启事
export interface SearchNotice {
  id: string;
  publisherId: string;
  targetName: string;
  targetClass?: string;
  description: string;
  story?: string;
  status: SearchNoticeStatus;
  createdAt: Date;
}

// 隐私握手请求
export interface PrivacyHandshake {
  id: string;
  requesterId: string;
  targetId: string;
  reason: string;
  status: HandshakeStatus;
  createdAt: Date;
  respondedAt?: Date;
}

// 用户会话
export interface UserSession {
  userId?: string;
  role: UserRole;
  alumniId?: string;
  className?: string;
}

// 捐赠记录
export interface Donation {
  id: string;
  donorId?: string;
  donorName: string;
  amount: number;
  projectId: string;
  message?: string;
  createdAt: Date;
}

// 操作日志
export interface OperationLog {
  id: string;
  userId?: string;
  operationType: string;
  targetType: string;
  targetId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}


// ============================================
// 后台管理功能补全 - 新增类型定义
// ============================================

// 捐赠项目状态
export type DonationProjectStatus = 'active' | 'completed' | 'closed';

// 校友动态类型
export type AlumniNewsType = 'award' | 'donation' | 'activity' | 'news';

// 校友动态状态
export type AlumniNewsStatus = 'draft' | 'published' | 'archived';

// 系统配置类型
export type SystemConfigType = 'string' | 'number' | 'boolean' | 'json';

// 管理员角色
export type AdminRole = 'admin' | 'super_admin';

// 管理员状态
export type AdminStatus = 'active' | 'disabled';

// 捐赠项目
export interface DonationProject {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  status: DonationProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

// 校友会
export interface AlumniAssociation {
  id: string;
  city: string;
  region?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  wechatQrcode?: string;
  memberCount: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 校友动态
export interface AlumniNews {
  id: string;
  title: string;
  content?: string;
  alumniId?: string;
  alumniName?: string;
  newsType: AlumniNewsType;
  publishDate?: Date;
  status: AlumniNewsStatus;
  createdAt: Date;
  updatedAt: Date;
}

// 系统配置
export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: SystemConfigType;
  description?: string;
  updatedAt: Date;
}

// 管理员账号
export interface AdminUser {
  id: string;
  username: string;
  passwordHash?: string; // 不在API响应中返回
  displayName?: string;
  role: AdminRole;
  status: AdminStatus;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 留言详情（增强）
export interface MessageDetail {
  id: string;
  content: string;
  handwritingImage?: string;
  authorName?: string;
  authorClass?: string;
  status: MessageStatus;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

// 批量审核请求
export interface BatchReviewRequest {
  ids: string[];
  status: 'approved' | 'rejected';
  reason?: string;
  rejectionReason?: string;
}

// 统计数据概览
export interface StatsOverview {
  totalAlumni: number;
  totalDistinguished: number;
  totalMessages: number;
  pendingMessages: number;
  totalDonations: number;
  totalDonationAmount: number;
}

// 列表API响应格式
export interface ListResponse<T> {
  items: T[];
  total: number;
}


// ============================================
// 时空长廊功能增强 - 新增类型定义
// ============================================

// 老物件类型
export type VintageItemType = 
  | 'admission_notice'    // 录取通知书
  | 'diploma'             // 毕业证
  | 'badge'               // 校徽
  | 'meal_ticket'         // 饭票
  | 'textbook'            // 课本
  | 'photo'               // 老照片
  | 'certificate'         // 证书
  | 'other';              // 其他

// 老物件
export interface VintageItem {
  id: string;
  name: string;
  itemType: VintageItemType;
  era?: string;
  description?: string;
  images: string[];
  sortOrder: number;
  donorName?: string;
  donorClass?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 班级名录
export interface ClassRoster {
  id: string;
  className: string;
  graduationYear: number;
  headTeacher?: string;
  studentCount: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 班级名录详情（包含学生和照片）
export interface ClassRosterDetail extends ClassRoster {
  students: ClassStudent[];
  photos: GraduationPhoto[];
}

// 班级学生
export interface ClassStudent {
  id: string;
  classId: string;
  studentName: string;
  studentId?: string;
  alumniId?: string;
  seatNumber?: number;
  createdAt?: Date;
}

// 边界框（用于人脸标记）
export interface BoundingBox {
  x: number;      // 左上角X坐标（百分比 0-100）
  y: number;      // 左上角Y坐标（百分比 0-100）
  width: number;  // 宽度（百分比 0-100）
  height: number; // 高度（百分比 0-100）
}

// 文件上传结果
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  filename?: string;
  size?: number;
}

// 批量导入结果
export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; reason: string }[];
}

// 时空长廊统计
export interface TimeCorridorStats {
  totalPhotos: number;
  totalVintageItems: number;
  totalClassRosters: number;
  photosByYear: { year: number; count: number }[];
  itemsByType: { type: VintageItemType; count: number }[];
}


// ============================================
// 互动寄语区功能增强 - 新增类型定义
// ============================================

// 留言分类
export type MessageCategory = 'school' | 'teacher' | 'classmate';

// 视频寄语状态
export type VideoGreetingStatus = 'pending' | 'approved' | 'rejected' | 'featured';

// 联系偏好
export type ContactPreference = 'system' | 'email' | 'phone' | 'wechat';

// 视频寄语
export interface VideoGreeting {
  id: string;
  alumniId?: string;
  alumniName: string;
  alumniClass?: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  status: VideoGreetingStatus;
  rejectionReason?: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 内容审计日志
export interface ContentAuditLog {
  id: string;
  contentType: string;
  contentId: string;
  action: string;
  originalContent?: Record<string, any>;
  newContent?: Record<string, any>;
  operatorId?: string;
  reason?: string;
  createdAt: Date;
}

// 扩展留言详情（带分类）
export interface MessageDetailWithCategory extends MessageDetail {
  category: MessageCategory;
  rejectionReason?: string;
  handwritingImageUrl?: string;
}

// 扩展寻人启事（带联系偏好和重逢故事）
export interface SearchNoticeExtended extends SearchNotice {
  contactPreference: ContactPreference;
  reunionStory?: string;
  lastReminderAt?: Date;
  publisherName?: string;
  publisherClass?: string;
}

// 留言分类统计
export interface MessageCategoryStats {
  category: MessageCategory;
  count: number;
}

// 互动区统计
export interface InteractionStats {
  messages: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byCategory: MessageCategoryStats[];
  };
  searchNotices: {
    total: number;
    active: number;
    found: number;
    closed: number;
  };
  videoGreetings: {
    total: number;
    pending: number;
    approved: number;
    featured: number;
    rejected: number;
    totalViews: number;
  };
  trends: InteractionTrendData[];
  averageReviewTime: {
    messages: number; // 秒
    videos: number;   // 秒
  };
}

// 趋势数据
export interface InteractionTrendData {
  date: string;
  messages: number;
  notices: number;
  videos: number;
}

// 视频上传数据
export interface VideoUploadData {
  alumniId?: string;
  alumniName: string;
  alumniClass?: string;
  title: string;
  description?: string;
}

// 留言创建数据
export interface MessageCreateData {
  content: string;
  category: MessageCategory;
  authorId?: string;
  authorName?: string;
  authorClass?: string;
  handwritingImageUrl?: string;
}

// 寻人启事创建数据
export interface SearchNoticeCreateData {
  publisherId: string;
  targetName: string;
  targetClass?: string;
  description: string;
  story?: string;
  contactPreference: ContactPreference;
}

// 日期范围
export interface DateRange {
  startDate: Date;
  endDate: Date;
}



// ============================================
// 状元榜功能 - 新增类型定义
// ============================================

// 高考状元
export interface TopScholar {
  id: string;
  name: string;
  examYear: number;
  rankDescription: string;  // 如"吉林地区文科第一名"
  university?: string;      // 录取院校
  major?: string;           // 专业
  score?: number;           // 高考分数
  photoUrl?: string;
  biography?: string;
  alumniId?: string;        // 关联校友ID
  sortOrder: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 创建状元DTO
export interface CreateTopScholarDto {
  name: string;
  examYear: number;
  rankDescription: string;
  university?: string;
  major?: string;
  score?: number;
  photoUrl?: string;
  biography?: string;
  alumniId?: string;
  sortOrder?: number;
}

// 更新状元DTO
export interface UpdateTopScholarDto {
  name?: string;
  examYear?: number;
  rankDescription?: string;
  university?: string;
  major?: string;
  score?: number;
  photoUrl?: string;
  biography?: string;
  alumniId?: string;
  sortOrder?: number;
}

// 杰出校友类别（扩展）
export type DistinguishedCategory = 
  | '政界' | '商界' | '学术' | '文化' | '医疗' 
  | '教育' | '科技' | '体育' | '革命烈士' | '其他';
