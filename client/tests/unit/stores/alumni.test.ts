/**
 * alumniStore 单元测试
 * 测试校友数据状态管理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAlumniStore } from '@/stores/alumni';

// Mock API
vi.mock('@/api', () => ({
  alumniApi: {
    search: vi.fn(),
    getDetail: vi.fn(),
    getRecommendations: vi.fn(),
    getFilterOptions: vi.fn(),
  },
}));

import { alumniApi } from '@/api';

describe('alumniStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useAlumniStore();
      
      expect(store.searchResults).toBeNull();
      expect(store.currentAlumni).toBeNull();
      expect(store.recommendations).toEqual([]);
      expect(store.filterOptions).toBeNull();
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });
  });

  describe('search', () => {
    it('should set loading state during search', async () => {
      const store = useAlumniStore();
      
      vi.mocked(alumniApi.search).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { success: true, data: { items: [], total: 0, page: 1, pageSize: 20 } }
        }), 100))
      );

      const searchPromise = store.search({ keyword: 'test' });
      
      expect(store.loading).toBe(true);
      
      await searchPromise;
      
      expect(store.loading).toBe(false);
    });

    it('should update searchResults on successful search', async () => {
      const store = useAlumniStore();
      const mockData = {
        items: [{ id: '1', name: 'Test User', graduationYear: 2020, className: 'Class A', status: 'active' }],
        total: 1,
        page: 1,
        pageSize: 20,
      };
      
      vi.mocked(alumniApi.search).mockResolvedValue({
        data: { success: true, data: mockData }
      });

      await store.search({ keyword: 'test' });
      
      expect(store.searchResults).toEqual(mockData);
      expect(store.error).toBeNull();
    });

    it('should set error on failed search', async () => {
      const store = useAlumniStore();
      
      vi.mocked(alumniApi.search).mockRejectedValue(new Error('Network error'));

      await store.search({ keyword: 'test' });
      
      expect(store.error).toBe('Network error');
    });

    it('should clear error before new search', async () => {
      const store = useAlumniStore();
      store.error = 'Previous error';
      
      vi.mocked(alumniApi.search).mockResolvedValue({
        data: { success: true, data: { items: [], total: 0, page: 1, pageSize: 20 } }
      });

      await store.search({ keyword: 'test' });
      
      expect(store.error).toBeNull();
    });
  });

  describe('getDetail', () => {
    it('should update currentAlumni on successful fetch', async () => {
      const store = useAlumniStore();
      const mockAlumni = {
        id: '1',
        name: 'Test User',
        graduationYear: 2020,
        className: 'Class A',
        status: 'active',
      };
      
      vi.mocked(alumniApi.getDetail).mockResolvedValue({
        data: { success: true, data: mockAlumni }
      });

      await store.getDetail('1');
      
      expect(store.currentAlumni).toEqual(mockAlumni);
    });

    it('should set loading state during fetch', async () => {
      const store = useAlumniStore();
      
      vi.mocked(alumniApi.getDetail).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { success: true, data: {} }
        }), 100))
      );

      const fetchPromise = store.getDetail('1');
      
      expect(store.loading).toBe(true);
      
      await fetchPromise;
      
      expect(store.loading).toBe(false);
    });

    it('should set error on failed fetch', async () => {
      const store = useAlumniStore();
      
      vi.mocked(alumniApi.getDetail).mockRejectedValue(new Error('Not found'));

      await store.getDetail('1');
      
      expect(store.error).toBe('Not found');
    });
  });

  describe('getRecommendations', () => {
    it('should update recommendations on successful fetch', async () => {
      const store = useAlumniStore();
      const mockRecommendations = [
        { id: '2', name: 'User 2', graduationYear: 2020, className: 'Class A', status: 'active' },
        { id: '3', name: 'User 3', graduationYear: 2021, className: 'Class B', status: 'active' },
      ];
      
      vi.mocked(alumniApi.getRecommendations).mockResolvedValue({
        data: { success: true, data: mockRecommendations }
      });

      await store.getRecommendations('1');
      
      expect(store.recommendations).toEqual(mockRecommendations);
    });

    it('should handle error silently', async () => {
      const store = useAlumniStore();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(alumniApi.getRecommendations).mockRejectedValue(new Error('Error'));

      await store.getRecommendations('1');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('loadFilterOptions', () => {
    it('should update filterOptions on successful fetch', async () => {
      const store = useAlumniStore();
      const mockOptions = {
        industries: ['科技', '教育'],
        classes: ['Class A', 'Class B'],
        yearRange: { min: 1990, max: 2024 },
      };
      
      vi.mocked(alumniApi.getFilterOptions).mockResolvedValue({
        data: { success: true, data: mockOptions }
      });

      await store.loadFilterOptions();
      
      expect(store.filterOptions).toEqual(mockOptions);
    });

    it('should handle error silently', async () => {
      const store = useAlumniStore();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(alumniApi.getFilterOptions).mockRejectedValue(new Error('Error'));

      await store.loadFilterOptions();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
