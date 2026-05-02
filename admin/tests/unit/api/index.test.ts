/**
 * Admin API模块单元测试
 * 测试后台管理API调用和拦截器
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return { default: mockAxios };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
const locationMock = { href: '' };
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
});

describe('Admin API Module', () => {
  let requestInterceptor: (config: any) => any;
  let responseInterceptor: (response: any) => any;
  let responseErrorInterceptor: (error: any) => any;

  beforeEach(() => {
    vi.clearAllMocks();
    locationMock.href = '';

    // Capture interceptors
    vi.mocked(axios.create).mockReturnValue({
      interceptors: {
        request: {
          use: vi.fn((fn) => {
            requestInterceptor = fn;
          }),
        },
        response: {
          use: vi.fn((successFn, errorFn) => {
            responseInterceptor = successFn;
            responseErrorInterceptor = errorFn;
          }),
        },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('axios instance creation', () => {
    it('should create axios instance with correct config', async () => {
      // Re-import to trigger module initialization
      vi.resetModules();
      await import('../../../../admin/src/api/index');

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: '/api',
        timeout: 10000,
      });
    });
  });

  describe('request interceptor', () => {
    beforeEach(async () => {
      vi.resetModules();
      await import('../../../../admin/src/api/index');
    });

    it('should add Authorization header when token exists', () => {
      localStorageMock.getItem.mockReturnValue('test-token');

      const config = { headers: {} };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should not add Authorization header when no token', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const config = { headers: {} };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should read token from admin_token key', () => {
      localStorageMock.getItem.mockReturnValue('admin-token');

      const config = { headers: {} };
      requestInterceptor(config);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('admin_token');
    });
  });

  describe('response interceptor', () => {
    beforeEach(async () => {
      vi.resetModules();
      await import('../../../../admin/src/api/index');
    });

    it('should pass through successful responses', () => {
      const response = { data: { success: true } };
      const result = responseInterceptor(response);

      expect(result).toBe(response);
    });

    it('should handle 401 error by clearing token and redirecting', async () => {
      const error = {
        response: { status: 401 },
      };

      await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('admin_token');
      expect(locationMock.href).toBe('/login');
    });

    it('should reject other errors without redirect', async () => {
      const error = {
        response: { status: 500 },
      };

      await expect(responseErrorInterceptor(error)).rejects.toEqual(error);
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
      expect(locationMock.href).toBe('');
    });
  });
});

describe('adminApi methods', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApi = {
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };

    vi.mocked(axios.create).mockReturnValue(mockApi);
  });

  describe('authentication', () => {
    it('login should call POST /auth/admin/login', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.login('admin', 'password');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/admin/login', {
        username: 'admin',
        password: 'password',
      });
    });
  });

  describe('alumni management', () => {
    it('getAlumniList should call GET /admin/alumni with params', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.getAlumniList({ page: 1, pageSize: 10 });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/alumni', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('createAlumni should call POST /admin/alumni', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      const data = { name: '张三', graduationYear: 2020 };
      await adminApi.createAlumni(data);

      expect(mockApi.post).toHaveBeenCalledWith('/admin/alumni', data);
    });

    it('updateAlumni should call PUT /admin/alumni/:id', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      const data = { name: '张三更新' };
      await adminApi.updateAlumni('123', data);

      expect(mockApi.put).toHaveBeenCalledWith('/admin/alumni/123', data);
    });

    it('deleteAlumni should call DELETE /admin/alumni/:id', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.deleteAlumni('123');

      expect(mockApi.delete).toHaveBeenCalledWith('/admin/alumni/123');
    });

    it('importAlumni should call POST /admin/alumni/import', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      const data = [{ name: '张三' }, { name: '李四' }];
      await adminApi.importAlumni(data);

      expect(mockApi.post).toHaveBeenCalledWith('/admin/alumni/import', { data });
    });
  });

  describe('content audit', () => {
    it('getPendingMessages should call GET /admin/messages/pending', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.getPendingMessages();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/messages/pending');
    });

    it('reviewMessage should call PUT /admin/messages/:id/review', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.reviewMessage('msg-1', 'approved');

      expect(mockApi.put).toHaveBeenCalledWith('/admin/messages/msg-1/review', {
        status: 'approved',
      });
    });
  });

  describe('distinguished alumni', () => {
    it('getDistinguishedList should call GET /admin/distinguished', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.getDistinguishedList({ category: 'science' });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/distinguished', {
        params: { category: 'science' },
      });
    });

    it('createDistinguished should call POST /admin/distinguished', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      const data = { name: '杰出校友', category: 'science' };
      await adminApi.createDistinguished(data);

      expect(mockApi.post).toHaveBeenCalledWith('/admin/distinguished', data);
    });
  });

  describe('graduation photos', () => {
    it('getPhotoList should call GET /admin/photos', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.getPhotoList({ year: 2020 });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/photos', {
        params: { year: 2020 },
      });
    });

    it('updatePhotoTags should call PUT /admin/photos/:id/tags', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      const faceTags = [{ name: '张三', boundingBox: { x: 10, y: 10, width: 20, height: 20 } }];
      await adminApi.updatePhotoTags('photo-1', faceTags);

      expect(mockApi.put).toHaveBeenCalledWith('/admin/photos/photo-1/tags', { faceTags });
    });
  });

  describe('donation projects', () => {
    it('getDonationProjectList should call GET /admin/donation-projects', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.getDonationProjectList({ status: 'active' });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/donation-projects', {
        params: { status: 'active' },
      });
    });

    it('getDonationRecords should call GET /admin/donation-projects/:id/records', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.getDonationRecords('project-1');

      expect(mockApi.get).toHaveBeenCalledWith('/admin/donation-projects/project-1/records');
    });
  });

  describe('message management', () => {
    it('batchReviewMessages should call POST /admin/messages/batch-review', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.batchReviewMessages(['msg-1', 'msg-2'], 'approved');

      expect(mockApi.post).toHaveBeenCalledWith('/admin/messages/batch-review', {
        ids: ['msg-1', 'msg-2'],
        status: 'approved',
        rejectionReason: undefined,
      });
    });

    it('batchReviewMessages with rejection reason', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.batchReviewMessages(['msg-1'], 'rejected', '内容不当');

      expect(mockApi.post).toHaveBeenCalledWith('/admin/messages/batch-review', {
        ids: ['msg-1'],
        status: 'rejected',
        rejectionReason: '内容不当',
      });
    });
  });

  describe('video greetings', () => {
    it('updateVideoStatus should call PUT /admin/video-greetings/:id/status', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.updateVideoStatus('video-1', 'approved');

      expect(mockApi.put).toHaveBeenCalledWith('/admin/video-greetings/video-1/status', {
        status: 'approved',
        rejectionReason: undefined,
      });
    });

    it('setVideoFeatured should call PUT /admin/video-greetings/:id/feature', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.setVideoFeatured('video-1', true);

      expect(mockApi.put).toHaveBeenCalledWith('/admin/video-greetings/video-1/feature', {
        featured: true,
      });
    });
  });

  describe('file upload', () => {
    it('uploadFile should call POST /upload with FormData', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      const formData = new FormData();
      await adminApi.uploadFile(formData);

      expect(mockApi.post).toHaveBeenCalledWith('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    });

    it('deleteUploadedFile should call DELETE /upload with url', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.deleteUploadedFile('/uploads/test.jpg');

      expect(mockApi.delete).toHaveBeenCalledWith('/upload', {
        data: { url: '/uploads/test.jpg' },
      });
    });
  });

  describe('class roster management', () => {
    it('linkClassPhoto should call POST /admin/class-rosters/:classId/photos/:photoId', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.linkClassPhoto('class-1', 'photo-1');

      expect(mockApi.post).toHaveBeenCalledWith('/admin/class-rosters/class-1/photos/photo-1');
    });

    it('importClassStudents should call POST with students array', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      const students = [{ name: '学生1' }, { name: '学生2' }];
      await adminApi.importClassStudents('class-1', students);

      expect(mockApi.post).toHaveBeenCalledWith('/admin/class-rosters/class-1/students/import', {
        students,
      });
    });
  });

  describe('interaction stats', () => {
    it('getInteractionStats should call GET /admin/interaction-stats', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.getInteractionStats();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/interaction-stats');
    });

    it('getInteractionTrends should call GET with date params', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.getInteractionTrends({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        granularity: 'month',
      });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/interaction-stats/trends', {
        params: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          granularity: 'month',
        },
      });
    });

    it('exportInteractionData should call GET with blob response type', async () => {
      vi.resetModules();
      const { adminApi } = await import('../../../../admin/src/api/index');

      await adminApi.exportInteractionData('messages', '2024-01-01', '2024-12-31');

      expect(mockApi.get).toHaveBeenCalledWith('/admin/interaction-export', {
        params: { type: 'messages', startDate: '2024-01-01', endDate: '2024-12-31' },
        responseType: 'blob',
      });
    });
  });
});
