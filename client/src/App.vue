<script setup lang="ts">
import { RouterView } from 'vue-router';
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useNavigationStore } from '@/stores/navigation';
import { useThemeStore } from '@/stores/theme';

const route = useRoute();
const navigationStore = useNavigationStore();
const themeStore = useThemeStore();

// 计算过渡动画名称
const transitionName = computed(() => {
  const direction = navigationStore.transitionDirection;
  if (direction === 'left') return 'slide-left';
  if (direction === 'right') return 'slide-right';
  return 'page-fade';
});

// 初始化主题
onMounted(() => {
  themeStore.loadFromStorage();
});

// 监听路由变化更新导航状态
watch(() => route.path, (newPath) => {
  navigationStore.initFromRoute(newPath);
}, { immediate: true });
</script>

<template>
  <router-view v-slot="{ Component, route: currentRoute }">
    <transition :name="transitionName" mode="out-in">
      <component :is="Component" :key="currentRoute.path" />
    </transition>
  </router-view>
</template>

<style scoped>
/* 页面转场动画 - 渐隐渐显（默认） */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 向左滑动（进入下一个模块） */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* 向右滑动（返回上一个模块） */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
