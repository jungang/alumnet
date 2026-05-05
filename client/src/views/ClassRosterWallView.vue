<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { contentApi } from '@/api';

const router = useRouter();
const rosters = ref<any[]>([]);
const selectedRoster = ref<any>(null);
const selectedYear = ref<number | null>(null);
const loading = ref(false);
const years = ref<number[]>([]);

const filteredRosters = computed(() => {
  if (!selectedYear.value) return rosters.value;
  return rosters.value.filter((r: any) => 
    (r.graduation_year || r.graduationYear) === selectedYear.value
  );
});

// 按年份分组
const groupedRosters = computed(() => {
  const groups: Record<number, any[]> = {};
  filteredRosters.value.forEach((r: any) => {
    const year = r.graduation_year || r.graduationYear;
    if (!groups[year]) groups[year] = [];
    groups[year].push(r);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => parseInt(b) - parseInt(a))
    .map(([year, items]) => ({ year: parseInt(year), items }));
});

async function loadRosters() {
  loading.value = true;
  try {
    // 并行加载班级名录和年份选项
    const [rosterRes, optionsRes] = await Promise.all([
      contentApi.getClassRosters({ pageSize: 1000 }),
      contentApi.getClassRosterOptions(),
    ]);
    if (rosterRes.data.success) {
      rosters.value = rosterRes.data.data.items || rosterRes.data.data;
    }
    if (optionsRes.data.success) {
      years.value = (optionsRes.data.data.years || []).sort((a: number, b: number) => b - a);
    }
  } catch (e) {
    console.error('加载班级名录失败:', e);
  } finally {
    loading.value = false;
  }
}

async function selectRoster(roster: any) {
  try {
    const res = await contentApi.getClassRosterById(roster.id);
    if (res.data.success) {
      selectedRoster.value = res.data.data;
    }
  } catch (e) {
    console.error('加载班级详情失败:', e);
  }
}

function closeRoster() {
  selectedRoster.value = null;
}

function filterByYear(year: number | null) {
  selectedYear.value = year;
}

function goBack() {
  router.push('/time-corridor');
}

function goToAlumni(alumniId: string) {
  if (alumniId) {
    router.push(`/alumni/${alumniId}`);
  }
}

onMounted(() => {
  loadRosters();
});
</script>

<template>
  <div class="relative w-full min-h-screen overflow-hidden bg-[#020608] text-white font-sans selection:bg-indigo-500/30">
    <!-- 背景 -->
    <div class="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
    <div class="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none"></div>

    <div class="relative z-10 w-full p-6 lg:p-10 flex flex-col h-screen">
      <!-- 顶部导航 -->
      <header class="flex items-center justify-between mb-8 pb-4 border-b border-indigo-500/20 shrink-0">
        <div class="flex items-center gap-6">
          <button @click="goBack" class="group flex items-center gap-3 text-white/60 hover:text-indigo-400 transition-colors">
            <div class="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white/10 group-hover:border-indigo-400/50 transition-all">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span class="text-sm font-mono tracking-widest uppercase">返回</span>
          </button>
          <div>
            <h1 class="text-3xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-500">班级名录墙</h1>
            <p class="text-xs text-indigo-200/50 font-mono tracking-[0.3em] uppercase">Class Roster Wall · Alumni Directory</p>
          </div>
        </div>
        <div class="hidden md:flex items-center gap-2 text-xs font-mono text-indigo-500/50">
          <span class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
          同窗情谊，永远铭记
        </div>
      </header>

      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <!-- 年份筛选 - 竖屏可换行 -->
        <div class="flex flex-wrap gap-2 portrait:gap-1.5 justify-center mb-8 portrait:mb-6">
          <button
            @click="filterByYear(null)"
            :class="[
              'px-4 py-2 portrait:px-3 portrait:py-2.5 portrait:min-h-[44px] rounded-full transition-colors border text-sm portrait:text-xs',
              selectedYear === null 
                ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-indigo-400/30'
            ]"
          >
            全部年份
          </button>
          <button
            v-for="year in years"
            :key="year"
            @click="filterByYear(year)"
            :class="[
              'px-4 py-2 portrait:px-3 portrait:py-2.5 portrait:min-h-[44px] rounded-full transition-colors border text-sm portrait:text-xs',
              selectedYear === year 
                ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-indigo-400/30'
            ]"
          >
            {{ year }}届
          </button>
        </div>

        <!-- 按年份分组显示 - 竖屏1-2列 -->
        <div v-for="group in groupedRosters" :key="group.year" class="mb-10 portrait:mb-6">
          <h2 class="text-xl portrait:text-lg font-bold text-indigo-300 mb-4 portrait:mb-3 flex items-center gap-3 portrait:gap-2">
            <span class="w-8 h-8 portrait:w-7 portrait:h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm portrait:text-xs">🎓</span>
            {{ group.year }}届
            <span class="text-sm portrait:text-xs text-indigo-400/50 font-normal">（{{ group.items.length }}个班级）</span>
          </h2>
          
          <div class="grid grid-cols-1 portrait:grid-cols-1 portrait:sm:grid-cols-2 landscape:grid-cols-2 landscape:lg:grid-cols-3 landscape:xl:grid-cols-4 gap-4 portrait:gap-3">
            <div
              v-for="roster in group.items"
              :key="roster.id"
              @click="selectRoster(roster)"
              class="glass-card rounded-xl p-4 portrait:p-3 cursor-pointer hover:bg-white/10 hover:border-indigo-400/30 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-300 min-h-[80px] portrait:min-h-[72px]"
            >
              <div class="flex items-center gap-3 portrait:gap-2 mb-3 portrait:mb-2">
                <span class="text-2xl portrait:text-xl">📋</span>
                <div>
                  <h3 class="text-white font-semibold portrait:text-sm">{{ roster.class_name || roster.className }}</h3>
                </div>
              </div>
              <div class="flex justify-between text-sm portrait:text-xs text-white/50">
                <span>班主任：{{ roster.head_teacher || roster.headTeacher || '-' }}</span>
                <span>{{ roster.student_count || roster.studentCount || 0 }}人</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!loading && !filteredRosters.length" class="text-center py-12 text-white/30">
          <span class="text-6xl mb-4 block">📋</span>
          <p>暂无班级名录数据</p>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="text-center py-12 text-white/30">
          <span class="text-4xl animate-spin inline-block">⏳</span>
          <p class="mt-4">加载中...</p>
        </div>
      </div>
    </div>

    <!-- 班级详情弹窗 - 竖屏全屏 -->
    <transition name="fade">
      <div 
        v-if="selectedRoster" 
        class="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 portrait:p-0"
        @click.self="closeRoster"
      >
        <div class="max-w-4xl w-full glass-card rounded-2xl portrait:rounded-none portrait:max-w-none portrait:h-full overflow-hidden max-h-[90vh] portrait:max-h-full flex flex-col">
          <!-- 头部 -->
          <div class="p-6 portrait:p-4 border-b border-white/10 shrink-0">
            <div class="flex justify-between items-start">
              <div>
                <div class="flex items-center gap-3 portrait:gap-2 mb-2">
                  <span class="text-2xl portrait:text-xl">🎓</span>
                  <span class="px-3 py-1 portrait:px-2 rounded-full bg-indigo-500/20 text-indigo-300 text-sm portrait:text-xs">
                    {{ selectedRoster.graduation_year || selectedRoster.graduationYear }}届
                  </span>
                </div>
                <h2 class="text-2xl portrait:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-500">
                  {{ selectedRoster.class_name || selectedRoster.className }}
                </h2>
                <p class="text-indigo-400/60 mt-1 portrait:text-sm">
                  班主任：{{ selectedRoster.head_teacher || selectedRoster.headTeacher || '未设置' }}
                </p>
              </div>
              <button 
                @click="closeRoster"
                class="w-10 h-10 portrait:w-12 portrait:h-12 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-indigo-400 hover:border-indigo-400/50 transition-all"
              >
                ✕
              </button>
            </div>
          </div>
          
          <!-- 内容区域 -->
          <div class="flex-1 overflow-y-auto p-6 portrait:p-4 custom-scrollbar">
            <!-- 班级名单（原简介位置，因为简介里实际存的是名单） -->
            <div v-if="selectedRoster.description" class="mb-6 portrait:mb-4 pb-6 portrait:pb-4 border-b border-white/10">
              <h3 class="text-lg portrait:text-base font-semibold text-white mb-2 flex items-center gap-2">
                <span>👥</span>
                学生名单
                <span class="text-sm portrait:text-xs text-indigo-400/50 font-normal">
                  （{{ selectedRoster.students?.length || 0 }}人已录入）
                </span>
              </h3>
              <p class="text-white/70 leading-relaxed portrait:text-sm tracking-wide">{{ selectedRoster.description }}</p>
            </div>

            <!-- 班级简介（原名单位置） -->
            <div class="mb-6 portrait:mb-4">
              <h3 class="text-lg portrait:text-base font-semibold text-white mb-4 portrait:mb-3 flex items-center gap-2">
                <span>📝</span>
                班级简介
              </h3>
              
              <div v-if="selectedRoster.students?.length" class="grid grid-cols-2 portrait:grid-cols-2 landscape:md:grid-cols-3 landscape:lg:grid-cols-4 gap-3 portrait:gap-2">
                <div 
                  v-for="student in selectedRoster.students" 
                  :key="student.id"
                  @click="goToAlumni(student.alumni_id || student.alumniId)"
                  :class="[
                    'p-3 portrait:p-2 portrait:min-h-[52px] rounded-lg bg-white/5 border border-white/10',
                    (student.alumni_id || student.alumniId) ? 'cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-400/30' : ''
                  ]"
                >
                  <div class="flex items-center gap-2">
                    <span v-if="student.seat_number || student.seatNumber" class="text-xs portrait:text-xs text-indigo-400/50">
                      {{ student.seat_number || student.seatNumber }}号
                    </span>
                    <span class="text-white portrait:text-sm">{{ student.student_name || student.studentName }}</span>
                  </div>
                  <p v-if="student.student_id || student.studentId" class="text-xs portrait:text-xs text-white/50 mt-1">
                    学号：{{ student.student_id || student.studentId }}
                  </p>
                </div>
              </div>
              <p v-else class="text-white/30 text-center py-4">暂无简介信息</p>
            </div>
            
            <!-- 关联毕业照 -->
            <div v-if="selectedRoster.photos?.length">
              <h3 class="text-lg portrait:text-base font-semibold text-white mb-4 portrait:mb-3 flex items-center gap-2">
                <span>📷</span>
                班级毕业照
              </h3>
              <div class="grid grid-cols-1 portrait:grid-cols-1 landscape:md:grid-cols-2 gap-4 portrait:gap-3">
                <div v-for="photo in selectedRoster.photos" :key="photo.id" class="rounded-lg overflow-hidden">
                  <img 
                    :src="photo.restored_url || photo.restoredUrl || photo.original_url || photo.originalUrl" 
                    :alt="`${photo.year}届毕业照`"
                    class="w-full h-48 portrait:h-40 object-cover"
                  />
                  <div class="p-2 bg-white/5 text-center text-sm portrait:text-xs text-white/60">
                    {{ photo.year }}届 {{ photo.class_name || photo.className || '合影' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 4px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
