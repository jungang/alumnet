import { createRouter, createWebHistory } from 'vue-router';

// 开发和生产环境都使用 /xyl/ 作为 base path
const base = '/xyl/';

const router = createRouter({
  history: createWebHistory(base),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchView.vue'),
    },
    {
      path: '/galaxy',
      name: 'galaxy',
      component: () => import('@/views/GalaxyView.vue'),
    },
    {
      path: '/corridor',
      name: 'corridor',
      component: () => import('@/views/TimeCorridorView.vue'),
    },
    {
      path: '/interaction',
      name: 'interaction',
      component: () => import('@/views/InteractionView.vue'),
    },
    {
      path: '/service',
      name: 'service',
      component: () => import('@/views/ServiceView.vue'),
    },
    {
      path: '/alumni/:id',
      name: 'alumni-detail',
      component: () => import('@/views/AlumniDetailView.vue'),
    },
    {
      path: '/time-corridor',
      name: 'time-corridor',
      component: () => import('@/views/TimeCorridorView.vue'),
    },
    {
      path: '/vintage-museum',
      name: 'vintage-museum',
      component: () => import('@/views/VintageMuseumView.vue'),
    },
    {
      path: '/class-roster-wall',
      name: 'class-roster-wall',
      component: () => import('@/views/ClassRosterWallView.vue'),
    },
    {
      path: '/self-service',
      name: 'self-service',
      component: () => import('@/views/SelfServiceView.vue'),
    },
    // 状元榜重定向到校友风采页面
    {
      path: '/top-scholars',
      redirect: '/galaxy',
    },
  ],
});

export default router;
