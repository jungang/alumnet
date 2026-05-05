<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useNavigationStore } from '@/stores/navigation';
import ThemeToggle from '@/components/ThemeToggle.vue';

interface Props {
  title: string;
  subtitle?: string;
  backTo?: string;
  backText?: string;
  statusText?: string;
  showThemeToggle?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  backTo: '/',
  backText: '返回首页',
  subtitle: '',
  statusText: '',
  showThemeToggle: true
});

const router = useRouter();
const navigationStore = useNavigationStore();

function goBack() {
  if (props.backTo === 'back') {
    router.back();
  } else if (props.backTo === '/') {
    // 返回首页时跳过屏保
    navigationStore.navigateToHome(router, true);
  } else {
    router.push(props.backTo);
  }
}
</script>

<template>
  <header class="flex items-center justify-between mb-8 pb-4 border-b border-teal-500/20 shrink-0">
    <div class="flex items-center gap-6">
      <button @click="goBack" class="group flex items-center gap-3 text-white/60 hover:text-teal-400 transition-colors">
        <div class="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white/10 group-hover:border-teal-400/50 transition-all">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </div>
        <span class="text-sm font-mono tracking-widest uppercase">{{ backText }}</span>
      </button>
      <div>
        <h1 class="text-3xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500">{{ title }}</h1>
        <p v-if="subtitle" class="text-xs text-teal-200/50 font-mono tracking-[0.3em] uppercase">{{ subtitle }}</p>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <div v-if="statusText" class="hidden md:flex items-center gap-2 text-xs font-mono text-teal-500/50">
        <span class="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
        {{ statusText }}
      </div>
      <ThemeToggle v-if="showThemeToggle" />
      <slot name="right"></slot>
    </div>
  </header>
</template>
