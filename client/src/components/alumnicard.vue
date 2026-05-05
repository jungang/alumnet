<script setup lang="ts">
import { computed } from 'vue';
import { useThemeStore } from '@/stores/theme';

// --- Props ---
const props = defineProps<{
  alumni: {
    id: string;
    name: string;
    graduation_year?: number;
    industry?: string;
    category?: string;
    achievement?: string;
    photo?: string;
    photoUrl?: string;
    biography?: string;
    title?: string;
    class_name?: string;
  };
  /** 卡片变体: compact (列表项) / card (标准卡片) / detail (详情卡) */
  variant?: 'compact' | 'card' | 'detail';
  /** 是否显示操作按钮 */
  showAction?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click', alumni: any): void;
}>();

const themeStore = useThemeStore();
const isDark = computed(() => themeStore.isDark);

const photoUrl = computed(() => {
  return props.alumni.photoUrl || props.alumni.photo || '';
});

const subtitle = computed(() => {
  const parts: string[] = [];
  if (props.alumni.graduation_year) parts.push(`${props.alumni.graduation_year}届`);
  if (props.alumni.industry) parts.push(props.alumni.industry);
  if (props.alumni.class_name) parts.push(props.alumni.class_name);
  return parts.join(' · ');
});
</script>

<template>
  <!-- Compact: 列表项 -->
  <div
    v-if="variant === 'compact'"
    class="alumni-card-compact flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
    :class="isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'"
    @click="emit('click', alumni)"
    role="button"
    :aria-label="`${alumni.name} ${subtitle}`"
  >
    <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
      :class="isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-50 text-teal-600'">
      <img v-if="photoUrl" :src="photoUrl" :alt="alumni.name" class="w-full h-full rounded-full object-cover" />
      <span v-else>{{ alumni.name[0] }}</span>
    </div>
    <div class="min-w-0 flex-1">
      <div class="font-medium truncate">{{ alumni.name }}</div>
      <div class="text-xs opacity-60 truncate">{{ subtitle }}</div>
    </div>
    <span v-if="alumni.category" class="text-xs px-2 py-0.5 rounded-full shrink-0"
      :class="isDark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'">
      {{ alumni.category }}
    </span>
  </div>

  <!-- Card: 标准卡片 -->
  <div
    v-else-if="variant === 'card'"
    class="alumni-card-card rounded-xl overflow-hidden transition-all duration-300 cursor-pointer group"
    :class="isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-white hover:shadow-md border border-gray-200'"
    @click="emit('click', alumni)"
    role="button"
    :aria-label="`${alumni.name} ${subtitle}`"
  >
    <!-- 照片区 -->
    <div class="aspect-[4/3] relative overflow-hidden"
      :class="isDark ? 'bg-gradient-to-br from-teal-500/10 to-cyan-500/10' : 'bg-gradient-to-br from-teal-50 to-cyan-50'">
      <img v-if="photoUrl" :src="photoUrl" :alt="alumni.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div v-else class="w-full h-full flex items-center justify-center text-4xl font-bold"
        :class="isDark ? 'text-teal-500/30' : 'text-teal-200'">
        {{ alumni.name[0] }}
      </div>
      <div v-if="alumni.category" class="absolute top-2 right-2 text-xs px-2 py-1 rounded-full backdrop-blur-sm"
        :class="isDark ? 'bg-black/50 text-white' : 'bg-white/80 text-gray-700'">
        {{ alumni.category }}
      </div>
    </div>
    <!-- 信息区 -->
    <div class="p-4">
      <h3 class="font-bold text-base mb-1">{{ alumni.name }}</h3>
      <p class="text-xs opacity-60 mb-2">{{ subtitle }}</p>
      <p v-if="alumni.achievement" class="text-xs line-clamp-2 opacity-80">{{ alumni.achievement }}</p>
    </div>
  </div>

  <!-- Detail: 详情卡 -->
  <div
    v-else
    class="alumni-card-detail p-5 rounded-xl"
    :class="isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'"
  >
    <div class="flex items-start gap-4">
      <div class="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold"
        :class="isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-50 text-teal-600'">
        <img v-if="photoUrl" :src="photoUrl" :alt="alumni.name" class="w-full h-full rounded-xl object-cover" />
        <span v-else>{{ alumni.name[0] }}</span>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-bold text-lg">{{ alumni.name }}</h3>
        <p class="text-sm opacity-60">{{ subtitle }}</p>
        <p v-if="alumni.title" class="text-sm mt-1" :class="isDark ? 'text-teal-300' : 'text-teal-600'">{{ alumni.title }}</p>
      </div>
    </div>
    <p v-if="alumni.biography" class="mt-3 text-sm opacity-80 leading-relaxed">{{ alumni.biography }}</p>
    <p v-if="alumni.achievement" class="mt-2 text-sm" :class="isDark ? 'text-amber-300' : 'text-amber-600'">
      🏆 {{ alumni.achievement }}
    </p>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
