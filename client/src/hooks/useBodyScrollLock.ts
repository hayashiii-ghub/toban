import { toValue, watchPostEffect, type MaybeRefOrGetter } from "vue";

export function useBodyScrollLock(isLocked: MaybeRefOrGetter<boolean>) {
  watchPostEffect(onCleanup => {
    if (toValue(isLocked)) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      onCleanup(() => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      });
    }
  });
}
