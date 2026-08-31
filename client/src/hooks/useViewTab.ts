import { startTransition, useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { type ViewTabValue, isViewTab } from "@/features/home/viewTabsConfig";
import { safeGetItem, safeSetItem } from "@/lib/storage";

const VIEW_TAB_KEY = "toban-view-tab";

export function useViewTab() {
  const [viewTab, setViewTab] = useState<ViewTabValue>(() => {
    // /junban など SEO ページからの ?view=disc 着地を優先（localStorage より上位）。
    const viewParam = new URLSearchParams(window.location.search).get("view");
    if (isViewTab(viewParam)) return viewParam;
    const saved = safeGetItem(VIEW_TAB_KEY);
    if (isViewTab(saved)) return saved;
    return "cards";
  });

  // Display state only: never stored in a roster or synced to its public link.
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  const changeTab = useCallback((tab: ViewTabValue) => {
    startTransition(() => setViewTab(tab));
    safeSetItem(VIEW_TAB_KEY, tab);
  }, []);

  // Native browser tools can request print immediately after this operation.
  // Commit the view before returning to that imperative caller.
  const changeTabForTool = useCallback(
    (tab: ViewTabValue, month?: string): boolean => {
      flushSync(() => {
        setViewTab(tab);
        if (tab === "calendar" && month) setCalendarMonth(month);
      });
      return safeSetItem(VIEW_TAB_KEY, tab);
    },
    []
  );

  return {
    viewTab,
    changeTab,
    changeTabForTool,
    calendarMonth,
    setCalendarMonth,
  };
}
