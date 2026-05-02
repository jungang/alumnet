<script setup lang="ts">
interface Props {
  isPaused: boolean;
}

defineProps<Props>();
</script>

<template>
  <transition name="fade">
    <div
      v-if="isPaused"
      class="auto-scroll-pause fixed bottom-24 right-6 z-40 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md transition-all"
      :class="[
        'bg-[var(--bg-card)] border border-[var(--border-color)]'
      ]"
    >
      <!-- 暂停图标 -->
      <div class="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
        <svg class="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      </div>
      
      <!-- 文字提示 -->
      <span class="text-xs font-medium text-amber-400/80">
        自动播放已暂停
      </span>
    </div>
  </transition>
</template>

<style scoped>
.auto-scroll-pause {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
