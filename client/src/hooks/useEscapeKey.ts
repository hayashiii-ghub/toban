import { onMounted, onScopeDispose } from "vue";
export function useEscapeKey(onEscape: () => void) {
  const handler = (event: KeyboardEvent) => {
    if (event.key === "Escape") onEscape();
  };
  onMounted(() => document.addEventListener("keydown", handler));
  onScopeDispose(() => document.removeEventListener("keydown", handler));
}
