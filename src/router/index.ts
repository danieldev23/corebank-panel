import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/login",
    },
    {
      path: "/login",
      name: "Login",
      component: () => import("../views/LoginView.vue"),
    },
    {
      path: "/dashboard",
      name: "Dashboard",
      component: () => import("../views/DashboardView.vue"),
    },
    {
      path: "/transactions",
      name: "Transactions",
      component: () => import("../views/TransactionsView.vue"),
    },
    {
      path: "/api-docs",
      name: "ApiDocs",
      component: () => import("../views/ApiDocsView.vue"),
    },
    {
      path: "/settings",
      name: "Settings",
      component: () => import("../views/SettingsView.vue"),
    }
  ],
});

router.beforeEach((to, _from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const isLoginPage = to.path === '/login' || to.path === '/';

  if (!isAuthenticated && !isLoginPage) {
    next('/login');
  } else if (isAuthenticated && isLoginPage) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
