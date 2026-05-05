<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { contentApi } from '@/api';
import BottomNavigation from '@/components/BottomNavigation.vue';

const router = useRouter();
const activeTab = ref<'map' | 'donate'>('map');
const leaderboard = ref<any[]>([]);
const alumniAssociations = ref<any[]>([]);
const donationProjects = ref<any[]>([]);
const loading = ref(false);

async function loadAssociations() {
  try {
    const res = await contentApi.getAssociations({ pageSize: 50 });
    if (res.data.success) {
      alumniAssociations.value = res.data.data.items;
    }
  } catch (e) {
    console.error('加载校友会列表失败:', e);
  }
}

async function loadDonationProjects() {
  try {
    const res = await contentApi.getDonationProjects({ status: 'active' });
    if (res.data.success) {
      donationProjects.value = res.data.data.items;
    }
  } catch (e) {
    console.error('加载捐赠项目失败:', e);
  }
}

async function loadLeaderboard() {
  try {
    const res = await contentApi.getDonationLeaderboard();
    if (res.data.success) {
      leaderboard.value = res.data.data;
    }
  } catch (e) {
    console.error('加载捐赠榜单失败:', e);
  }
}

function goBack() {
  router.push('/');
}

function getProgress(project: any) {
  const target = parseFloat(project.target_amount) || 1;
  const current = parseFloat(project.current_amount) || 0;
  return Math.min(100, Math.round((current / target) * 100));
}

onMounted(async () => {
  loading.value = true;
  await Promise.all([loadAssociations(), loadDonationProjects(), loadLeaderboard()]);
  loading.value = false;
});
</script>

<template>
  <div class="relative w-full min-h-screen overflow-hidden bg-[#020608] text-white font-sans selection:bg-teal-500/30 pb-20">
    <!-- 背景 -->
    <div class="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
    <div class="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none"></div>

    <div class="relative z-10 w-full p-6 lg:p-10 flex flex-col h-screen">
      <!-- 顶部导航 -->
      <header class="flex items-center justify-between mb-8 pb-4 border-b border-teal-500/20 shrink-0">
        <div class="flex items-center gap-6">
          <button @click="goBack" class="group flex items-center gap-3 text-white/60 hover:text-teal-400 transition-colors">
            <div class="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white/10 group-hover:border-teal-400/50 transition-all">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span class="text-sm font-mono tracking-widest uppercase">返回首页</span>
          </button>
          <div>
            <h1 class="text-3xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500">校友服务</h1>
            <p class="text-xs text-teal-200/50 font-mono tracking-[0.3em] uppercase">Alumni Services & Donations</p>
          </div>
        </div>
        <div class="hidden md:flex items-center gap-2 text-xs font-mono text-teal-500/50">
          <span class="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
          连接全球校友，共建美好母校
        </div>
      </header>

    <div class="flex-1 overflow-y-auto custom-scrollbar">
    <div class="max-w-6xl mx-auto">
      <!-- Tab切换 -->
      <div class="flex flex-wrap portrait:flex-col gap-4 portrait:gap-2 justify-center mb-8">
        <button
          @click="activeTab = 'map'"
          :class="[
            'px-6 py-3 portrait:px-4 portrait:py-4 portrait:w-full portrait:min-h-[52px] rounded-lg font-semibold transition-colors border text-left',
            activeTab === 'map' 
              ? 'bg-teal-500/20 border-teal-400/50 text-teal-300' 
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-teal-400/30'
          ]"
        >
          🌍 校友会地图
        </button>
        <button
          @click="activeTab = 'donate'"
          :class="[
            'px-6 py-3 portrait:px-4 portrait:py-4 portrait:w-full portrait:min-h-[52px] rounded-lg font-semibold transition-colors border text-left',
            activeTab === 'donate' 
              ? 'bg-teal-500/20 border-teal-400/50 text-teal-300' 
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-teal-400/30'
          ]"
        >
          ❤️ 爱心捐赠
        </button>
      </div>

      <!-- 校友会地图 -->
      <div v-if="activeTab === 'map'" class="flex flex-col portrait:flex-col landscape:flex-row landscape:lg:grid landscape:lg:grid-cols-2 gap-6 portrait:gap-4">
        <!-- 地图占位 -->
        <div class="glass-card rounded-xl p-6 portrait:p-4 aspect-video portrait:aspect-[4/3] flex items-center justify-center w-full">
          <div class="text-center">
            <div class="text-6xl portrait:text-5xl mb-4">🗺️</div>
            <p class="text-white/60 portrait:text-sm">全球校友分布热力图</p>
            <p class="text-teal-500/50 text-sm portrait:text-xs mt-2">（地图功能开发中）</p>
          </div>
        </div>

        <!-- 校友会列表 -->
        <div class="glass-card rounded-xl p-6 portrait:p-4 w-full">
          <h3 class="text-xl portrait:text-lg font-semibold text-white mb-4">各地校友会</h3>
          <div v-if="alumniAssociations.length" class="space-y-4 portrait:space-y-3">
            <div
              v-for="assoc in alumniAssociations"
              :key="assoc.id"
              class="flex items-center justify-between p-4 portrait:p-3 portrait:min-h-[60px] bg-black/40 border border-white/5 rounded-lg hover:bg-white/5 hover:border-teal-400/20 transition-all"
            >
              <div>
                <h4 class="text-white font-semibold portrait:text-sm">{{ assoc.city }}{{ assoc.region ? `(${assoc.region})` : '' }}校友会</h4>
                <p class="text-teal-400/60 text-sm portrait:text-xs">{{ assoc.member_count || 0 }} 位校友</p>
                <p v-if="assoc.contact_name" class="text-white/40 text-xs mt-1">联系人: {{ assoc.contact_name }}</p>
              </div>
              <div class="text-right">
                <p v-if="assoc.contact_phone" class="text-teal-400 portrait:text-sm">{{ assoc.contact_phone }}</p>
                <p v-if="assoc.contact_email" class="text-white/40 text-xs">{{ assoc.contact_email }}</p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-white/30">
            暂无校友会信息
          </div>
        </div>
      </div>

      <!-- 爱心捐赠 -->
      <div v-if="activeTab === 'donate'" class="flex flex-col portrait:flex-col landscape:lg:grid landscape:lg:grid-cols-3 gap-6 portrait:gap-4">
        <!-- 捐赠项目 -->
        <div class="landscape:lg:col-span-2 space-y-4 portrait:space-y-3 w-full">
          <h3 class="text-xl portrait:text-lg font-semibold text-white mb-4">捐赠项目</h3>
          <div v-if="donationProjects.length">
            <div
              v-for="project in donationProjects"
              :key="project.id"
              class="glass-card rounded-xl p-6 portrait:p-4 w-full mb-4"
            >
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h4 class="text-white font-semibold text-lg portrait:text-base">{{ project.name }}</h4>
                  <p class="text-teal-400/60 text-sm portrait:text-xs mt-1">{{ project.description }}</p>
                </div>
              </div>
              
              <!-- 进度条 -->
              <div class="mb-4">
                <div class="flex justify-between text-sm portrait:text-xs mb-2">
                  <span class="text-teal-300">已筹 ¥{{ parseFloat(project.current_amount || 0).toLocaleString() }}</span>
                  <span class="text-white/40">目标 ¥{{ parseFloat(project.target_amount).toLocaleString() }}</span>
                </div>
                <div class="h-2 portrait:h-3 bg-black/40 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                    :style="{ width: `${getProgress(project)}%` }"
                  ></div>
                </div>
              </div>

              <button class="w-full py-3 portrait:py-4 portrait:min-h-[52px] bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-teal-500/20 transition-all active:scale-95">
                立即捐赠
              </button>
            </div>
          </div>
          <div v-else class="glass-card rounded-xl p-8 text-center text-white/30">
            暂无进行中的捐赠项目
          </div>
        </div>

        <!-- 爱心榜 -->
        <div class="glass-card rounded-xl p-6 portrait:p-4 w-full">
          <h3 class="text-xl portrait:text-lg font-semibold text-white mb-4">❤️ 爱心榜</h3>
          <div v-if="leaderboard.length" class="space-y-3 portrait:space-y-2">
            <div
              v-for="(donor, index) in leaderboard.slice(0, 10)"
              :key="index"
              class="flex items-center gap-3 p-3 portrait:p-2 portrait:min-h-[52px] bg-black/40 border border-white/5 rounded-lg"
            >
              <div :class="[
                'w-8 h-8 portrait:w-7 portrait:h-7 rounded-full flex items-center justify-center font-bold text-sm',
                index === 0 ? 'bg-yellow-500 text-black' :
                index === 1 ? 'bg-gray-300 text-black' :
                index === 2 ? 'bg-amber-600 text-white' :
                'bg-white/10 text-gray-400'
              ]">
                {{ index + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-white portrait:text-sm truncate">{{ donor.donor_name }}</p>
                <p class="text-teal-500/50 text-sm portrait:text-xs">{{ donor.donation_count }}次捐赠</p>
              </div>
              <div class="text-teal-400 font-semibold portrait:text-sm">
                ¥{{ parseFloat(donor.total_amount).toLocaleString() }}
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-white/30">
            暂无捐赠记录
          </div>
        </div>
      </div>
    </div>
    </div>
    
    </div>
    
    <!-- 底部导航栏 -->
    <BottomNavigation />
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
  background: rgba(20, 184, 166, 0.3);
  border-radius: 4px;
}
</style>
