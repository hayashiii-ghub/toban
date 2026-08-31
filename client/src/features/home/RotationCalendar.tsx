import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import type {
  AssignmentMode,
  Member,
  RotationConfig,
  TaskGroup,
} from "@/rotation/types";
import {
  computeAssignments,
  computeDateRotationForDate,
} from "@/rotation/utils";
import { getHolidaysForMonth } from "@/rotation/holidays";
import { useT, useDateLocale, useLocale } from "@/i18n";
import { TaskLegend } from "@/features/home/TaskLegend";

interface RotationCalendarProps {
  groups: TaskGroup[];
  members: Member[];
  rotation: number;
  rotationConfig?: RotationConfig;
  assignmentMode?: AssignmentMode;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function RotationCalendar({
  groups,
  members,
  rotation,
  rotationConfig,
  assignmentMode,
}: RotationCalendarProps) {
  const t = useT();
  const dateLocale = useDateLocale();
  const { locale } = useLocale();
  const weekdayLabels = [
    t("cal.wd0"),
    t("cal.wd1"),
    t("cal.wd2"),
    t("cal.wd3"),
    t("cal.wd4"),
    t("cal.wd5"),
    t("cal.wd6"),
  ];
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = new Date(year, month, 1).toLocaleDateString(dateLocale, {
    year: "numeric",
    month: "long",
  });
  const isDateMode = rotationConfig?.mode === "date";

  const activeMembers = useMemo(
    () => members.filter(m => !m.skipped),
    [members]
  );

  const calendarDays = useMemo(
    () => getCalendarDays(year, month),
    [year, month]
  );
  const holidayMap = useMemo(
    () => getHolidaysForMonth(year, month, locale),
    [year, month, locale]
  );

  const dayAssignments = useMemo(() => {
    return calendarDays.map(day => {
      if (!day) return null;
      const rot =
        rotationConfig?.mode === "date"
          ? computeDateRotationForDate(
              rotationConfig,
              activeMembers.length,
              day
            )
          : rotation;
      return computeAssignments(groups, members, rot, assignmentMode);
    });
  }, [
    calendarDays,
    rotation,
    rotationConfig,
    activeMembers.length,
    groups,
    members,
    assignmentMode,
  ]);

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDayIdx(null);
  };
  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDayIdx(null);
  };
  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDayIdx(null);
  };

  const handleDayClick = useCallback((idx: number) => {
    setSelectedDayIdx(prev => (prev === idx ? null : idx));
  }, []);

  useEffect(() => {
    if (selectedDayIdx === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setSelectedDayIdx(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedDayIdx]);

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 pb-8 sm:pb-12 rotation-print-calendar-section">
      <div className="max-w-4xl mx-auto">
        <m.div
          className="theme-border theme-shadow-sm theme-surface p-3 sm:p-5 rotation-print-card"
          style={{
            borderRadius: "var(--dt-border-radius)",
          }}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.25 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2
              className="text-sm tracking-wider uppercase"
              style={{
                color: "var(--dt-text-secondary)",
                fontWeight: "var(--dt-font-weight-extra)",
              }}
            >
              {t("view.calendar")}
            </h2>
            {!isDateMode && (
              <span
                className="text-xs font-bold px-2 py-1 rounded-md rotation-no-print"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--dt-current-highlight) 20%, var(--dt-card-bg))",
                  color: "var(--dt-text-secondary)",
                }}
              >
                {t("cal.manualNote")}
              </span>
            )}
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="theme-border px-3 py-1.5 font-bold text-sm theme-hover-lift transition-all duration-150 rotation-no-print"
              style={{
                backgroundColor: "var(--dt-button-bg)",
                borderRadius: "var(--dt-border-radius-sm)",
              }}
            >
              ◀
            </button>
            <div className="flex items-center gap-2">
              <span
                className="text-base sm:text-lg"
                style={{
                  color: "var(--dt-text)",
                  fontWeight: "var(--dt-font-weight-extra)",
                }}
              >
                {monthLabel}
              </span>
              {(year !== today.getFullYear() || month !== today.getMonth()) && (
                <button
                  type="button"
                  onClick={goToday}
                  className="theme-border px-2 py-1 font-bold text-xs theme-hover-lift transition-all duration-150 rotation-no-print"
                  style={{
                    backgroundColor: "var(--dt-current-highlight)",
                    borderRadius: "6px",
                  }}
                >
                  {t("cal.thisMonth")}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="theme-border px-3 py-1.5 font-bold text-sm theme-hover-lift transition-all duration-150 rotation-no-print"
              style={{
                backgroundColor: "var(--dt-button-bg)",
                borderRadius: "var(--dt-border-radius-sm)",
              }}
            >
              ▶
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekdayLabels.map((label, i) => (
              <div
                key={label}
                className="text-center py-1.5 text-xs"
                style={{
                  color:
                    i === 0
                      ? "#EF4444"
                      : i === 6
                        ? "#3B82F6"
                        : "var(--dt-text-secondary)",
                  fontWeight: "var(--dt-font-weight-extra)",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            className="grid grid-cols-7"
            style={{ border: `1px solid var(--dt-table-border-strong)` }}
          >
            {calendarDays.map((day, idx) => {
              const isToday = day && isSameDay(day, today);
              const dow = idx % 7;
              const assignments = dayAssignments[idx];
              const holidayName = day
                ? holidayMap.get(day.getDate())
                : undefined;

              const isSkipped = !!(
                day &&
                isDateMode &&
                ((rotationConfig?.skipSaturday && dow === 6) ||
                  (rotationConfig?.skipSunday && dow === 0) ||
                  (rotationConfig?.skipHolidays && holidayName))
              );
              const isSelected = selectedDayIdx === idx;
              const interactive = day && !isSkipped;
              const cellStyle = {
                borderRight: `1px solid var(--dt-table-border-light)`,
                borderBottom: `1px solid var(--dt-table-border-light)`,
                backgroundColor: !day
                  ? "color-mix(in srgb, var(--dt-page-bg) 50%, var(--dt-card-bg))"
                  : isSelected
                    ? "color-mix(in srgb, var(--dt-current-highlight) 15%, var(--dt-card-bg))"
                    : isToday
                      ? "color-mix(in srgb, var(--dt-current-highlight) 8%, var(--dt-card-bg))"
                      : "var(--dt-card-bg)",
              };
              const cellKey = day ? day.toISOString() : `empty-${idx}`;
              const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDayClick(idx);
                }
              };
              return interactive ? (
                <div
                  key={cellKey}
                  className="min-h-[68px] sm:min-h-[84px] p-1 sm:p-1.5 flex flex-col relative cursor-pointer"
                  style={cellStyle}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => handleDayClick(idx)}
                  onKeyDown={onKeyDown}
                >
                  {day && (
                    <>
                      <div
                        className={`flex ${locale === "en" && holidayName ? "flex-col items-start" : "items-center"} gap-0.5 mb-0.5 min-h-[16px] sm:min-h-[20px]`}
                      >
                        <span
                          className={`text-xs sm:text-sm font-bold leading-none shrink-0 ${
                            isToday
                              ? "rounded-full min-w-[1rem] sm:min-w-[1.25rem] h-4 sm:h-5 flex items-center justify-center px-0.5"
                              : ""
                          }`}
                          style={{
                            color: isToday
                              ? "var(--dt-card-bg)"
                              : holidayName || dow === 0
                                ? "#EF4444"
                                : dow === 6
                                  ? "#3B82F6"
                                  : "var(--dt-text)",
                            backgroundColor: isToday
                              ? "var(--dt-text)"
                              : undefined,
                          }}
                        >
                          {day.getDate()}
                        </span>
                        {holidayName && (
                          <span
                            className={
                              locale === "en"
                                ? "text-[9px] sm:text-[10px] leading-tight w-full [overflow-wrap:anywhere]"
                                : "text-[8px] sm:text-[10px] leading-tight truncate"
                            }
                            style={{ color: "#EF4444" }}
                            title={holidayName}
                          >
                            {holidayName}
                          </span>
                        )}
                      </div>
                      {!isSkipped && assignments && (
                        <div className="flex flex-col gap-px flex-1 overflow-hidden">
                          {assignments.map(({ group, member }) => (
                            <div
                              key={group.id}
                              className="text-[11px] sm:text-xs leading-tight font-bold truncate rounded px-0.5"
                              style={{
                                backgroundColor: member.bgColor,
                                color: member.textColor,
                              }}
                              title={`${group.emoji} ${group.tasks.join("・")}：${member.name}`}
                            >
                              <span className="hidden sm:inline">
                                {group.emoji}{" "}
                              </span>
                              {member.name}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Day detail popover */}
                      <AnimatePresence>
                        {isSelected && !isSkipped && assignments && (
                          <m.div
                            ref={popoverRef}
                            className="rotation-no-print absolute z-20 theme-border theme-shadow-sm p-2.5 min-w-[min(160px,80vw)]"
                            style={{
                              backgroundColor: "var(--dt-card-bg)",
                              borderRadius: "var(--dt-border-radius-sm)",
                              top: "100%",
                              left: dow >= 5 ? "auto" : "0",
                              right: dow >= 5 ? "0" : "auto",
                              marginTop: "4px",
                            }}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            onClick={e => e.stopPropagation()}
                          >
                            <div
                              className="text-xs mb-1.5"
                              style={{
                                color: "var(--dt-text)",
                                fontWeight: "var(--dt-font-weight-extra)",
                              }}
                            >
                              {t("cal.dayLabel", {
                                month: day.getMonth() + 1,
                                day: day.getDate(),
                                weekday: weekdayLabels[dow],
                              })}
                              {holidayName && (
                                <span style={{ color: "#EF4444" }}>
                                  {" "}
                                  {holidayName}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              {assignments.map(({ group, member }) => (
                                <div
                                  key={group.id}
                                  className="flex items-center gap-1.5"
                                >
                                  <span
                                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: member.bgColor,
                                      color: member.textColor,
                                    }}
                                  >
                                    {member.name}
                                  </span>
                                  <span
                                    className="text-xs"
                                    style={{
                                      color: "var(--dt-text-secondary)",
                                    }}
                                  >
                                    {group.emoji} {group.tasks.join("・")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              ) : (
                <div
                  key={cellKey}
                  className="min-h-[68px] sm:min-h-[84px] p-1 sm:p-1.5 flex flex-col relative"
                  style={cellStyle}
                >
                  {day && (
                    <div
                      className={`flex ${locale === "en" && holidayName ? "flex-col items-start" : "items-center"} gap-0.5 mb-0.5 min-h-[16px] sm:min-h-[20px]`}
                    >
                      <span
                        className={`text-xs sm:text-sm font-bold leading-none shrink-0 ${
                          isToday
                            ? "rounded-full min-w-[1rem] sm:min-w-[1.25rem] h-4 sm:h-5 flex items-center justify-center px-0.5"
                            : ""
                        }`}
                        style={{
                          color: isToday
                            ? "var(--dt-card-bg)"
                            : holidayName || dow === 0
                              ? "#EF4444"
                              : dow === 6
                                ? "#3B82F6"
                                : "var(--dt-text)",
                          backgroundColor: isToday
                            ? "var(--dt-text)"
                            : undefined,
                        }}
                      >
                        {day.getDate()}
                      </span>
                      {holidayName && (
                        <span
                          className={
                            locale === "en"
                              ? "text-[9px] sm:text-[10px] leading-tight w-full [overflow-wrap:anywhere]"
                              : "text-[8px] sm:text-[10px] leading-tight truncate"
                          }
                          style={{ color: "#EF4444" }}
                          title={holidayName}
                        >
                          {holidayName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 凡例：セルは絵文字＋担当者名だけなので、当番名のフルテキストをここで補う。 */}
          <TaskLegend groups={groups} />
        </m.div>
      </div>
    </div>
  );
}
