<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { computed, watch } from 'vue';
import { useNavigationStore, MODULES } from '@/stores/navigation';

const router = useRouter();
const route = useRoute();
const navigationStore = useNavigationStore();

// 当前激活的模块
const activeModule = computed(() => {
  const path = route.path;
  const module = MODULES.find(m => path.startsWith(m.path));
  return module?.name || '';
});

// 监听路由变化更新store
watch(() => route.path, (newPath) => {
  navigationStore.initFromRoute(newPath);
}, { immediate: true });

function handleNavigate(moduleName: string) {
  if (moduleName === activeModule.value) return;
  navigationStore.navigateTo(moduleName, router);
}

function goHome() {
  navigationStore.navigateToHome(router, true);
}


</script>

<template>
  <nav 
    class="bottom-navigation fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t transition-all duration-300"
    :class="[
      'bg-[var(--bg-secondary)]/90 border-[var(--border-color)]'
    ]"
  >
    <div class="flex items-center justify-around h-16 portrait:h-14 px-2 max-w-4xl mx-auto">
      <!-- 首页按钮 -->
      <button
        @click="goHome"
        class="nav-item group flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 touch-target"
        :class="[
          route.path === '/' 
            ? 'text-[var(--color-teal)] bg-[var(--color-teal)]/10' 
            : 'text-[var(--text-muted)] hover:text-[var(--color-teal)] hover:bg-[var(--color-teal)]/5'
        ]"
        title="首页"
      >
        <svg class="w-6 h-6 portrait:w-5 portrait:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span class="text-[10px] portrait:text-[8px] mt-1 font-medium">首页</span>
      </button>

      <!-- 分隔线 -->
      <div class="w-px h-8 bg-[var(--border-color)]"></div>

      <!-- 模块按钮 -->
      <button
        v-for="module in MODULES"
        :key="module.name"
        @click="handleNavigate(module.name)"
        class="nav-item group flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 touch-target"
        :class="[
          activeModule === module.name 
            ? 'text-[var(--color-teal)] bg-[var(--color-teal)]/10' 
            : 'text-[var(--text-muted)] hover:text-[var(--color-teal)] hover:bg-[var(--color-teal)]/5'
        ]"
        :title="module.label"
      >
        <!-- 搜索图标 -->
        <svg v-if="module.icon === 'search'" class="w-6 h-6 portrait:w-5 portrait:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        
        <!-- 星星图标 -->
        <svg v-else-if="module.icon === 'star'" class="w-6 h-6 portrait:w-5 portrait:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        
        <!-- 相机图标 -->
        <svg v-else-if="module.icon === 'camera'" class="w-6 h-6 portrait:w-5 portrait:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        
        <!-- 聊天图标 -->
        <svg v-else-if="module.icon === 'chat'" class="w-6 h-6 portrait:w-5 portrait:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        
        <!-- 握手图标 -->
        <svg v-else-if="module.icon === 'handshake'" class="w-6 h-6 portrait:w-5 portrait:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11" />
        </svg>
        
        <span class="text-[10px] portrait:text-[8px] mt-1 font-medium truncate max-w-[48px]">{{ module.label }}</span>
      </button>
    </div>
    
    <!-- 底部安全区域 -->
    <div class="h-safe-area-inset-bottom bg-[var(--bg-secondary)]/90"></div>
  </nav>
</template>

<style scoped>
.bottom-navigation {
  /* iOS安全区域适配 */
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.nav-item {
  min-width: var(--touch-target-size, 44px);
  min-height: var(--touch-target-size, 44px);
}

/* 激活状态动画 */
.nav-item.active {
  animation: navPulse 0.3s ease-out;
}

@keyframes navPulse {
  0% { transform: scale(0.95); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* 竖屏模式下更紧凑 */
@media (orientation: portrait) {
  .nav-item {
    padding: 0.375rem 0.5rem;
  }
}
</style>
