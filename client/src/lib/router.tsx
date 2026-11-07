import { computed, inject, type HTMLAttributes } from "vue";
import {
  createRouter,
  createWebHistory,
  routerKey,
  routeLocationKey,
  type RouteRecordRaw,
} from "vue-router";
import { defineView } from "./vue";

interface LinkProps extends HTMLAttributes {
  href: string;
  target?: string;
  rel?: string;
}
export const Link = defineView<LinkProps>(
  ["href", "onClick"],
  (props, { attrs, slots }) => {
    const router = inject(routerKey, null);
    return () => (
      <a
        {...attrs}
        href={props.href}
        onClick={(event: PointerEvent) => {
          props.onClick?.(event);
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey ||
            event.shiftKey ||
            attrs.target === "_blank"
          )
            return;
          if (router && props.href.startsWith("/")) {
            event.preventDefault();
            void router.push(props.href);
          }
        }}
      >
        {slots.default?.()}
      </a>
    );
  }
);
export function useLocation() {
  const router = inject(routerKey, null);
  const route = inject(routeLocationKey, null);
  const path = computed(() => route?.path ?? window.location.pathname);
  const navigate = (to: string, options?: { replace?: boolean }) => {
    if (!router) {
      const method = options?.replace ? "replaceState" : "pushState";
      window.history[method](window.history.state, "", to);
      return Promise.resolve();
    }
    return options?.replace ? router.replace(to) : router.push(to);
  };
  return [path, navigate] as const;
}
export function useParams<T extends Record<string, string>>() {
  const route = inject(routeLocationKey, null);
  return new Proxy({} as T, {
    get: (_target, key) => route?.params[key as string],
  });
}
export function useSearch() {
  const route = inject(routeLocationKey, null);
  return computed(() => {
    const fullPath = route?.fullPath ?? window.location.search;
    const start = fullPath.indexOf("?");
    return start < 0 ? "" : fullPath.slice(start + 1).split("#")[0];
  });
}
export function createAppRouter(routes: RouteRecordRaw[]) {
  return createRouter({ history: createWebHistory(), routes });
}
