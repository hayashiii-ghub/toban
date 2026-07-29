import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]:not([disabled]):not([hidden])",
  "button:not([disabled]):not([hidden])",
  "input:not([disabled]):not([hidden])",
  "textarea:not([disabled]):not([hidden])",
  "select:not([disabled]):not([hidden])",
  '[tabindex]:not([tabindex="-1"]):not([disabled]):not([hidden])',
].join(", ");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
  return elements.filter(
    el =>
      el.offsetParent !== null &&
      !el.closest("[hidden]") &&
      !el.closest('[aria-hidden="true"]')
  );
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  isActive: boolean
): void {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const container = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first focusable element
    const focusFirst = () => {
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        // If no focusable elements, make the container focusable
        container.setAttribute("tabindex", "-1");
        container.focus();
      }
    };

    // Small delay to let animations/rendering complete
    const timeoutId = setTimeout(focusFirst, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (
          document.activeElement === first ||
          !container.contains(document.activeElement)
        ) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (
          document.activeElement === last ||
          !container.contains(document.activeElement)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to previously focused element
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [ref, isActive]);
}
