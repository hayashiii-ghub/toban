import {
  defineComponent,
  h,
  isVNode,
  nextTick,
  reactive,
  shallowRef,
  unref,
  type Component,
  type VNode,
  type UnwrapRef,
} from "vue";
import { render as renderVue, type RenderOptions } from "@testing-library/vue";
import { MotionConfig } from "motion-v";
export {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
  getQueriesForElement,
} from "@testing-library/vue";

interface ViewOptions extends RenderOptions<Component> {
  wrapper?: Component;
}

/** Mount the actual Vue tree while retaining the existing JSX test call sites. */
export function render(node: VNode | Component, options: ViewOptions = {}) {
  const current = shallowRef(node);
  const { wrapper, ...mountOptions } = options;
  const Harness = defineComponent(() => () => {
    const content = isVNode(current.value) ? current.value : h(current.value);
    return h(
      MotionConfig,
      { skipAnimations: true },
      {
        default: () =>
          wrapper ? h(wrapper, null, { default: () => content }) : content,
      }
    );
  });
  const view = renderVue(Harness, {
    ...mountOptions,
    global: {
      ...mountOptions.global,
      stubs: {
        transition: false,
        "transition-group": false,
        ...mountOptions.global?.stubs,
      },
    },
  });
  return {
    ...view,
    container: view.container as HTMLElement,
    baseElement: view.baseElement as HTMLElement,
    rerender: async (next: VNode | Component) => {
      current.value = next;
      await nextTick();
    },
  };
}

export function renderHook<T, Props extends object = Record<string, never>>(
  callback: (props: Props) => T,
  options: { initialProps?: Props; wrapper?: Component } = {}
) {
  const props = reactive({ ...options.initialProps }) as Props;
  let value: T;
  const Harness = defineComponent(() => {
    value = callback(props);
    return () => null;
  });
  const view = render(h(Harness), { wrapper: options.wrapper });
  const result = {
    get current(): UnwrapRef<T> {
      return unref(value) as UnwrapRef<T>;
    },
  };
  return {
    result,
    unmount: view.unmount,
    rerender: async (next?: Props) => {
      if (next) Object.assign(props, next);
      await nextTick();
    },
  };
}

export async function act<T>(callback: () => T | Promise<T>): Promise<T> {
  const value = await callback();
  await nextTick();
  return value;
}
