import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { additionalRoutes } from './routes';

const viewModules = import.meta.glob('../views/**/*.vue');

// resolve wrong static type for the routes, which is caused by the dynamic import of the view components
const resolveViewComponent = (view: string) => {
  const viewPath = `../views/${view}`;
  const component = viewModules[viewPath];

  if (!component) {
    throw new Error(`Route view not found: ${viewPath}`);
  }

  return component;
};

const routes: RouteRecordRaw[] = additionalRoutes.map((route) => ({
  path: route.path ?? `/${route.name}`,
  name: route.name,
  component: resolveViewComponent(route.view),
}));

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
