const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('@/pages/IndexPage.vue') },
      { path: '/login', component: () => import('@/pages/LoginPage.vue') },
      { path: '/cadastro', component: () => import('@/pages/RegisterPage.vue') },
      {
        path: '/game/facil',
        component: () => import('@/pages/GamePage.vue'),
        props: { difficulty: 1 },
      },
      {
        path: '/game/medio',
        component: () => import('@/pages/GamePage.vue'),
        props: { difficulty: 2 },
      },
      {
        path: '/game/dificil',
        component: () => import('@/pages/GamePage.vue'),
        props: { difficulty: 3 },
      },
    ],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes
