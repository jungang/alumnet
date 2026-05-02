/**
 * 前端测试数据生成器
 * 使用 fast-check 生成随机测试数据
 */

import * as fc from 'fast-check';

// ============================================
// 校友数据生成器
// ============================================

export interface Alumni {
  id: string;
  name: string;
  studentId?: string;
  graduationYear: number;
  className: string;
  department?: string;
  industry?: string;
  currentCity?: string;
  workUnit?: string;
  phone?: string;
  email?: string;
  status: string;
}

export const industryArbitrary = fc.constantFrom(
  '政界', '商界', '学术', '艺术', '医疗', '教育', '科技'
);

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
  phone: fc.option(fc.string({ minLength: 11, maxLength: 11 })),
  email: fc.option(fc.emailAddress()),
  status: fc.constantFrom('active', 'lost_contact', 'deceased'),
});

// ============================================
// 搜索结果生成器
// ============================================

export interface SearchResult {
  items: Alumni[];
  total: number;
  page: number;
  pageSize: number;
}

export const searchResultArbitrary: fc.Arbitrary<SearchResult> = fc
  .array(alumniArbitrary, { minLength: 0, maxLength: 20 })
  .chain(items => fc.record({
    items: fc.constant(items),
    total: fc.integer({ min: items.length, max: items.length + 100 }),
    page: fc.integer({ min: 1, max: 10 }),
    pageSize: fc.constantFrom(10, 20, 50),
  }));

// ============================================
// 筛选选项生成器
// ============================================

export interface FilterOptions {
  industries: string[];
  classes: string[];
  yearRange: { min: number; max: number };
}

export const filterOptionsArbitrary: fc.Arbitrary<FilterOptions> = fc.record({
  industries: fc.array(industryArbitrary, { minLength: 1, maxLength: 7 }),
  classes: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
  yearRange: fc.record({
    min: fc.integer({ min: 1950, max: 2000 }),
    max: fc.integer({ min: 2000, max: 2024 }),
  }),
});

// ============================================
// API响应生成器
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export function apiResponseArbitrary<T>(dataArbitrary: fc.Arbitrary<T>): fc.Arbitrary<ApiResponse<T>> {
  return fc.oneof(
    // 成功响应
    dataArbitrary.map(data => ({ success: true, data })),
    // 失败响应
    fc.string({ minLength: 1, maxLength: 100 }).map(message => ({ success: false, message }))
  );
}

// ============================================
// 屏幕尺寸生成器
// ============================================

export interface ScreenDimensions {
  width: number;
  height: number;
}

export const screenDimensionsArbitrary: fc.Arbitrary<ScreenDimensions> = fc.record({
  width: fc.integer({ min: 320, max: 2560 }),
  height: fc.integer({ min: 320, max: 2560 }),
});

export const portraitDimensionsArbitrary: fc.Arbitrary<ScreenDimensions> = fc
  .integer({ min: 320, max: 1080 })
  .chain(width => fc.record({
    width: fc.constant(width),
    height: fc.integer({ min: width + 1, max: 2560 }),
  }));

export const landscapeDimensionsArbitrary: fc.Arbitrary<ScreenDimensions> = fc
  .integer({ min: 480, max: 2560 })
  .chain(width => fc.record({
    width: fc.constant(width),
    height: fc.integer({ min: 320, max: width }),
  }));

// ============================================
// 留言数据生成器
// ============================================

export interface Message {
  id: string;
  content: string;
  authorName?: string;
  authorClass?: string;
  category: string;
  status: string;
  createdAt: string;
}

export const messageArbitrary: fc.Arbitrary<Message> = fc.record({
  id: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  authorName: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  authorClass: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  category: fc.constantFrom('school', 'teacher', 'classmate'),
  status: fc.constantFrom('pending', 'approved', 'rejected'),
  createdAt: fc.date().map(d => d.toISOString()),
});

// ============================================
// 视频祝福数据生成器
// ============================================

export interface VideoGreeting {
  id: string;
  title: string;
  alumniName: string;
  videoUrl: string;
  thumbnailUrl?: string;
  viewCount: number;
  status: string;
}

export const videoGreetingArbitrary: fc.Arbitrary<VideoGreeting> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  alumniName: fc.string({ minLength: 1, maxLength: 50 }),
  videoUrl: fc.webUrl(),
  thumbnailUrl: fc.option(fc.webUrl()),
  viewCount: fc.integer({ min: 0, max: 100000 }),
  status: fc.constantFrom('pending', 'approved', 'rejected', 'featured'),
});
