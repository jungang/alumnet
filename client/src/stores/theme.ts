import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'yuwen-theme-mode';

// 深色主题CSS变量 - 示例青（青色调）
const darkThemeVariables: Record<string, string> = {
  '--bg-primary': '#020608',
  '--bg-secondary': '#0f172a',
  '--bg-card': 'rgba(15, 23, 42, 0.6)',
  '--bg-overlay': 'rgba(0, 0, 0, 0.8)',
  '--text-primary': '#f8fafc',
  '--text-secondary': 'rgba(255, 255, 255, 0.7)',
  '--text-muted': 'rgba(255, 255, 255, 0.4)',
  // 示例青主色调
  '--color-accent': '#14b8a6',
  '--color-accent-light': '#5eead4',
  '--color-accent-dark': '#0d9488',
  '--color-accent-rgb': '20, 184, 166',
  '--border-color': 'rgba(20, 184, 166, 0.2)',
  '--shadow-color': 'rgba(20, 184, 166, 0.15)',
  '--scrollbar-track': 'rgba(20, 184, 166, 0.05)',
  '--scrollbar-thumb': 'rgba(20, 184, 166, 0.2)',
  '--scrollbar-thumb-hover': 'rgba(20, 184, 166, 0.4)',
  // 兼容旧变量名
  '--color-teal': '#14b8a6',
  '--color-teal-light': '#5eead4',
  '--color-teal-dark': '#0d9488',
};

// 浅色主题CSS变量 - 示例红（红木色调）
const lightThemeVariables: Record<string, string> = {
  '--bg-primary': '#faf8f5',        // 乳白色/米白色背景
  '--bg-secondary': '#f5f0ea',      // 稍深的暖白色
  '--bg-card': 'rgba(255, 252, 248, 0.9)',  // 温暖的白色卡片
  '--bg-overlay': 'rgba(250, 248, 245, 0.95)',
  '--text-primary': '#2d1810',      // 深红木色文字
  '--text-secondary': 'rgba(45, 24, 16, 0.75)',
  '--text-muted': 'rgba(45, 24, 16, 0.45)',
  // 示例红主色调 - 红木家具色
  '--color-accent': '#8b2500',      // 红木主色
  '--color-accent-light': '#a63c1c', // 浅红木
  '--color-accent-dark': '#6b1d00',  // 深红木
  '--color-accent-rgb': '139, 37, 0',
  '--border-color': 'rgba(139, 37, 0, 0.15)',
  '--shadow-color': 'rgba(139, 37, 0, 0.08)',
  '--scrollbar-track': 'rgba(139, 37, 0, 0.05)',
  '--scrollbar-thumb': 'rgba(139, 37, 0, 0.2)',
  '--scrollbar-thumb-hover': 'rgba(139, 37, 0, 0.35)',
  // 兼容旧变量名（映射到红色）
  '--color-teal': '#8b2500',
  '--color-teal-light': '#a63c1c',
  '--color-teal-dark': '#6b1d00',
};

export const useThemeStore = defineStore('theme', () => {
  // State
  const mode = ref<ThemeMode>('light');
  const isTransitioning = ref(false);

  // Getters
  const isDark = computed(() => mode.value === 'dark');
  
  const cssVariables = computed(() => {
    return mode.value === 'dark' ? darkThemeVariables : lightThemeVariables;
  });

  // Actions
  function setTheme(newMode: ThemeMode) {
    if (newMode !== 'dark' && newMode !== 'light') {
      newMode = 'light'; // fallback to light if invalid
    }
    isTransitioning.value = true;
    mode.value = newMode;
    applyTheme();
    saveToStorage();
    
    // 过渡动画结束后重置状态
    setTimeout(() => {
      isTransitioning.value = false;
    }, 300);
  }

  function toggleTheme() {
    setTheme(mode.value === 'dark' ? 'light' : 'dark');
  }

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        mode.value = stored;
      } else {
        mode.value = 'light'; // default to light theme
      }
    } catch {
      mode.value = 'light'; // fallback if localStorage unavailable
    }
    applyTheme();
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, mode.value);
    } catch {
      // ignore storage errors
    }
  }

  function applyTheme() {
    const root = document.documentElement;
    const variables = cssVariables.value;
    
    // 应用所有CSS变量到根元素
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // 添加/移除主题类
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(`theme-${mode.value}`);
  }

  // 监听主题变化自动应用
  watch(mode, () => {
    applyTheme();
  });

  return {
    // State
    mode,
    isTransitioning,
    // Getters
    isDark,
    cssVariables,
    // Actions
    setTheme,
    toggleTheme,
    loadFromStorage,
    saveToStorage,
    applyTheme,
  };
});

// 导出变量供测试使用
export { darkThemeVariables, lightThemeVariables, STORAGE_KEY };
