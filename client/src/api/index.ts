import axios from 'axios';

// 开发和生产环境都使用 /xyl/api 路径
const API_BASE = '/xyl/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // 可以在这里触发重新登录
    }
    return Promise.reject(error);
  }
);

export default api;

// 校友相关API
export const alumniApi = {
  search: (params: Record<string, any>) => api.get('/alumni/search', { params }),
  getDetail: (id: string) => api.get(`/alumni/${id}`),
  getRecommendations: (id: string) => api.get(`/alumni/${id}/recommendations`),
  getClassmates: (id: string) => api.get(`/alumni/${id}/classmates`),
  ragQuery: (query: string) => api.post('/alumni/rag-query', { query }),
  getFilterOptions: () => api.get('/alumni/filters'),
};

// 内容相关API
export const contentApi = {
  // 留言板
  getMessages: (params?: { category?: string; page?: number; pageSize?: number }) => 
    api.get('/content/messages', { params }),
  getMessageStats: () => api.get('/content/messages/stats'),
  createMessage: (data: { content: string; category?: string; handwritingImageUrl?: string }) => 
    api.post('/content/messages', data),
  
  // 寻人启事
  getSearchNotices: (params?: { keyword?: string; page?: number; pageSize?: number }) => 
    api.get('/content/search-notices', { params }),
  createSearchNotice: (data: Record<string, any>) => api.post('/content/search-notices', data),
  updateSearchNoticeStatus: (id: string, data: { status: string; reunionStory?: string }) => 
    api.put(`/content/search-notices/${id}/status`, data),
  
  // 视频寄语
  getVideoGreetings: (params?: { page?: number; pageSize?: number }) => 
    api.get('/content/video-greetings', { params }),
  getFeaturedVideos: (limit?: number) => 
    api.get('/content/video-greetings/featured', { params: { limit } }),
  getVideoById: (id: string) => api.get(`/content/video-greetings/${id}`),
  createVideoGreeting: (data: Record<string, any>) => api.post('/content/video-greetings', data),
  incrementVideoView: (id: string) => api.put(`/content/video-greetings/${id}/view`),
  getDistinguished: () => api.get('/content/distinguished'),
  getAlumniNews: () => api.get('/content/alumni-news'),
  getGraduationPhotos: (params?: { year?: number; className?: string }) => 
    api.get('/content/graduation-photos', { params }),
  getDonationLeaderboard: () => api.get('/content/donations/leaderboard'),
  createDonation: (data: Record<string, any>) => api.post('/content/donations', data),
  
  // 老物件数字馆
  getVintageItems: (params?: { itemType?: string; era?: string; keyword?: string; page?: number; pageSize?: number }) => 
    api.get('/content/vintage-items', { params }),
  getVintageItemById: (id: string) => api.get(`/content/vintage-items/${id}`),
  getVintageItemOptions: () => api.get('/content/vintage-items-options'),
  
  // 班级名录墙
  getClassRosters: (params?: { graduationYear?: number; keyword?: string; page?: number; pageSize?: number }) => 
    api.get('/content/class-rosters', { params }),
  getClassRosterById: (id: string) => api.get(`/content/class-rosters/${id}`),
  getClassRosterOptions: () => api.get('/content/class-rosters-options'),
  
  // 时空长廊统一搜索
  searchTimeCorridor: (params: { keyword: string; type?: 'photos' | 'vintageItems' | 'classRosters'; limit?: number }) => 
    api.get('/content/time-corridor/search', { params }),
  
  // 校友会服务区
  getAssociations: (params?: { city?: string; keyword?: string; page?: number; pageSize?: number }) => 
    api.get('/content/associations', { params }),
  getDonationProjects: (params?: { status?: string; page?: number; pageSize?: number }) => 
    api.get('/content/donation-projects', { params }),
  
  // 状元榜
  getTopScholars: () => api.get('/content/top-scholars'),
  getTopScholarById: (id: string) => api.get(`/content/top-scholars/${id}`),
};
