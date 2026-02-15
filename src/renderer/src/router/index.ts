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
      component: (): Promise<any> => import('../views/ZImageGenerate.vue'),
    },
  ],
})
