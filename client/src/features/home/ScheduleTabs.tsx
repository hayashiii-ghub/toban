import { GripVertical, Plus, ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { useRef, useState, useEffect, useMemo } from "react";
import type { DragEvent } from "react";
import type { Schedule } from "@/rotation/types";

interface ScheduleTabsProps {
  schedules: Schedule[];
  activeScheduleId: string;
  draggedTabId: string | null;
  dragOverTabId: string | null;
  onSelectSchedule: (scheduleId: string) => void;
  onAddSchedule: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>, scheduleId: string) => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>, scheduleId: string) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>, scheduleId: string) => void;
  onDragEnd: () => void;
  onReorderTab: (scheduleId: string, direction: "left" | "right") => void;
}

export function ScheduleTabs({
  schedules,
  activeScheduleId,
  draggedTabId,
  dragOverTabId,
  onSelectSchedule,
  onAddSchedule,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onReorderTab,
}: ScheduleTabsProps) {
  const sortedSchedules = useMemo(() => {
    const pinned = schedules.filter((s) => s.pinned);
    const unpinned = schedules.filter((s) => !s.pinned);
    return [...pinned, ...unpinned];
  }, [schedules]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [schedules.length]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -120 : 120, behavior: "smooth" });
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, scheduleId: string, index: number) => {
    const tabs = scrollRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (!tabs) return;

    switch (e.key) {
      case "ArrowRight": {
        e.preventDefault();
        if (e.altKey) {
          const schedule = sortedSchedules[index];
          if (!schedule?.pinned) onReorderTab(scheduleId, "right");
        } else {
          const next = tabs[index + 1];
          if (next) next.focus();
        }
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        if (e.altKey) {
          const schedule = sortedSchedules[index];
          if (!schedule?.pinned) onReorderTab(scheduleId, "left");
        } else {
          const prev = tabs[index - 1];
          if (prev) prev.focus();
        }
        break;
      }
      case "Home": {
        e.preventDefault();
        tabs[0]?.focus();
        break;
      }
      case "End": {
        e.preventDefault();
        tabs[tabs.length - 1]?.focus();
        break;
      }
    }
  };

  return (
    <div className="px-3 sm:px-4 pt-2 pb-1 rotation-no-print" data-onboarding="schedule-tabs">
      <div className="max-w-4xl mx-auto">
        <nav aria-label="当番表の切り替え">
          <div className="relative flex items-center">
            {canScrollLeft && (
              <button
                onClick={() => scroll("left")}
                className="absolute left-0 z-10 w-7 h-7 flex items-center justify-center rounded-full sm:hidden"
                style={{ backgroundColor: "color-mix(in srgb, var(--dt-page-bg) 90%, transparent)", boxShadow: "2px 0 8px rgba(0,0,0,0.1)" }}
                aria-label="左にスクロール"
              >
                <ChevronLeft className="w-4 h-4" style={{ color: "var(--dt-text-secondary)" }} />
              </button>
            )}
            <div
              ref={scrollRef}
              role="tablist"
              aria-label="当番表タブ一覧（Alt+矢印キーで並び替え）"
              className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
            >
              {sortedSchedules.map((schedule, index) => (
                <button
                  key={schedule.id}
                  role="tab"
                  aria-label={`${schedule.name}タブ${schedule.pinned ? "（ピン留め）" : ""}${!schedule.pinned ? "（Alt+矢印キーで並び替え）" : ""}`}
                  aria-selected={schedule.id === activeScheduleId}
                  tabIndex={schedule.id === activeScheduleId ? 0 : -1}
                  draggable={!schedule.pinned}
                  onDragStart={(event) => onDragStart(event, schedule.id)}
                  onDragOver={(event) => onDragOver(event, schedule.id)}
                  onDrop={(event) => onDrop(event, schedule.id)}
                  onDragEnd={onDragEnd}
                  onKeyDown={(e) => handleTabKeyDown(e, schedule.id, index)}
                  onClick={() => onSelectSchedule(schedule.id)}
                  className={`theme-border shrink-0 px-3 sm:px-4 py-2 text-sm font-bold transition-all duration-150 flex items-center gap-1 sm:gap-1.5 ${
                    schedule.id === activeScheduleId
                      ? "theme-shadow-sm"
                      : "opacity-70 hover:opacity-100"
                  } ${
                    dragOverTabId === schedule.id && draggedTabId !== schedule.id
                      ? "ring-2 ring-offset-1"
                      : ""
                  } ${
                    draggedTabId === schedule.id ? "opacity-50" : ""
                  }`}
                  style={{
                    backgroundColor: schedule.id === activeScheduleId ? "var(--dt-tab-active-bg)" : "var(--dt-tab-inactive-bg)",
                    color: schedule.id === activeScheduleId ? "var(--dt-tab-active-text)" : "var(--dt-tab-inactive-text)",
                    borderRadius: "var(--dt-border-radius-sm)",
                    cursor: schedule.pinned ? "pointer" : "grab",
                    ...(dragOverTabId === schedule.id && draggedTabId !== schedule.id ? { "--tw-ring-color": "var(--dt-current-highlight)" } as React.CSSProperties : {}),
                  }}
                >
                  {schedule.pinned ? (
                    <Pin className="w-3 h-3 shrink-0 opacity-60" aria-hidden="true" />
                  ) : (
                    <GripVertical className="w-3 h-3 opacity-40 shrink-0 hidden sm:block" aria-hidden="true" />
                  )}
                  <span className="max-w-[80px] sm:max-w-[150px] md:max-w-[200px] truncate">{schedule.name}</span>
                </button>
              ))}
              <button
                onClick={onAddSchedule}
                className="theme-border shrink-0 self-stretch px-2.5 text-sm font-bold transition-all duration-150 hover:bg-gray-100 flex items-center"
                style={{ borderRadius: "var(--dt-border-radius-sm)", backgroundColor: "var(--dt-button-bg)" }}
                aria-label="新しい当番表を追加"
                data-onboarding="add-button"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            {canScrollRight && (
              <button
                onClick={() => scroll("right")}
                className="absolute right-0 z-10 w-7 h-7 flex items-center justify-center rounded-full sm:hidden"
                style={{ backgroundColor: "color-mix(in srgb, var(--dt-page-bg) 90%, transparent)", boxShadow: "-2px 0 8px rgba(0,0,0,0.1)" }}
                aria-label="右にスクロール"
              >
                <ChevronRight className="w-4 h-4" style={{ color: "var(--dt-text-secondary)" }} />
              </button>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
