import { createRouter, createWebHistory } from 'vue-router';

// 始终使用 /xyl/admin 作为 base path（开发和生产环境一致）
const base = '/xyl/admin/';

const router = createRouter({
  history: createWebHistory(base),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: '数据仪表盘' },
        },
        {
          path: 'alumni',
          name: 'alumni-manage',
          component: () => import('@/views/AlumniManage.vue'),
          meta: { title: '校友管理' },
        },
        {
          path: 'content',
          name: 'content-audit',
          component: () => import('@/views/ContentAudit.vue'),
          meta: { title: '留言审核' },
        },
        {
          path: 'import',
          name: 'data-import',
          component: () => import('@/views/BatchImport.vue'),
          meta: { title: '批量导入' },
        },
        {
          path: 'logs',
          name: 'system-logs',
          component: () => import('@/views/SystemLog.vue'),
          meta: { title: '操作日志' },
        },
        {
          path: 'knowledge-base',
          name: 'knowledge-base',
          component: () => import('@/views/KnowledgeBase.vue'),
          meta: { title: '知识库管理' },
        },
        {
          path: 'distinguished',
          name: 'distinguished-alumni',
          component: () => import('@/views/DistinguishedManage.vue'),
          meta: { title: '杰出校友' },
        },
        {
          path: 'photos',
          name: 'graduation-photos',
          component: () => import('@/views/PhotoManage.vue'),
          meta: { title: '毕业照管理' },
        },
        {
          path: 'notices',
          name: 'search-notices',
          component: () => import('@/views/NoticeManage.vue'),
          meta: { title: '寻人启事' },
        },
        {
          path: 'donations',
          name: 'donation-projects',
          component: () => import('@/views/DonationManage.vue'),
          meta: { title: '捐赠项目' },
        },
        {
          path: 'associations',
          name: 'alumni-associations',
          component: () => import('@/views/AssociationManage.vue'),
          meta: { title: '校友会管理' },
        },
        {
          path: 'news',
          name: 'alumni-news',
          component: () => import('@/views/NewsManage.vue'),
          meta: { title: '校友动态' },
        },
        {
          path: 'messages',
          name: 'message-manage',
          component: () => import('@/views/MessageManage.vue'),
          meta: { title: '留言管理' },
        },
        {
          path: 'settings',
          name: 'system-settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '系统配置' },
        },
        {
          path: 'vintage-items',
          name: 'vintage-items',
          component: () => import('@/views/VintageItemManage.vue'),
          meta: { title: '老物件管理' },
        },
        {
          path: 'class-rosters',
          name: 'class-rosters',
          component: () => import('@/views/ClassRosterManage.vue'),
          meta: { title: '班级名录' },
        },
        {
          path: 'videos',
          name: 'video-manage',
          component: () => import('@/views/VideoManage.vue'),
          meta: { title: '视频寄语' },
        },
        {
          path: 'interaction-stats',
          name: 'interaction-stats',
          component: () => import('@/views/InteractionStats.vue'),
          meta: { title: '互动统计' },
        },
        {
          path: 'backup',
          name: 'backup',
          component: () => import('@/views/BackupManage.vue'),
          meta: { title: '数据备份' },
        },

        {
          path: 'top-scholars',
          name: 'top-scholars',
          component: () => import('@/views/TopScholarManage.vue'),
          meta: { title: '状元榜管理' },
        },
      ],
    },
  ],
});

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('admin_token');
  if (to.path !== '/login' && !token) {
    next('/login');
  } else {
    next();
  }
});

export default router;
