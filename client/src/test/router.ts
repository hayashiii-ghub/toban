import { defineComponent, h, nextTick } from "vue";
import {
  createMemoryHistory,
  createRouter,
  RouterView,
  type RouteRecordRaw,
} from "vue-router";
import { render } from "./vue";

/** Use the real router without mounting unrelated destination pages. */
export async function renderAt(
  path: string,
  routes: RouteRecordRaw[],
  options: Parameters<typeof render>[1] = {}
) {
  const history: string[] = [];
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...routes,
      {
        path: "/:pathMatch(.*)*",
        component: defineComponent(() => () => null),
      },
    ],
  });
  router.afterEach(to => {
    history.push(to.fullPath);
  });
  await router.push(path);
  await router.isReady();
  const view = render(h(RouterView), {
    ...options,
    global: {
      ...options.global,
      plugins: [...(options.global?.plugins ?? []), router],
    },
  });
  await nextTick();
  return {
    ...view,
    router,
    history,
    navigate: async (to: string) => {
      await router.push(to);
      await nextTick();
    },
  };
}
