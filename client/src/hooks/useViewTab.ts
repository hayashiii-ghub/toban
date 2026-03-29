import { startTransition, useCallback, useState } from "react";
import type { ViewTabValue } from "@/features/home/ViewTabs";
import { safeGetItem, safeSetItem } from "@/lib/storage";

const VIEW_TAB_KEY = "toban-view-tab";

export function useViewTab() {
  const [viewTab, setViewTab] = useState<ViewTabValue>(() => {
    const saved = safeGetItem(VIEW_TAB_KEY);
    if (saved === "cards" || saved === "table" || saved === "calendar") return saved;
    return "cards";
  });

  const changeTab = useCallback((tab: ViewTabValue) => {
    startTransition(() => setViewTab(tab));
    safeSetItem(VIEW_TAB_KEY, tab);
  }, []);

  return { viewTab, changeTab };
}
