/**
 * 服务端测试数据生成器
 * 使用 fast-check 生成随机测试数据
 */

import * as fc from 'fast-check';
import {
  Alumni,
  AlumniStatus,
  VisibilityLevel,
  Message,
  MessageStatus,
  GraduationPhoto,
  FaceTag,
  VintageItem,
  VintageItemType,
  ClassRoster,
  ClassStudent,
  VideoGreeting,
  VideoGreetingStatus,
  DonationProject,
  DonationProjectStatus,
  AlumniAssociation,
  AlumniNews,
  AlumniNewsType,
  AlumniNewsStatus,
  SearchNotice,
  SearchNoticeStatus,
  UserRole,
  MessageCategory,
  ContactPreference,
} from '../../src/types/models';

// ============================================
// 基础类型生成器
// ============================================

export const visibilityLevelArbitrary: fc.Arbitrary<VisibilityLevel> = 
  fc.constantFrom('public', 'classmates_only', 'private');

export const alumniStatusArbitrary: fc.Arbitrary<AlumniStatus> = 
  fc.constantFrom('active', 'lost_contact', 'deceased');

export const messageStatusArbitrary: fc.Arbitrary<MessageStatus> = 
  fc.constantFrom('pending', 'approved', 'rejected');

export const userRoleArbitrary: fc.Arbitrary<UserRole> = 
  fc.constantFrom('guest', 'verified_alumni', 'admin');

export const messageCategoryArbitrary: fc.Arbitrary<MessageCategory> = 
  fc.constantFrom('school', 'teacher', 'classmate');

export const contactPreferenceArbitrary: fc.Arbitrary<ContactPreference> = 
  fc.constantFrom('system', 'email', 'phone', 'wechat');

export const industryArbitrary = fc.constantFrom(
  '政界', '商界', '学术', '艺术', '医疗', '教育', '科技'
);

// 手机号生成器（11位数字）
export const phoneArbitrary = fc.stringOf(
  fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
  { minLength: 11, maxLength: 11 }
);

// ============================================
// 校友数据生成器
// ============================================

export const alumniArbitrary: fc.Arbitrary<Alumni> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  studentId: fc.option(fc.string({ minLength: 5, maxLength: 20 })),
  graduationYear: fc.integer({ min: 1950, max: 2024 }),
  className: fc.string({ minLength: 1, maxLength: 50 }),
  department: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  industry: fc.option(industryArbitrary),
  currentCity: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  workUnit: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  phone: fc.option(phoneArbitrary),
  email: fc.option(fc.emailAddress()),
  phoneVisibility: visibilityLevelArbitrary,
  emailVisibility: visibilityLevelArbitrary,
  status: alumniStatusArbitrary,
  extraInfo: fc.option(fc.object()),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ============================================
// 留言数据生成器
// ============================================

export const messageArbitrary: fc.Arbitrary<Message> = fc.record({
  id: fc.uuid(),
  authorId: fc.option(fc.uuid()),
  authorName: fc.string({ minLength: 1, maxLength: 50 }),
  authorClass: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  handwritingImageUrl: fc.option(fc.webUrl()),
  status: messageStatusArbitrary,
  createdAt: fc.date(),
});

// ============================================
// 毕业照数据生成器
// ============================================

export const boundingBoxArbitrary = fc.record({
  x: fc.integer({ min: 0, max: 100 }),
  y: fc.integer({ min: 0, max: 100 }),
  width: fc.integer({ min: 5, max: 50 }),
  height: fc.integer({ min: 5, max: 50 }),
});

export const faceTagArbitrary: fc.Arbitrary<FaceTag> = fc.record({
  alumniId: fc.option(fc.uuid()),
  boundingBox: boundingBoxArbitrary,
  name: fc.string({ minLength: 1, maxLength: 50 }),
});

export const graduationPhotoArbitrary: fc.Arbitrary<GraduationPhoto> = fc.record({
  id: fc.uuid(),
  year: fc.integer({ min: 1950, max: 2024 }),
  className: fc.string({ minLength: 1, maxLength: 100 }),
  originalUrl: fc.webUrl(),
  restoredUrl: fc.option(fc.webUrl()),
  faceTags: fc.array(faceTagArbitrary, { minLength: 0, maxLength: 20 }),
});

// ============================================
// 老物件数据生成器
// ============================================

export const vintageItemTypeArbitrary: fc.Arbitrary<VintageItemType> = fc.constantFrom(
  'admission_notice', 'diploma', 'badge', 'meal_ticket', 
  'textbook', 'photo', 'certificate', 'other'
);

export const vintageItemArbitrary: fc.Arbitrary<VintageItem> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  itemType: vintageItemTypeArbitrary,
  era: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
  images: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
  sortOrder: fc.integer({ min: 0, max: 1000 }),
  donorName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  donorClass: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ============================================
