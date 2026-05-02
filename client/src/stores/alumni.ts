import { defineStore } from 'pinia';
import { ref } from 'vue';
import { alumniApi } from '@/api';

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
  status: string;
}

export interface SearchResult {
  items: Alumni[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FilterOptions {
  industries: string[];
  classes: string[];
  yearRange: { min: number; max: number };
}

export const useAlumniStore = defineStore('alumni', () => {
  const searchResults = ref<SearchResult | null>(null);
  const currentAlumni = ref<Alumni | null>(null);
  const recommendations = ref<Alumni[]>([]);
  const filterOptions = ref<FilterOptions | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function search(params: Record<string, any>) {
    loading.value = true;
    error.value = null;
    try {
      const res = await alumniApi.search(params);
      if (res.data.success) {
        searchResults.value = res.data.data;
      }
    } catch (e: any) {
      error.value = e.message || '搜索失败';
    } finally {
      loading.value = false;
    }
  }

  async function getDetail(id: string) {
    loading.value = true;
    error.value = null;
    try {
      const res = await alumniApi.getDetail(id);
      if (res.data.success) {
        currentAlumni.value = res.data.data;
      }
    } catch (e: any) {
      error.value = e.message || '获取详情失败';
    } finally {
      loading.value = false;
    }
  }

  async function getRecommendations(id: string) {
    try {
      const res = await alumniApi.getRecommendations(id);
      if (res.data.success) {
        recommendations.value = res.data.data;
      }
    } catch (e) {
      console.error('获取推荐失败:', e);
    }
  }

  async function loadFilterOptions() {
    try {
      const res = await alumniApi.getFilterOptions();
      if (res.data.success) {
        filterOptions.value = res.data.data;
      }
    } catch (e) {
      console.error('获取筛选选项失败:', e);
    }
  }

  return {
    searchResults,
    currentAlumni,
    recommendations,
    filterOptions,
    loading,
    error,
    search,
    getDetail,
    getRecommendations,
    loadFilterOptions,
  };
});
