import {
  defineComponent,
  type ComponentObjectPropsOptions,
  type DefineComponent,
  type SetupContext,
  type VNodeChild,
  type Ref,
} from "vue";

/** Keep typed JSX props explicit at runtime without adding a wrapper element. */
export function defineView<Props extends object>(
  keys: readonly (keyof Props)[],
  setup: (props: Readonly<Props>, context: SetupContext) => () => VNodeChild
): DefineComponent<Props> {
  return defineComponent({
    inheritAttrs: false,
    props: Object.fromEntries(
      keys.map(key => [key, { type: null }])
    ) as ComponentObjectPropsOptions,
    setup: (props, context) =>
      setup(props as unknown as Readonly<Props>, context),
  }) as unknown as DefineComponent<Props>;
}

export type StateAction<T> = T | ((current: T) => T);
export type StateSetter<T> = (action: StateAction<T>) => void;
export function stateSetter<T>(state: Ref<T>): StateSetter<T> {
  return action => {
    state.value =
      typeof action === "function"
        ? (action as (current: T) => T)(state.value)
        : action;
  };
}
export type ElementEvent<E extends Event, T extends EventTarget> = E & {
  currentTarget: T;
};
