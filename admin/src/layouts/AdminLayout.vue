<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMenu, ElMenuItem, ElSubMenu, ElContainer, ElAside, ElMain, ElHeader, ElButton, ElDropdown, ElDropdownMenu, ElDropdownItem, ElAvatar, ElBadge } from 'element-plus';

const router = useRouter();
const route = useRoute();
const isCollapse = ref(false);

// 菜单配置
const menuGroups = [
  {
    title: '概览',
    icon: '📊',
    children: [
      { path: '/dashboard', title: '数据仪表盘', icon: '📈' },
    ]
  },
  {
    title: '校友管理',
    icon: '👥',
    children: [
      { path: '/alumni', title: '校友管理', icon: '👤' },
      { path: '/distinguished', title: '杰出校友', icon: '⭐' },
      { path: '/photos', title: '毕业照管理', icon: '📷' },
      { path: '/news', title: '校友动态', icon: '📰' },
      { path: '/top-scholars', title: '状元榜管理', icon: '🏆' },
      { path: '/import', title: '批量导入', icon: '📤' },
    ]
  },
  {
    title: '时空长廊',
    icon: '🏛️',
    children: [
      { path: '/vintage-items', title: '老物件管理', icon: '🎭' },
      { path: '/class-rosters', title: '班级名录', icon: '📋' },
    ]
  },
  {
    title: '互动寄语',
    icon: '📝',
    children: [
      { path: '/messages', title: '留言管理', icon: '💬' },
      { path: '/notices', title: '寻人启事', icon: '🔍' },
      { path: '/videos', title: '视频寄语', icon: '🎬' },
      { path: '/interaction-stats', title: '互动统计', icon: '📊' },
    ]
  },
  {
    title: '服务管理',
    icon: '🎯',
    children: [
      { path: '/donations', title: '捐赠项目', icon: '💰' },
      { path: '/associations', title: '校友会管理', icon: '🏛️' },
    ]
  },
  {
    title: '知识库',
    icon: '🧠',
    children: [
      { path: '/knowledge-base', title: '知识库管理', icon: '📚' },
    ]
  },
  {
    title: '系统设置',
    icon: '⚙️',
    children: [
      { path: '/logs', title: '操作日志', icon: '📋' },
      { path: '/backup', title: '数据备份', icon: '💾' },
      { path: '/settings', title: '系统配置', icon: '🔧' },
    ]
  },
];

const currentTime = computed(() => {
  return new Date().toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });
});

function handleSelect(path: string) {
  router.push(path);
}

function logout() {
  localStorage.removeItem('admin_token');
  router.push('/login');
}

function toggleCollapse() {
  isCollapse.value = !isCollapse.value;
}
</script>

<template>
  <ElContainer class="h-screen">
    <!-- 侧边栏 -->
    <ElAside :width="isCollapse ? '64px' : '240px'" class="sidebar-container">
      <!-- Logo区域 -->
      <div class="logo-container">
        <img src="/logo.png" alt="Logo" class="logo-img" :class="{ 'logo-img-small': isCollapse }" />
        <transition name="fade">
          <span v-if="!isCollapse" class="logo-text">示例校友管理</span>
        </transition>
      </div>
      
      <!-- 菜单 -->
      <ElMenu
        :default-active="route.path"
        :collapse="isCollapse"
        :collapse-transition="false"
        class="sidebar-menu"
        background-color="transparent"
        text-color="rgba(255,255,255,0.7)"
        active-text-color="#409EFF"
        @select="handleSelect"
      >
        <template v-for="group in menuGroups" :key="group.title">
          <ElSubMenu v-if="!isCollapse" :index="group.title">
            <template #title>
              <span class="menu-icon">{{ group.icon }}</span>
              <span>{{ group.title }}</span>
            </template>
            <ElMenuItem 
              v-for="item in group.children" 
              :key="item.path" 
              :index="item.path"
              class="sub-menu-item"
            >
              <span class="menu-icon">{{ item.icon }}</span>
              <span>{{ item.title }}</span>
            </ElMenuItem>
          </ElSubMenu>
          
          <!-- 折叠时直接显示子菜单 -->
          <template v-else>
            <ElMenuItem 
              v-for="item in group.children" 
              :key="item.path" 
              :index="item.path"
            >
              <span class="menu-icon">{{ item.icon }}</span>
              <template #title>{{ item.title }}</template>
            </ElMenuItem>
          </template>
        </template>
      </ElMenu>
      
      <!-- 底部折叠按钮 -->
      <div class="collapse-btn" @click="toggleCollapse">
        <span>{{ isCollapse ? '»' : '«' }}</span>
      </div>
    </ElAside>

    <ElContainer class="main-container">
      <!-- 头部 -->
      <ElHeader class="header-container">
        <div class="header-left">
          <span class="breadcrumb">{{ route.meta.title || '首页' }}</span>
        </div>
        
        <div class="header-right">
          <span class="current-time">{{ currentTime }}</span>
          
          <ElDropdown trigger="click">
            <div class="user-info">
              <ElAvatar :size="32" class="user-avatar">管</ElAvatar>
              <span class="user-name">管理员</span>
            </div>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem>个人设置</ElDropdownItem>
                <ElDropdownItem divided @click="logout">
                  <span class="text-red-500">退出登录</span>
                </ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </ElHeader>

      <!-- 主内容 -->
      <ElMain class="main-content">
        <div class="content-wrapper">
          <RouterView />
        </div>
      </ElMain>
    </ElContainer>
  </ElContainer>
</template>

<style scoped>
.sidebar-container {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  box-shadow: 2px 0 8px rgba(0,0,0,0.15);
}

.logo-container {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding: 0 16px;
}

.logo-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  transition: all 0.3s;
}

.logo-img-small {
  width: 32px;
  height: 32px;
}

.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  border-right: none !important;
  padding: 8px;
}

.sidebar-menu :deep(.el-menu-item),
.sidebar-menu :deep(.el-sub-menu__title) {
  border-radius: 8px;
  margin: 4px 0;
  height: 44px;
  line-height: 44px;
}

.sidebar-menu :deep(.el-menu-item:hover),
.sidebar-menu :deep(.el-sub-menu__title:hover) {
  background-color: rgba(255,255,255,0.1) !important;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, #409EFF 0%, #36D1DC 100%) !important;
  color: #fff !important;
}

.sub-menu-item {
  padding-left: 48px !important;
}

.menu-icon {
  margin-right: 10px;
  font-size: 16px;
}

.collapse-btn {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  border-top: 1px solid rgba(255,255,255,0.1);
  transition: all 0.3s;
}

.collapse-btn:hover {
  color: #fff;
  background: rgba(255,255,255,0.1);
}

.main-container {
  background: #f0f2f5;
}

.header-container {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px !important;
}

.header-left {
  display: flex;
  align-items: center;
}

.breadcrumb {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.current-time {
  color: #909399;
  font-size: 14px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.3s;
}

.user-info:hover {
  background: #f5f7fa;
}

.user-avatar {
  background: linear-gradient(135deg, #409EFF 0%, #36D1DC 100%);
}

.user-name {
  color: #303133;
  font-size: 14px;
}

.main-content {
  padding: 24px;
  overflow-y: auto;
}

.content-wrapper {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  min-height: calc(100vh - 64px - 48px);
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