// 班级花名册数据生成器
// ============================================

export const classStudentArbitrary: fc.Arbitrary<ClassStudent> = fc.record({
  id: fc.uuid(),
  classId: fc.uuid(),
  studentName: fc.string({ minLength: 1, maxLength: 50 }),
  studentId: fc.option(fc.string({ minLength: 5, maxLength: 20 })),
  alumniId: fc.option(fc.uuid()),
  seatNumber: fc.option(fc.integer({ min: 1, max: 100 })),
  createdAt: fc.option(fc.date()),
});

export const classRosterArbitrary: fc.Arbitrary<ClassRoster> = fc.record({
  id: fc.uuid(),
  className: fc.string({ minLength: 1, maxLength: 100 }),
  graduationYear: fc.integer({ min: 1950, max: 2024 }),
  department: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  headTeacher: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  studentCount: fc.integer({ min: 0, max: 100 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ============================================
// 视频祝福数据生成器
// ============================================

export const videoGreetingStatusArbitrary: fc.Arbitrary<VideoGreetingStatus> = 
  fc.constantFrom('pending', 'approved', 'rejected', 'featured');

export const videoGreetingArbitrary: fc.Arbitrary<VideoGreeting> = fc.record({
  id: fc.uuid(),
  alumniId: fc.option(fc.uuid()),
  alumniName: fc.string({ minLength: 1, maxLength: 50 }),
  alumniClass: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
  videoUrl: fc.webUrl(),
  thumbnailUrl: fc.option(fc.webUrl()),
  durationSeconds: fc.option(fc.integer({ min: 1, max: 600 })),
  status: videoGreetingStatusArbitrary,
  rejectionReason: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
  reviewedAt: fc.option(fc.date()),
  reviewedBy: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  viewCount: fc.integer({ min: 0, max: 100000 }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ============================================
// 捐赠项目数据生成器
// ============================================

export const donationProjectStatusArbitrary: fc.Arbitrary<DonationProjectStatus> = 
  fc.constantFrom('active', 'completed', 'closed');

export const donationProjectArbitrary: fc.Arbitrary<DonationProject> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
  targetAmount: fc.float({ min: 1000, max: 10000000, noNaN: true }),
  currentAmount: fc.float({ min: 0, max: 10000000, noNaN: true }),
  status: donationProjectStatusArbitrary,
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ============================================
// 校友会数据生成器
// ============================================

export const alumniAssociationArbitrary: fc.Arbitrary<AlumniAssociation> = fc.record({
  id: fc.uuid(),
  city: fc.string({ minLength: 1, maxLength: 100 }),
  region: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  contactName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  contactPhone: fc.option(phoneArbitrary),
  contactEmail: fc.option(fc.emailAddress()),
  wechatQrcode: fc.option(fc.webUrl()),
  memberCount: fc.integer({ min: 0, max: 10000 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ============================================
// 校友动态数据生成器
// ============================================

export const alumniNewsTypeArbitrary: fc.Arbitrary<AlumniNewsType> = 
  fc.constantFrom('award', 'donation', 'activity', 'news');

export const alumniNewsStatusArbitrary: fc.Arbitrary<AlumniNewsStatus> = 
  fc.constantFrom('draft', 'published', 'archived');

export const alumniNewsArbitrary: fc.Arbitrary<AlumniNews> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  content: fc.option(fc.string({ minLength: 1, maxLength: 2000 })),
  alumniId: fc.option(fc.uuid()),
  alumniName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  newsType: alumniNewsTypeArbitrary,
  publishDate: fc.option(fc.date()),
  status: alumniNewsStatusArbitrary,
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ============================================
// 寻人启事数据生成器
// ============================================

export const searchNoticeStatusArbitrary: fc.Arbitrary<SearchNoticeStatus> = 
  fc.constantFrom('active', 'found', 'closed');

export const searchNoticeArbitrary: fc.Arbitrary<SearchNotice> = fc.record({
  id: fc.uuid(),
  publisherId: fc.uuid(),
  targetName: fc.string({ minLength: 1, maxLength: 50 }),
  targetClass: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  story: fc.option(fc.string({ minLength: 1, maxLength: 1000 })),
  status: searchNoticeStatusArbitrary,
  createdAt: fc.date(),
});

// ============================================
// 内存存储模拟类（用于属性测试）
// ============================================

export class InMemoryStore<T extends { id: string }> {
  private store: Map<string, T> = new Map();

  create(item: T): T {
    this.store.set(item.id, { ...item });
    return { ...item };
  }

  findById(id: string): T | null {
    const item = this.store.get(id);
    return item ? { ...item } : null;
  }

  update(id: string, updates: Partial<T>): T | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id: existing.id } as T;
    this.store.set(id, updated);
    return { ...updated };
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  findAll(): T[] {
    return Array.from(this.store.values()).map(item => ({ ...item }));
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
