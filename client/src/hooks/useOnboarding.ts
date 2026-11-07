import {
  onMounted,
  onScopeDispose,
  reactive,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import { ONBOARDING_STORAGE_KEY } from "@/rotation/constants";
import { safeGetItem, safeSetItem } from "@/lib/storage";

export function useOnboarding(deps: {
  hasSchedule: MaybeRefOrGetter<boolean>;
  isModalOpen: MaybeRefOrGetter<boolean>;
  isShareOpen: MaybeRefOrGetter<boolean>;
}) {
  const showOnboarding = shallowRef(false);
  let timer: number | undefined;
  function update() {
    window.clearTimeout(timer);
    if (
      safeGetItem(ONBOARDING_STORAGE_KEY) === "true" ||
      toValue(deps.isModalOpen) ||
      toValue(deps.isShareOpen) ||
      !toValue(deps.hasSchedule)
    )
      return;
    timer = window.setTimeout(() => {
      showOnboarding.value = true;
    }, 800);
  }
  watch(
    () => [
      toValue(deps.hasSchedule),
      toValue(deps.isModalOpen),
      toValue(deps.isShareOpen),
    ],
    update,
    { flush: "sync" }
  );
  onMounted(update);
  onScopeDispose(() => window.clearTimeout(timer));
  function handleOnboardingComplete() {
    showOnboarding.value = false;
    safeSetItem(ONBOARDING_STORAGE_KEY, "true");
  }
  return reactive({ showOnboarding, handleOnboardingComplete });
}
