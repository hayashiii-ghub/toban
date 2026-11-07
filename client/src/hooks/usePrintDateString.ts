import { computed } from "vue";
import { useDateLocale } from "@/i18n";
import { useLocalToday } from "@/hooks/useLocalToday";
export function usePrintDateString() {
  const dateLocale = useDateLocale();
  const today = useLocalToday();
  return computed(() =>
    today.value.toLocaleDateString(dateLocale.value, {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    })
  );
}
