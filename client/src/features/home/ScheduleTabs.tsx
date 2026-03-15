import { GripVertical, Plus } from "lucide-react";
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
}: ScheduleTabsProps) {
  return (
    <div className="px-3 sm:px-4 pb-2 rotation-no-print" data-onboarding="step-1">
      <div className="max-w-4xl mx-auto">
        <nav aria-label="当番表の切り替え">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist">
            {schedules.map((schedule) => (
              <button
                key={schedule.id}
                role="tab"
                aria-selected={schedule.id === activeScheduleId}
                aria-label={`${schedule.name}タブ`}
                draggable
                onDragStart={(event) => onDragStart(event, schedule.id)}
                onDragOver={(event) => onDragOver(event, schedule.id)}
                onDrop={(event) => onDrop(event, schedule.id)}
                onDragEnd={onDragEnd}
                onClick={() => onSelectSchedule(schedule.id)}
                className={`brutal-border shrink-0 px-3 py-1.5 text-sm font-bold transition-all duration-150 flex items-center gap-1.5 ${
                  schedule.id === activeScheduleId
                    ? "brutal-shadow-sm"
                    : "opacity-70 hover:opacity-100"
                } ${
                  dragOverTabId === schedule.id && draggedTabId !== schedule.id
                    ? "ring-2 ring-yellow-400 ring-offset-1"
                    : ""
                } ${
                  draggedTabId === schedule.id ? "opacity-50" : ""
                }`}
                style={{
                  backgroundColor: schedule.id === activeScheduleId ? "#FBBF24" : "#fff",
                  borderRadius: "8px",
                  cursor: "grab",
                }}
              >
                <GripVertical className="w-3 h-3 opacity-40 shrink-0" aria-hidden="true" />
                <span className="max-w-[150px] truncate">{schedule.name}</span>
              </button>
            ))}
            <button
              onClick={onAddSchedule}
              className="brutal-border shrink-0 self-stretch px-2.5 text-sm font-bold transition-all duration-150 hover:bg-gray-100 flex items-center"
              style={{ borderRadius: "8px", backgroundColor: "#fff" }}
              aria-label="新しい当番表を追加"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
