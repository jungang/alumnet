<script setup lang="ts">
import { computed } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { useNavigationStore } from '@/stores/navigation';

interface Alumni {
  id: string;
  alumni_id: string;
  name: string;
  category: string;
  photo?: string;
  photoUrl?: string;
  achievement?: string;
  graduation_year?: number;
  title?: string;
}

const props = defineProps<{
  alumni: Alumni[];
  currentPage: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'page', page: number): void;
  (e: 'viewDetail', alumni: Alumni): void;
}>();

const themeStore = useThemeStore();
const navigationStore = useNavigationStore();
const isDark = computed(() => themeStore.isDark);

const currentAlumni = computed(() => {
  if (props.alumni.length === 0) return null;
  const idx = props.currentPage % props.alumni.length;
  return props.alumni[idx];
});

function viewDetail(alumni: Alumni) {
  navigationStore.enterDetail('galaxy', '/galaxy');
  emit('viewDetail', alumni);
}
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center px-4">
    <!-- 卡片 -->
    <div v-if="currentAlumni" class="w-full max-w-md mx-auto">
      <div
        class="rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer"
        :class="isDark ? 'bg-white/5 border border-white/10 hover:border-teal-400/30' : 'bg-white border border-gray-200 hover:shadow-lg'"
        @click="viewDetail(currentAlumni)"
        role="button"
        :aria-label="`查看 ${currentAlumni.name} 的详情`"
      >
        <!-- 照片 -->
        <div class="aspect-[4/3] relative overflow-hidden"
          :class="isDark ? 'bg-gradient-to-br from-teal-500/10 to-cyan-500/10' : 'bg-gradient-to-br from-teal-50 to-cyan-50'">
          <img v-if="currentAlumni.photoUrl || currentAlumni.photo"
            :src="currentAlumni.photoUrl || currentAlumni.photo"
            :alt="currentAlumni.name"
            class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-5xl font-bold"
            :class="isDark ? 'text-teal-500/20' : 'text-teal-200'">
            {{ currentAlumni.name[0] }}
          </div>
          <div class="absolute top-3 right-3 text-xs px-3 py-1 rounded-full backdrop-blur-sm"
            :class="isDark ? 'bg-black/50 text-teal-300' : 'bg-white/80 text-teal-600'">
            {{ currentAlumni.category }}
          </div>
        </div>
        <!-- 信息 -->
        <div class="p-5">
          <h3 class="text-lg font-bold mb-1">{{ currentAlumni.name }}</h3>
          <p v-if="currentAlumni.graduation_year" class="text-sm opacity-60 mb-2">{{ currentAlumni.graduation_year }}届</p>
          <p v-if="currentAlumni.achievement" class="text-sm opacity-80 line-clamp-3">{{ currentAlumni.achievement }}</p>
        </div>
      </div>
    </div>

    <!-- 翻页控制 -->
    <div class="flex items-center gap-4 mt-4">
      <button @click="emit('prev')" class="touch-target w-10 h-10 rounded-full border flex items-center justify-center transition-colors"
        :class="isDark ? 'border-white/20 text-white/60 hover:text-teal-400 hover:border-teal-400/50' : 'border-gray-300 text-gray-500 hover:text-teal-500'"
        aria-label="上一位">
        ←
      </button>
      <div class="flex items-center gap-1.5">
        <button v-for="i in totalPages" :key="i"
          @click="emit('page', i - 1)"
          class="w-2 h-2 rounded-full transition-all"
          :class="i - 1 === currentPage
            ? (isDark ? 'bg-teal-400 w-6' : 'bg-teal-500 w-6')
            : (isDark ? 'bg-white/20' : 'bg-gray-300')"
          :aria-label="`第 ${i} 页`"
        />
      </div>
      <button @click="emit('next')" class="touch-target w-10 h-10 rounded-full border flex items-center justify-center transition-colors"
        :class="isDark ? 'border-white/20 text-white/60 hover:text-teal-400 hover:border-teal-400/50' : 'border-gray-300 text-gray-500 hover:text-teal-500'"
        aria-label="下一位">
        →
      </button>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
