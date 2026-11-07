import { GripVertical, Plus, Pin } from "@lucide/vue";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { defineView, type ElementEvent } from "@/lib/vue";
import type { Schedule } from "@/rotation/types";
import { useT } from "@/i18n";
import { usePointerDrag } from "@/hooks/usePointerDrag";
import { TabMenu, type TabMenuTarget } from "./TabMenu";

// 長押しとみなす時間と、指がこれ以上動いたら長押しをやめる距離（px）
const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP = 10;

interface ScheduleTabsProps {
  schedules: Schedule[];
  activeScheduleId: string;
  onSelectSchedule: (scheduleId: string) => void;
  onAddSchedule: () => void;
  /** タブを動かして、別のタブの上で離したとき（その位置へ移す） */
  onMoveTab: (draggedId: string, targetId: string) => void;
  onReorderTab: (scheduleId: string, direction: "left" | "right") => void;
  onTogglePin: (scheduleId: string) => void;
  /** 選んでいる当番表を複製する（メニューを開くときにそのタブを選ぶ） */
  onDuplicate: () => void;
  onRequestDelete: (scheduleId: string) => void;
}

export const ScheduleTabs = defineView<ScheduleTabsProps>(
  [
    "schedules",
    "activeScheduleId",
    "onSelectSchedule",
    "onAddSchedule",
    "onMoveTab",
    "onReorderTab",
    "onTogglePin",
    "onDuplicate",
    "onRequestDelete",
  ],
  props => {
    const t = useT();
    const sortedSchedulesRef = computed(() => [
      ...props.schedules.filter(schedule => schedule.pinned),
      ...props.schedules.filter(schedule => !schedule.pinned),
    ]);
    const tabRefs = new Map<string, HTMLButtonElement>();
    const menuRef = shallowRef<TabMenuTarget | null>(null);
    let longPress: { timer: number; x: number; y: number } | null = null;
    const dropTabIdRef = ref<string | null>(null);
    const drag = usePointerDrag<string>(() => ({
      axis: "x",
      holdDelay: LONG_PRESS_MS,
      target: () => "[data-drop-tab]",
      onStart: () => {
        menuRef.value = null;
      },
      onOver: (_, element) => {
        dropTabIdRef.value =
          (element as HTMLElement | null)?.dataset.dropTab ?? null;
      },
      onDrop: (id, element) => {
        const targetId = (element as HTMLElement).dataset.dropTab;
        if (targetId && targetId !== id) props.onMoveTab(id, targetId);
      },
      onEnd: () => {
        dropTabIdRef.value = null;
      },
    }));
    function cancelLongPress() {
      if (!longPress) return;
      window.clearTimeout(longPress.timer);
      longPress = null;
    }
    onBeforeUnmount(cancelLongPress);
    function openMenu(index: number) {
      const sorted = sortedSchedulesRef.value;
      const schedule = sorted[index];
      const element = schedule && tabRefs.get(schedule.id);
      if (!schedule || !element) return;
      props.onSelectSchedule(schedule.id);
      const previous = sorted[index - 1];
      const next = sorted[index + 1];
      menuRef.value = {
        scheduleId: schedule.id,
        name: schedule.name,
        pinned: !!schedule.pinned,
        anchor: element.getBoundingClientRect(),
        canMoveLeft: !schedule.pinned && !!previous && !previous.pinned,
        canMoveRight: !schedule.pinned && !!next,
        canDelete: props.schedules.length > 1,
      };
    }
    function closeMenu(restoreFocus: boolean) {
      const id = menuRef.value?.scheduleId;
      menuRef.value = null;
      if (restoreFocus && id) tabRefs.get(id)?.focus();
    }
    function dismissMenu() {
      const id = menuRef.value?.scheduleId;
      menuRef.value = null;
      if (id) tabRefs.get(id)?.focus();
    }
    function handlePointerDown(event: PointerEvent, index: number) {
      if (event.pointerType === "mouse") return;
      cancelLongPress();
      longPress = {
        x: event.clientX,
        y: event.clientY,
        timer: window.setTimeout(() => {
          longPress = null;
          openMenu(index);
        }, LONG_PRESS_MS),
      };
    }
    function handlePointerMove(event: PointerEvent) {
      if (
        longPress &&
        Math.hypot(event.clientX - longPress.x, event.clientY - longPress.y) >
          LONG_PRESS_SLOP
      )
        cancelLongPress();
    }
    const scrollRef = ref<HTMLDivElement | null>(null);
    // ブラウザが横スクロールを始める前から、長押し後の指の移動を抑える。
    watch(
      scrollRef,
      (element, _, onCleanup) => {
        if (!element) return;
        const onTouchMove = (event: TouchEvent) => {
          if (drag.holdsPointer()) event.preventDefault();
        };
        element.addEventListener("touchmove", onTouchMove, { passive: false });
        onCleanup(() => element.removeEventListener("touchmove", onTouchMove));
      },
      { flush: "post" }
    );
    const canScrollLeftRef = ref(false);
    const canScrollRightRef = ref(false);
    function checkScroll() {
      const element = scrollRef.value;
      if (!element) return;
      canScrollLeftRef.value = element.scrollLeft > 0;
      canScrollRightRef.value =
        element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
    }
    watch(
      [scrollRef, () => props.schedules.length],
      ([element], _, onCleanup) => {
        checkScroll();
        if (!element) return;
        element.addEventListener("scroll", checkScroll, { passive: true });
        const observer = new ResizeObserver(checkScroll);
        observer.observe(element);
        onCleanup(() => {
          element.removeEventListener("scroll", checkScroll);
          observer.disconnect();
        });
      },
      { flush: "post", immediate: true }
    );
    function handleTabKeyDown(
      event: KeyboardEvent,
      scheduleId: string,
      index: number
    ) {
      const tabs =
        scrollRef.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      if (!tabs) return;
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          if (event.altKey) {
            if (!sortedSchedulesRef.value[index]?.pinned)
              props.onReorderTab(scheduleId, "right");
          } else tabs[index + 1]?.focus();
          break;
        case "ArrowLeft":
          event.preventDefault();
          if (event.altKey) {
            if (!sortedSchedulesRef.value[index]?.pinned)
              props.onReorderTab(scheduleId, "left");
          } else tabs[index - 1]?.focus();
          break;
        case "ContextMenu":
          event.preventDefault();
          openMenu(index);
          break;
        case "F10":
          if (event.shiftKey) {
            event.preventDefault();
            openMenu(index);
          }
          break;
        case "Home":
          event.preventDefault();
          tabs[0]?.focus();
          break;
        case "End":
          event.preventDefault();
          tabs[tabs.length - 1]?.focus();
          break;
      }
    }
    return () => {
      const {
        activeScheduleId,
        onSelectSchedule,
        onAddSchedule,
        onReorderTab,
        onTogglePin,
        onDuplicate,
        onRequestDelete,
      } = props;
      const sortedSchedules = sortedSchedulesRef.value;
      const menu = menuRef.value;
      const dropTabId = dropTabIdRef.value;
      const canScrollLeft = canScrollLeftRef.value;
      const canScrollRight = canScrollRightRef.value;
      return (
        <div
          class="px-3 sm:px-4 pt-2 pb-1 rotation-no-print"
          data-onboarding="schedule-tabs"
        >
          <div class="max-w-4xl mx-auto">
            <nav aria-label={t("tabs.navAria")}>
              <div class="relative flex items-center">
                <div
                  ref={scrollRef}
                  role="tablist"
                  aria-label={t("tabs.tablistAria")}
                  class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
                  // 続きがある側の端を薄くして、タブが途中で切れて見えないようにする
                  style={{
                    maskImage: `linear-gradient(to right, ${canScrollLeft ? "transparent" : "#000"}, #000 1.5rem, #000 calc(100% - 1.5rem), ${canScrollRight ? "transparent" : "#000"})`,
                  }}
                >
                  {sortedSchedules.map((schedule, index) => (
                    <button
                      type="button"
                      key={schedule.id}
                      role="tab"
                      aria-label={
                        t("tabs.tabAria", { name: schedule.name }) +
                        (schedule.pinned
                          ? t("tabs.pinnedSuffix")
                          : t("tabs.reorderSuffix"))
                      }
                      aria-selected={schedule.id === activeScheduleId}
                      aria-haspopup="menu"
                      tabindex={schedule.id === activeScheduleId ? 0 : -1}
                      ref={el => {
                        if (el instanceof HTMLButtonElement)
                          tabRefs.set(schedule.id, el);
                        else tabRefs.delete(schedule.id);
                      }}
                      data-drag-item
                      data-drop-tab={schedule.id}
                      onKeydown={e => handleTabKeyDown(e, schedule.id, index)}
                      onClick={() => onSelectSchedule(schedule.id)}
                      onDblclick={() => openMenu(index)}
                      onContextmenu={e => {
                        e.preventDefault();
                        cancelLongPress();
                        openMenu(index);
                      }}
                      onPointerdown={e => {
                        handlePointerDown(e, index);
                        // ピン留めしたタブは動かさない（左端にまとめて置く）
                        if (!schedule.pinned)
                          drag
                            .bind(schedule.id)
                            .onPointerdown(
                              e as ElementEvent<PointerEvent, HTMLElement>
                            );
                      }}
                      onPointermove={handlePointerMove}
                      onPointerup={cancelLongPress}
                      onPointercancel={cancelLongPress}
                      onPointerleave={cancelLongPress}
                      class={`theme-border shrink-0 px-3 sm:px-4 py-2 text-sm font-bold transition-all duration-150 flex items-center gap-1 sm:gap-1.5 select-none [-webkit-touch-callout:none] ${
                        schedule.id === activeScheduleId
                          ? "theme-shadow-sm"
                          : ""
                      } ${dropTabId === schedule.id ? "ring-2 ring-offset-1" : ""}`}
                      style={{
                        backgroundColor:
                          schedule.id === activeScheduleId
                            ? "var(--dt-tab-active-bg)"
                            : "var(--dt-tab-inactive-bg)",
                        color:
                          schedule.id === activeScheduleId
                            ? "var(--dt-tab-active-text)"
                            : "var(--dt-tab-inactive-text)",
                        borderRadius: "var(--dt-border-radius-sm)",
                        cursor: schedule.pinned ? "pointer" : "grab",
                        ...(dropTabId === schedule.id
                          ? {
                              "--tw-ring-color": "var(--dt-focus-ring)",
                            }
                          : {}),
                      }}
                    >
                      {schedule.pinned ? (
                        <Pin
                          class="size-3 shrink-0 opacity-60"
                          aria-hidden="true"
                        />
                      ) : (
                        <GripVertical
                          class="size-3 opacity-40 shrink-0 hidden sm:block"
                          aria-hidden="true"
                        />
                      )}
                      <span class="max-w-[9rem] sm:max-w-[12rem] truncate">
                        {schedule.name}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={onAddSchedule}
                    class="theme-border shrink-0 self-stretch px-2.5 sm:px-3 gap-1 text-sm font-bold transition-all duration-150 theme-hover-lift flex items-center"
                    style={{
                      borderRadius: "var(--dt-border-radius-sm)",
                      backgroundColor: "var(--dt-button-bg)",
                    }}
                    aria-label={t("tabs.addAria")}
                  >
                    <Plus class="size-3.5" aria-hidden="true" />
                    <span class="hidden sm:inline" aria-hidden="true">
                      {t("tabs.add")}
                    </span>
                  </button>
                </div>
              </div>
            </nav>
          </div>
          {menu && (
            <TabMenu
              key={menu.scheduleId}
              target={menu}
              onTogglePin={() => {
                onTogglePin(menu.scheduleId);
                closeMenu(false);
              }}
              onMove={dir => {
                onReorderTab(menu.scheduleId, dir);
                closeMenu(false);
              }}
              onDuplicate={() => {
                onDuplicate();
                closeMenu(false);
              }}
              onDelete={() => {
                closeMenu(false);
                onRequestDelete(menu.scheduleId);
              }}
              onDismiss={dismissMenu}
            />
          )}
        </div>
      );
    };
  }
);
