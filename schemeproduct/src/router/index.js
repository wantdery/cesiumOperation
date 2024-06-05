import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/addScheme',
      name: 'addScheme',
      component: () => import('../views/AddScheme.vue')
    },
    {
      path: '/schemePage',
      name: 'schemePage',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/SchemePage.vue')
    }
  ]
})

export default router
