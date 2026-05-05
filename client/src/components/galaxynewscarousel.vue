<script setup lang="ts">
import { computed } from 'vue';
import { useThemeStore } from '@/stores/theme';

interface NewsItem {
  id: string;
  title: string;
  alumni_name: string;
  date: string;
  type: 'award' | 'donation' | 'activity' | 'news';
}

const props = defineProps<{
  news: NewsItem[];
  currentIndex: number;
}>();

const emit = defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
}>();

const themeStore = useThemeStore();
const isDark = computed(() => themeStore.isDark);

const currentNews = computed(() => {
  return props.news[props.currentIndex] || null;
});

const typeEmoji: Record<string, string> = {
  award: '🏆',
  donation: '💝',
  activity: '🎉',
  news: '📰',
};
</script>

<template>
  <div class="shrink-0 pt-6 transition-colors duration-300"
    :class="isDark ? 'border-t border-teal-500/20' : 'border-t border-[#8b2500]/20'">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-lg" :class="isDark ? 'text-teal-400' : 'text-[#8b2500]'">📰</span>
        <span class="font-medium text-sm" :class="isDark ? 'text-teal-300' : 'text-[#8b2500]'">校友动态</span>
      </div>

      <div v-if="currentNews" class="flex-1 min-w-0 text-sm">
        <span class="mr-1">{{ typeEmoji[currentNews.type] || '📰' }}</span>
        <span class="font-medium">{{ currentNews.title }}</span>
        <span class="opacity-50 ml-2">{{ currentNews.alumni_name }}</span>
      </div>
      <div v-else class="flex-1 text-sm opacity-50">暂无动态</div>

      <div class="flex items-center gap-2 shrink-0">
        <button @click="emit('prev')" class="touch-target w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors"
          :class="isDark ? 'text-white/40 hover:text-teal-400' : 'text-gray-400 hover:text-teal-500'"
          aria-label="上一条">
          ←
        </button>
        <span class="text-xs opacity-40 min-w-[3rem] text-center">{{ currentIndex + 1 }}/{{ news.length }}</span>
        <button @click="emit('next')" class="touch-target w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors"
          :class="isDark ? 'text-white/40 hover:text-teal-400' : 'text-gray-400 hover:text-teal-500'"
          aria-label="下一条">
          →
        </button>
      </div>
    </div>
  </div>
</template>
