import {
  computed,
  onMounted,
  onScopeDispose,
  shallowRef,
  type ComputedRef,
} from "vue";
import { formatIsoDateLocal, parseIsoDateLocal } from "@/rotation/dateUtils";

const listeners = new Set<() => void>();
let midnightTimer: number | undefined;

function getDay() {
  return formatIsoDateLocal(new Date());
}

function scheduleMidnight() {
  window.clearTimeout(midnightTimer);
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  midnightTimer = window.setTimeout(refresh, next.getTime() - now.getTime());
}

function refresh() {
  scheduleMidnight();
  listeners.forEach(listener => listener());
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") refresh();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    scheduleMidnight();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refresh);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearTimeout(midnightTimer);
      midnightTimer = undefined;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", refresh);
    }
  };
}

/** 深夜と画面復帰で更新する、端末の今日。複数の表示で同じ日付を使う。 */
export function useLocalToday(): ComputedRef<Date> {
  const day = shallowRef(getDay());
  let unsubscribe: (() => void) | undefined;
  onMounted(() => {
    day.value = getDay();
    unsubscribe = subscribe(() => {
      day.value = getDay();
    });
  });
  onScopeDispose(() => unsubscribe?.());
  return computed(() => parseIsoDateLocal(day.value)!);
}
