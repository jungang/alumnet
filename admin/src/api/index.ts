import axios from 'axios';

// 开发和生产环境都使用 /xyl/api 路径
const API_BASE = '/xyl/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('admin_token');
      // 提示用户并跳转
      if (typeof window !== 'undefined') {
        alert('登录已过期或权限不足，请重新登录');
        window.location.href = '/xyl/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const adminApi = {
  login: (username: string, password: string) => 
    api.post('/auth/admin/login', { username, password }),
  
  // 校友管理
  getAlumniList: (params: Record<string, any>) => api.get('/admin/alumni', { params }),
  createAlumni: (data: Record<string, any>) => api.post('/admin/alumni', data),
  updateAlumni: (id: string, data: Record<string, any>) => api.put(`/admin/alumni/${id}`, data),
  deleteAlumni: (id: string) => api.delete(`/admin/alumni/${id}`),
  importAlumni: (data: any[]) => api.post('/admin/alumni/import', { data }),
  
  // 内容审核
  getPendingMessages: () => api.get('/admin/messages/pending'),
  reviewMessage: (id: string, status: 'approved' | 'rejected') => 
    api.put(`/admin/messages/${id}/review`, { status }),
  
  // 系统日志
  getLogs: (params: Record<string, any>) => api.get('/admin/logs', { params }),
  
  // 杰出校友管理
  getDistinguishedList: (params: Record<string, any>) => api.get('/admin/distinguished', { params }),
  getDistinguishedById: (id: string) => api.get(`/admin/distinguished/${id}`),
  getDistinguishedCategories: () => api.get('/admin/distinguished-categories'),
  createDistinguished: (data: Record<string, any>) => api.post('/admin/distinguished', data),
  updateDistinguished: (id: string, data: Record<string, any>) => api.put(`/admin/distinguished/${id}`, data),
  deleteDistinguished: (id: string) => api.delete(`/admin/distinguished/${id}`),
  
  // 毕业照管理
  getPhotoList: (params: Record<string, any>) => api.get('/admin/photos', { params }),
  getPhotoById: (id: string) => api.get(`/admin/photos/${id}`),
  getPhotoOptions: () => api.get('/admin/photos/options'),
  createPhoto: (data: Record<string, any>) => api.post('/admin/photos', data),
  updatePhoto: (id: string, data: Record<string, any>) => api.put(`/admin/photos/${id}`, data),
  updatePhotoTags: (id: string, faceTags: any[]) => api.put(`/admin/photos/${id}/tags`, { faceTags }),
  deletePhoto: (id: string) => api.delete(`/admin/photos/${id}`),
  
  // 寻人启事管理
  getNoticeList: (params: Record<string, any>) => api.get('/admin/notices', { params }),
  updateNoticeStatus: (id: string, status: string) => api.put(`/admin/notices/${id}/status`, { status }),
  deleteNotice: (id: string) => api.delete(`/admin/notices/${id}`),
  
  // 捐赠项目管理
  getDonationProjectList: (params: Record<string, any>) => api.get('/admin/donation-projects', { params }),
  getDonationProjectById: (id: string) => api.get(`/admin/donation-projects/${id}`),
  getDonationRecords: (id: string) => api.get(`/admin/donation-projects/${id}/records`),
  createDonationProject: (data: Record<string, any>) => api.post('/admin/donation-projects', data),
  updateDonationProject: (id: string, data: Record<string, any>) => api.put(`/admin/donation-projects/${id}`, data),
  deleteDonationProject: (id: string) => api.delete(`/admin/donation-projects/${id}`),
  
  // 校友会管理
  getAssociationList: (params: Record<string, any>) => api.get('/admin/associations', { params }),
  createAssociation: (data: Record<string, any>) => api.post('/admin/associations', data),
  updateAssociation: (id: string, data: Record<string, any>) => api.put(`/admin/associations/${id}`, data),
  deleteAssociation: (id: string) => api.delete(`/admin/associations/${id}`),
  
  // 校友动态管理
  getNewsList: (params: Record<string, any>) => api.get('/admin/news', { params }),
  createNews: (data: Record<string, any>) => api.post('/admin/news', data),
  updateNews: (id: string, data: Record<string, any>) => api.put(`/admin/news/${id}`, data),
  deleteNews: (id: string) => api.delete(`/admin/news/${id}`),
  
  // 留言管理（增强）
  getMessageList: (params: Record<string, any>) => api.get('/admin/messages', { params }),
  getMessageById: (id: string) => api.get(`/admin/messages/${id}`),
  updateMessageStatus: (id: string, status: string, rejectionReason?: string) => 
    api.put(`/admin/messages/${id}/status`, { status, rejectionReason }),
  batchReviewMessages: (ids: string[], status: string, rejectionReason?: string) => 
    api.post('/admin/messages/batch-review', { ids, status, rejectionReason }),
  deleteMessage: (id: string) => api.delete(`/admin/messages/${id}`),
  
  // 校友照片管理
  uploadAlumniPhoto: (id: string, photoUrl: string) => api.post(`/admin/alumni/${id}/photo`, { photoUrl }),
  deleteAlumniPhoto: (id: string) => api.delete(`/admin/alumni/${id}/photo`),
  
  // 系统配置
  getSystemConfig: () => api.get('/admin/config'),
  updateSystemConfig: (configs: Record<string, any>) => api.put('/admin/config', configs),
  
  // 数据统计
  getStatsOverview: () => api.get('/admin/stats/overview'),
  getStatsTrends: () => api.get('/admin/stats/trends'),
  
  // 老物件管理
  getVintageItemList: (params: Record<string, any>) => api.get('/admin/vintage-items', { params }),
  getVintageItemById: (id: string) => api.get(`/admin/vintage-items/${id}`),
  getVintageItemOptions: () => api.get('/admin/vintage-items/options'),
  createVintageItem: (data: Record<string, any>) => api.post('/admin/vintage-items', data),
  updateVintageItem: (id: string, data: Record<string, any>) => api.put(`/admin/vintage-items/${id}`, data),
  deleteVintageItem: (id: string) => api.delete(`/admin/vintage-items/${id}`),
  
  // 班级名录管理
  getClassRosterList: (params: Record<string, any>) => api.get('/admin/class-rosters', { params }),
  getClassRosterById: (id: string) => api.get(`/admin/class-rosters/${id}`),
  getClassRosterOptions: () => api.get('/admin/class-rosters/options'),
  createClassRoster: (data: Record<string, any>) => api.post('/admin/class-rosters', data),
  updateClassRoster: (id: string, data: Record<string, any>) => api.put(`/admin/class-rosters/${id}`, data),
  deleteClassRoster: (id: string) => api.delete(`/admin/class-rosters/${id}`),
  linkClassPhoto: (classId: string, photoId: string) => api.post(`/admin/class-rosters/${classId}/photos/${photoId}`),
  unlinkClassPhoto: (classId: string, photoId: string) => api.delete(`/admin/class-rosters/${classId}/photos/${photoId}`),
  addClassStudent: (classId: string, data: Record<string, any>) => api.post(`/admin/class-rosters/${classId}/students`, data),
  updateClassStudent: (classId: string, studentId: string, data: Record<string, any>) => api.put(`/admin/class-rosters/${classId}/students/${studentId}`, data),
  removeClassStudent: (classId: string, studentId: string) => api.delete(`/admin/class-rosters/${classId}/students/${studentId}`),
  importClassStudents: (classId: string, students: any[]) => api.post(`/admin/class-rosters/${classId}/students/import`, { students }),
  
  // 时空长廊统计
  getTimeCorridorStats: () => api.get('/admin/stats/time-corridor'),
  getPhotosByYear: () => api.get('/admin/stats/photos-by-year'),
  getItemsByType: () => api.get('/admin/stats/items-by-type'),
  
  // 视频寄语管理
  getVideoGreetingList: (params: Record<string, any>) => api.get('/admin/video-greetings', { params }),
  getVideoGreetingById: (id: string) => api.get(`/admin/video-greetings/${id}`),
  updateVideoStatus: (id: string, status: string, rejectionReason?: string) => 
    api.put(`/admin/video-greetings/${id}/status`, { status, rejectionReason }),
  setVideoFeatured: (id: string, featured: boolean) => 
    api.put(`/admin/video-greetings/${id}/feature`, { featured }),
  deleteVideoGreeting: (id: string) => api.delete(`/admin/video-greetings/${id}`),
  
  // 互动统计
  getInteractionStats: () => api.get('/admin/interaction-stats'),
  getInteractionTrends: (params?: { startDate?: string; endDate?: string; granularity?: string }) => 
    api.get('/admin/interaction-stats/trends', { params }),
  exportInteractionData: (type: string, startDate: string, endDate: string) => 
    api.get('/admin/interaction-export', { 
      params: { type, startDate, endDate },
      responseType: 'blob',
    }),
  
  // 文件上传
  uploadFile: (formData: FormData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadMultipleFiles: (formData: FormData) => api.post('/upload/multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadPhoto: (formData: FormData) => api.post('/upload/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadVintageImages: (formData: FormData) => api.post('/upload/vintage', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteUploadedFile: (url: string) => api.delete('/upload', { data: { url } }),
  
  // 状元榜管理
  getTopScholarList: (params: Record<string, any>) => api.get('/admin/top-scholars', { params }),
  getTopScholarById: (id: string) => api.get(`/admin/top-scholars/${id}`),
  createTopScholar: (data: Record<string, any>) => api.post('/admin/top-scholars', data),
  updateTopScholar: (id: string, data: Record<string, any>) => api.put(`/admin/top-scholars/${id}`, data),
  deleteTopScholar: (id: string) => api.delete(`/admin/top-scholars/${id}`),
};
