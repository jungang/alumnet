import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api';

export type UserRole = 'guest' | 'verified_alumni' | 'admin';

interface UserSession {
  role: UserRole;
  alumniId?: string;
  className?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const session = ref<UserSession | null>(null);

  const isAuthenticated = computed(() => !!token.value && session.value?.role !== 'guest');
  const isVerifiedAlumni = computed(() => session.value?.role === 'verified_alumni');
  const isAdmin = computed(() => session.value?.role === 'admin');
  const userRole = computed(() => session.value?.role || 'guest');

  async function initGuestSession() {
    try {
      const res = await api.get('/auth/guest');
      if (res.data.success) {
        token.value = res.data.data.token;
        session.value = res.data.data.session;
        localStorage.setItem('token', token.value!);
      }
    } catch (error) {
      console.error('初始化Guest会话失败:', error);
    }
  }

  async function verifyByStudentId(studentId: string, name: string) {
    const res = await api.post('/auth/verify/student', { studentId, name });
    if (res.data.success) {
      token.value = res.data.data.token;
      session.value = res.data.data.session;
      localStorage.setItem('token', token.value!);
      return true;
    }
    return false;
  }

  async function verifyByPhone(phone: string, otp: string) {
    const res = await api.post('/auth/verify/phone', { phone, otp });
    if (res.data.success) {
      token.value = res.data.data.token;
      session.value = res.data.data.session;
      localStorage.setItem('token', token.value!);
      return true;
    }
    return false;
  }

  function logout() {
    token.value = null;
    session.value = null;
    localStorage.removeItem('token');
    initGuestSession();
  }

  // 初始化
  if (!token.value) {
    initGuestSession();
  }

  return {
    token,
    session,
    isAuthenticated,
    isVerifiedAlumni,
    isAdmin,
    userRole,
    initGuestSession,
    verifyByStudentId,
    verifyByPhone,
    logout,
  };
});
