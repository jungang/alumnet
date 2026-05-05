import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

export type TransitionDirection = 'left' | 'right' | 'none';

export interface ModuleItem {
  name: string;
  path: string;
  icon: string;
  label: string;
  labelEn: string;
}

// 模块顺序定义（用于计算过渡方向）
export const MODULES: ModuleItem[] = [
  { name: 'search', path: '/search', icon: 'search', label: '智能查询', labelEn: 'Search' },
  { name: 'galaxy', path: '/galaxy', icon: 'star', label: '校友风采', labelEn: 'Alumni' },
  { name: 'corridor', path: '/corridor', icon: 'camera', label: '时空长廊', labelEn: 'Corridor' },
  { name: 'interaction', path: '/interaction', icon: 'chat', label: '互动寄语', labelEn: 'Message' },
  { name: 'service', path: '/service', icon: 'handshake', label: '校友服务', labelEn: 'Service' },
];

export const useNavigationStore = defineStore('navigation', () => {
  // State
  const currentModule = ref<string>('');
  const previousModule = ref<string | null>(null);
  const transitionDirection = ref<TransitionDirection>('none');
  const returnToModule = ref<string | null>(null); // 详情页返回目标
  const returnToPath = ref<string | null>(null);   // 详情页返回路径

  // Getters
  const moduleIndex = computed(() => {
    return MODULES.findIndex(m => m.name === currentModule.value);
  });

  const currentModuleInfo = computed(() => {
    return MODULES.find(m => m.name === currentModule.value) || null;
  });

  // Actions
  function setCurrentModule(moduleName: string) {
    if (moduleName !== currentModule.value) {
      previousModule.value = currentModule.value;
      currentModule.value = moduleName;
      updateTransitionDirection();
    }
  }

  function updateTransitionDirection() {
    if (!previousModule.value || !currentModule.value) {
      transitionDirection.value = 'none';
      return;
    }

    const prevIndex = MODULES.findIndex(m => m.name === previousModule.value);
    const currIndex = MODULES.findIndex(m => m.name === currentModule.value);

    if (prevIndex === -1 || currIndex === -1) {
      transitionDirection.value = 'none';
    } else if (currIndex > prevIndex) {
      transitionDirection.value = 'left'; // 向左滑动（下一个模块）
    } else {
      transitionDirection.value = 'right'; // 向右滑动（上一个模块）
    }
  }

  function setTransitionDirection(from: string, to: string): TransitionDirection {
    const fromIndex = MODULES.findIndex(m => m.name === from);
    const toIndex = MODULES.findIndex(m => m.name === to);

    if (fromIndex === -1 || toIndex === -1) {
      return 'none';
    }

    return toIndex > fromIndex ? 'left' : 'right';
  }

  function navigateTo(moduleName: string, router?: ReturnType<typeof useRouter>) {
    const module = MODULES.find(m => m.name === moduleName);
    if (!module) return;

    // 更新状态
    setCurrentModule(moduleName);

    // 如果提供了router，执行导航
    if (router) {
      router.push(module.path);
    }
  }

  function navigateToHome(router?: ReturnType<typeof useRouter>, skipScreensaver = true) {
    previousModule.value = currentModule.value;
    currentModule.value = '';
    transitionDirection.value = 'none';

    if (router) {
      // 使用query参数告诉HomeView跳过屏保
      router.push({ path: '/', query: skipScreensaver ? { skipScreensaver: 'true' } : {} });
    }
  }

  // 记录来源模块，进入详情页前调用
  function enterDetail(fromModule: string, fromPath: string) {
    returnToModule.value = fromModule;
    returnToPath.value = fromPath;
  }

  // 从详情页返回来源模块
  function returnFromDetail(router?: ReturnType<typeof useRouter>) {
    const targetPath = returnToPath.value || '/';
    const targetModule = returnToModule.value || '';
    returnToModule.value = null;
    returnToPath.value = null;

    if (targetModule) {
      currentModule.value = targetModule;
    }

    if (router) {
      router.push(targetPath);
    }
  }

  function getModuleByPath(path: string): ModuleItem | null {
    // 处理带参数的路径
    const basePath = path.split('?')[0];
    return MODULES.find(m => m.path === basePath) || null;
  }

  function initFromRoute(path: string) {
    const module = getModuleByPath(path);
    if (module) {
      currentModule.value = module.name;
    } else {
      currentModule.value = '';
    }
    previousModule.value = null;
    transitionDirection.value = 'none';
  }

  return {
    // State
    currentModule,
    previousModule,
    transitionDirection,
    returnToModule,
    returnToPath,
    // Getters
    moduleIndex,
    currentModuleInfo,
    // Actions
    setCurrentModule,
    setTransitionDirection,
    navigateTo,
    navigateToHome,
    enterDetail,
    returnFromDetail,
    getModuleByPath,
    initFromRoute,
    // Constants
    MODULES,
  };
});
