import { createRouter, createWebHashHistory } from 'vue-router'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/ZImageGenerate',
    },
    {
      path: '/ZImageGenerate',
      name: 'ZImageGenerate',
      component: () => import('../views/ZImageGenerate.vue'),
    },
    {
      path: '/ZImageSettings',
      name: 'ZImageSettings',
      component: () => import('../views/ZImageSettings.vue'),
    },
  ],
})
