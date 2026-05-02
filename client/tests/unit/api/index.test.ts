/**
 * API模块单元测试
 * 测试API请求构建和错误处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

describe('API Module', () => {
  let mockAxiosInstance: any;
  let requestInterceptor: any;
  let responseInterceptor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock axios instance
    mockAxiosInstance = {
      get: vi.fn().mockResolvedValue({ data: { success: true } }),
      post: vi.fn().mockResolvedValue({ data: { success: true } }),
      put: vi.fn().mockResolvedValue({ data: { success: true } }),
      delete: vi.fn().mockResolvedValue({ data: { success: true } }),
      interceptors: {
        request: { 
          use: vi.fn((fn) => { requestInterceptor = fn; }) 
        },
        response: { 
          use: vi.fn((successFn, errorFn) => { 
            responseInterceptor = { success: successFn, error: errorFn }; 
          }) 
        },
      },
    };
    
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);
  });

  describe('axios instance creation', () => {
    it('should create axios instance with correct config', async () => {
      // Re-import to trigger axios.create
      vi.resetModules();
      await import('@/api');
      
      expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: '/xyl/api',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      }));
    });
  });

  describe('request interceptor', () => {
    it('should add Authorization header when token exists', async () => {
      vi.resetModules();
      
      // Mock localStorage
      const mockToken = 'test-token-123';
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(mockToken);
      
      await import('@/api');
      
      // Get the request interceptor
      const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      const interceptorFn = interceptorCall[0];
      
      const config = { headers: {} };
      const result = interceptorFn(config);
      
      expect(result.headers.Authorization).toBe(`Bearer ${mockToken}`);
    });

    it('should not add Authorization header when no token', async () => {
      vi.resetModules();
      
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
      
      await import('@/api');
      
      const interceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0];
      const interceptorFn = interceptorCall[0];
      
      const config = { headers: {} };
      const result = interceptorFn(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor', () => {
    it('should pass through successful responses', async () => {
      vi.resetModules();
      await import('@/api');
      
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const successFn = interceptorCall[0];
      
      const response = { data: { success: true, data: {} } };
      const result = successFn(response);
      
      expect(result).toBe(response);
    });

    it('should remove token on 401 error', async () => {
      vi.resetModules();
      
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
      
      await import('@/api');
      
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const errorFn = interceptorCall[1];
      
      const error = { response: { status: 401 } };
      
      await expect(errorFn(error)).rejects.toEqual(error);
      expect(removeItemSpy).toHaveBeenCalledWith('token');
    });

    it('should not remove token on other errors', async () => {
      vi.resetModules();
      
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
      
      await import('@/api');
      
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      const errorFn = interceptorCall[1];
      
      const error = { response: { status: 500 } };
      
      await expect(errorFn(error)).rejects.toEqual(error);
      expect(removeItemSpy).not.toHaveBeenCalled();
    });
  });
});

describe('alumniApi', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAxiosInstance = {
      get: vi.fn().mockResolvedValue({ data: { success: true } }),
      post: vi.fn().mockResolvedValue({ data: { success: true } }),
      put: vi.fn().mockResolvedValue({ data: { success: true } }),
      delete: vi.fn().mockResolvedValue({ data: { success: true } }),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);
  });

  it('should call search endpoint with params', async () => {
    vi.resetModules();
    const { alumniApi } = await import('@/api');
    
    const params = { keyword: 'test', page: 1 };
    await alumniApi.search(params);
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/alumni/search', { params });
  });

  it('should call getDetail endpoint with id', async () => {
    vi.resetModules();
    const { alumniApi } = await import('@/api');
    
    await alumniApi.getDetail('123');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/alumni/123');
  });

  it('should call getRecommendations endpoint', async () => {
    vi.resetModules();
    const { alumniApi } = await import('@/api');
    
    await alumniApi.getRecommendations('123');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/alumni/123/recommendations');
  });

  it('should call getClassmates endpoint', async () => {
    vi.resetModules();
    const { alumniApi } = await import('@/api');
    
    await alumniApi.getClassmates('123');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/alumni/123/classmates');
  });

  it('should call ragQuery endpoint', async () => {
    vi.resetModules();
    const { alumniApi } = await import('@/api');
    
    await alumniApi.ragQuery('test query');
    
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/alumni/rag-query', { query: 'test query' });
  });

  it('should call getFilterOptions endpoint', async () => {
    vi.resetModules();
    const { alumniApi } = await import('@/api');
    
    await alumniApi.getFilterOptions();
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/alumni/filters');
  });
});

describe('contentApi', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAxiosInstance = {
      get: vi.fn().mockResolvedValue({ data: { success: true } }),
      post: vi.fn().mockResolvedValue({ data: { success: true } }),
      put: vi.fn().mockResolvedValue({ data: { success: true } }),
      delete: vi.fn().mockResolvedValue({ data: { success: true } }),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance);
  });

  it('should call getMessages endpoint', async () => {
    vi.resetModules();
    const { contentApi } = await import('@/api');
    
    const params = { category: 'school', page: 1 };
    await contentApi.getMessages(params);
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/content/messages', { params });
  });

  it('should call createMessage endpoint', async () => {
    vi.resetModules();
    const { contentApi } = await import('@/api');
    
    const data = { content: 'Test message', category: 'school' };
    await contentApi.createMessage(data);
    
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/content/messages', data);
  });

  it('should call getVideoGreetings endpoint', async () => {
    vi.resetModules();
    const { contentApi } = await import('@/api');
    
    await contentApi.getVideoGreetings({ page: 1 });
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/content/video-greetings', { params: { page: 1 } });
  });

  it('should call getVintageItems endpoint', async () => {
    vi.resetModules();
    const { contentApi } = await import('@/api');
    
    const params = { itemType: 'photo', era: '1990s' };
    await contentApi.getVintageItems(params);
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/content/vintage-items', { params });
  });

  it('should call getClassRosters endpoint', async () => {
    vi.resetModules();
    const { contentApi } = await import('@/api');
    
    const params = { graduationYear: 2020 };
    await contentApi.getClassRosters(params);
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/content/class-rosters', { params });
  });
});
