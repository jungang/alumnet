<script setup lang="ts">
import { useThemeStore } from '@/stores/theme';

const themeStore = useThemeStore();

function handleToggle() {
  themeStore.toggleTheme();
}
</script>

<template>
  <button
    @click="handleToggle"
    class="theme-toggle group relative w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 touch-target"
    :class="[
      themeStore.isDark 
        ? 'border-white/20 text-white/60 hover:text-teal-400 hover:border-teal-400/50 hover:bg-teal-500/10' 
        : 'border-teal-500/30 text-teal-600 hover:text-teal-500 hover:border-teal-500 hover:bg-teal-500/10'
    ]"
    :title="themeStore.isDark ? '切换到浅色模式' : '切换到深色模式'"
    :aria-label="themeStore.isDark ? '切换到浅色模式' : '切换到深色模式'"
  >
    <!-- 太阳图标 (浅色模式) -->
    <svg
      v-if="themeStore.isDark"
      class="w-5 h-5 transition-transform duration-300 group-hover:rotate-12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
    
    <!-- 月亮图标 (深色模式) -->
    <svg
      v-else
      class="w-5 h-5 transition-transform duration-300 group-hover:-rotate-12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
    
    <!-- 过渡动画遮罩 -->
    <div
      v-if="themeStore.isTransitioning"
      class="absolute inset-0 rounded-full bg-teal-500/20 animate-ping"
    ></div>
  </button>
</template>

<style scoped>
.theme-toggle {
  /* 确保触控区域足够大 */
  min-width: var(--touch-target-size, 44px);
  min-height: var(--touch-target-size, 44px);
}
</style>
