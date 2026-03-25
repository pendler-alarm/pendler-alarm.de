export type AppRoute = {
  path?: string
  name: string
  view: string
}
/**
 * Additional routes that are not defined in the static route configuration (e.g. for dynamic imports) can be added here.
 * The path is optional and will default to `/${name}` if not provided.
 */
export const additionalRoutes: AppRoute[] = [
  {
    name: 'home',
    path: '/',
    view: 'HomeView.vue',
  },
  {
    name: 'about',
    view: 'AboutView.vue',
  },
  {
    name: 'releases',
    view: 'ReleaseView.vue',
  },
  {
    name: 'test',
    path: '/other/folder',
    view: 'test/TestView.vue',
  },
];
