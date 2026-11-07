import { nextTick, reactive, shallowRef } from "vue";
import { type ViewTabValue, isViewTab } from "@/features/home/viewTabsConfig";
import { safeGetItem, safeSetItem } from "@/lib/storage";

const VIEW_TAB_KEY = "toban-view-tab";
export function useViewTab() {
  const viewParam = new URLSearchParams(window.location.search).get("view");
  const saved = safeGetItem(VIEW_TAB_KEY);
  const viewTab = shallowRef<ViewTabValue>(
    isViewTab(viewParam) ? viewParam : isViewTab(saved) ? saved : "cards"
  );
  const today = new Date();
  // Display state only: never stored in a roster or synced to its public link.
  const calendarMonth = shallowRef(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );
  const setCalendarMonth = (month: string) => {
    calendarMonth.value = month;
  };
  const changeTab = (tab: ViewTabValue) => {
    viewTab.value = tab;
    safeSetItem(VIEW_TAB_KEY, tab);
  };
  async function changeTabForTool(
    tab: ViewTabValue,
    month?: string
  ): Promise<boolean> {
    viewTab.value = tab;
    if (tab === "calendar" && month) calendarMonth.value = month;
    const persisted = safeSetItem(VIEW_TAB_KEY, tab);
    // A following native print request must see the committed view and month.
    await nextTick();
    return persisted;
  }
  return reactive({
    viewTab,
    changeTab,
    changeTabForTool,
    calendarMonth,
    setCalendarMonth,
  });
}
