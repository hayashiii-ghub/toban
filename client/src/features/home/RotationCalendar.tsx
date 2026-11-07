import { computed, ref, watch } from "vue";
import { defineView } from "@/lib/vue";
import { motion as m, AnimatePresence } from "motion-v";
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
import { formatIsoDateLocal, parseIsoDateLocal } from "@/rotation/dateUtils";
import { formatTaskNames } from "@/rotation/taskFormatting";
import { TaskLegend } from "@/features/home/TaskLegend";
import { useLocalToday } from "@/hooks/useLocalToday";

interface RotationCalendarProps {
  groups: TaskGroup[];
  members: Member[];
  rotation: number;
  rotationConfig?: RotationConfig;
  assignmentMode?: AssignmentMode;
  month?: string;
  onMonthChange?: (month: string) => void;
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

const COMPACT_ENGLISH_HOLIDAYS: Record<string, string> = {
  "New Year's Day": "New Year",
  "Coming of Age Day": "Coming of Age",
  "National Foundation Day": "Foundation",
  "Emperor's Birthday": "Emperor's Day",
  "Vernal Equinox Day": "Vernal Eq.",
  "Showa Day": "Showa Day",
  "Constitution Memorial Day": "Constitution",
  "Greenery Day": "Greenery Day",
  "Children's Day": "Children's",
  "Marine Day": "Marine Day",
  "Mountain Day": "Mtn. Day",
  "Respect for the Aged Day": "Seniors",
  "Autumnal Equinox Day": "Aut. Eq.",
  "Sports Day": "Sports Day",
  "Culture Day": "Culture Day",
  "Labor Thanksgiving Day": "Thanksgiving",
  "Substitute Holiday": "Substitute",
  "National Holiday": "Holiday",
  "Health and Sports Day": "Health & Sports",
  "State Funeral of Emperor Showa": "State Funeral",
  "Enthronement Ceremony": "Enthronement",
  "Imperial Wedding Ceremony": "Imperial Wedding",
  "Emperor's Accession Day": "Accession Day",
};

const HOLIDAY_COLOR = "#EF4444";
const SATURDAY_COLOR = "#3B82F6";

/** 日曜・祝日は赤、土曜は青。平日は undefined（呼び出し側の既定色を使う） */
function weekendColor(dow: number, isHoliday = false): string | undefined {
  if (isHoliday || dow === 0) return HOLIDAY_COLOR;
  if (dow === 6) return SATURDAY_COLOR;
  return undefined;
}

function HolidayLabel({ name, locale }: { name: string; locale: "ja" | "en" }) {
  if (locale === "ja") {
    return (
      <span
        class="text-[8px] sm:text-[10px] leading-tight truncate"
        style={{ color: HOLIDAY_COLOR }}
        title={name}
      >
        {name}
      </span>
    );
  }

  return (
    <span
      class="text-[8px] sm:text-[10px] leading-tight w-full overflow-hidden whitespace-normal [overflow-wrap:normal] [word-break:normal]"
      style={{ color: HOLIDAY_COLOR }}
      title={name}
    >
      <span class="sr-only">{name}</span>
      <span
        class="sm:hidden block max-w-full truncate whitespace-nowrap"
        aria-hidden="true"
      >
        {COMPACT_ENGLISH_HOLIDAYS[name] ?? name}
      </span>
      <span class="hidden sm:inline" aria-hidden="true">
        {name}
      </span>
    </span>
  );
}

/** セル上端の日付と祝日名。押せるセルと押せないセルで共通 */
function DayNumber({
  date,
  dow,
  isToday,
  holidayName,
  locale,
}: {
  date: Date;
  dow: number;
  isToday: boolean | null;
  holidayName: string | undefined;
  locale: "ja" | "en";
}) {
  return (
    <div
      class={`flex ${locale === "en" && holidayName ? "flex-col items-start" : "items-center"} gap-0.5 mb-0.5 min-h-[16px] sm:min-h-[20px]`}
    >
      <span
        class={`text-xs sm:text-sm font-bold leading-none shrink-0 ${
          isToday
            ? "rounded-full min-w-[1rem] sm:min-w-[1.25rem] h-4 sm:h-5 flex items-center justify-center px-0.5"
            : ""
        }`}
        style={{
          color: isToday
            ? "var(--dt-card-bg)"
            : (weekendColor(dow, !!holidayName) ?? "var(--dt-text)"),
          backgroundColor: isToday ? "var(--dt-text)" : undefined,
        }}
      >
        {date.getDate()}
      </span>
      {holidayName && <HolidayLabel name={holidayName} locale={locale} />}
    </div>
  );
}

export const RotationCalendar = defineView<RotationCalendarProps>(
  [
    "groups",
    "members",
    "rotation",
    "rotationConfig",
    "assignmentMode",
    "month",
    "onMonthChange",
  ],
  props => {
    const t = useT();
    const dateLocale = useDateLocale();
    const { locale: localeRef } = useLocale();
    const todayRef = useLocalToday();
    const localViewDate = ref(
      new Date(todayRef.value.getFullYear(), todayRef.value.getMonth(), 1)
    );
    const viewDate = computed(
      () =>
        (props.month && parseIsoDateLocal(`${props.month}-01`)) ||
        localViewDate.value
    );
    const selection = ref<{ month: string; index: number } | null>(null);
    const monthKey = computed(
      () => `${viewDate.value.getFullYear()}-${viewDate.value.getMonth()}`
    );
    const selectedDayIdxRef = computed(() =>
      selection.value?.month === monthKey.value ? selection.value.index : null
    );
    const activeMembers = computed(() =>
      props.members.filter(member => !member.skipped)
    );
    const calendarDaysRef = computed(() =>
      getCalendarDays(viewDate.value.getFullYear(), viewDate.value.getMonth())
    );
    const holidayMapRef = computed(() =>
      getHolidaysForMonth(
        viewDate.value.getFullYear(),
        viewDate.value.getMonth(),
        localeRef.value
      )
    );
    const dayAssignmentsRef = computed(() =>
      calendarDaysRef.value.map(day => {
        if (!day) return null;
        const rotation =
          props.rotationConfig?.mode === "date"
            ? computeDateRotationForDate(
                props.rotationConfig,
                activeMembers.value.length,
                day
              )
            : props.rotation;
        return computeAssignments(
          props.groups,
          props.members,
          rotation,
          props.assignmentMode
        );
      })
    );
    function setViewDate(date: Date) {
      localViewDate.value = date;
      props.onMonthChange?.(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      );
    }
    function prevMonth() {
      setViewDate(
        new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
      );
      selection.value = null;
    }
    function nextMonth() {
      setViewDate(
        new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
      );
      selection.value = null;
    }
    function goToday() {
      setViewDate(
        new Date(todayRef.value.getFullYear(), todayRef.value.getMonth(), 1)
      );
      selection.value = null;
    }
    function handleDayClick(index: number) {
      selection.value =
        selection.value?.month === monthKey.value &&
        selection.value.index === index
          ? null
          : { month: monthKey.value, index };
    }
    const popoverRef = ref<HTMLElement | null>(null);
    function setPopoverElement(node: unknown) {
      popoverRef.value =
        node instanceof HTMLElement
          ? node
          : ((node as { $el?: HTMLElement } | null)?.$el ?? null);
    }
    watch(
      selectedDayIdxRef,
      (index, _, onCleanup) => {
        if (index === null) return;
        const handleClickOutside = (event: MouseEvent) => {
          if (
            popoverRef.value &&
            !popoverRef.value.contains(event.target as Node)
          )
            selection.value = null;
        };
        document.addEventListener("mousedown", handleClickOutside);
        onCleanup(() =>
          document.removeEventListener("mousedown", handleClickOutside)
        );
      },
      { flush: "post" }
    );

    return () => {
      const { groups, rotationConfig } = props;
      const locale = localeRef.value;
      const today = todayRef.value;
      const year = viewDate.value.getFullYear();
      const month = viewDate.value.getMonth();
      const selectedDayIdx = selectedDayIdxRef.value;
      const monthLabel = new Date(year, month, 1).toLocaleDateString(
        dateLocale.value,
        { year: "numeric", month: "long" }
      );
      const isDateMode = rotationConfig?.mode === "date";
      const startDate = rotationConfig?.startDate
        ? parseIsoDateLocal(rotationConfig.startDate)
        : null;
      const weekdayLabels = [
        t("cal.wd0"),
        t("cal.wd1"),
        t("cal.wd2"),
        t("cal.wd3"),
        t("cal.wd4"),
        t("cal.wd5"),
        t("cal.wd6"),
      ];
      const calendarDays = calendarDaysRef.value;
      const holidayMap = holidayMapRef.value;
      const dayAssignments = dayAssignmentsRef.value;
      return (
        <div class="px-3 sm:px-4 py-3 sm:py-4 pb-8 sm:pb-12 rotation-print-calendar-section">
          <div class="max-w-4xl mx-auto">
            <m.div
              class="theme-border theme-shadow-sm theme-surface p-3 sm:p-5 rotation-print-card"
              style={{
                borderRadius: "var(--dt-border-radius)",
              }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.25 }}
            >
              {/* Header */}
              <div class="flex items-center justify-between mb-3 sm:mb-4">
                <h2
                  class="text-sm tracking-wider uppercase"
                  style={{
                    color: "var(--dt-text-secondary)",
                    fontWeight: "var(--dt-font-weight-extra)",
                  }}
                >
                  {t("view.calendar")}
                </h2>
                {!isDateMode && (
                  <span
                    class="text-xs font-bold px-2 py-1 rounded-md rotation-no-print"
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
              <div class="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  class="theme-border px-3 py-1.5 font-bold text-sm theme-hover-lift transition-all duration-150 rotation-no-print"
                  style={{
                    backgroundColor: "var(--dt-button-bg)",
                    borderRadius: "var(--dt-border-radius-sm)",
                  }}
                >
                  ◀
                </button>
                <div class="flex items-center gap-2">
                  <span
                    class="text-base sm:text-lg"
                    style={{
                      color: "var(--dt-text)",
                      fontWeight: "var(--dt-font-weight-extra)",
                    }}
                  >
                    {monthLabel}
                  </span>
                  {(year !== today.getFullYear() ||
                    month !== today.getMonth()) && (
                    <button
                      type="button"
                      onClick={goToday}
                      class="theme-border px-2 py-1 font-bold text-xs theme-hover-lift transition-all duration-150 rotation-no-print"
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
                  class="theme-border px-3 py-1.5 font-bold text-sm theme-hover-lift transition-all duration-150 rotation-no-print"
                  style={{
                    backgroundColor: "var(--dt-button-bg)",
                    borderRadius: "var(--dt-border-radius-sm)",
                  }}
                >
                  ▶
                </button>
              </div>

              {/* Weekday headers */}
              <div class="grid grid-cols-7 mb-1">
                {weekdayLabels.map((label, i) => (
                  <div
                    key={label}
                    class="text-center py-1.5 text-xs"
                    style={{
                      color: weekendColor(i) ?? "var(--dt-text-secondary)",
                      fontWeight: "var(--dt-font-weight-extra)",
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div
                class="grid grid-cols-7"
                style={{ border: `1px solid var(--dt-table-border-strong)` }}
              >
                {calendarDays.map((day, idx) => {
                  const isToday = day && isSameDay(day, today);
                  const dow = idx % 7;
                  const assignments = dayAssignments[idx];
                  const holidayName = day
                    ? holidayMap.get(day.getDate())
                    : undefined;

                  // 開始日より前は、まだ当番が始まっていないので休みの日と同じく空ける
                  const isSkipped = !!(
                    day &&
                    isDateMode &&
                    ((rotationConfig?.skipSaturday && dow === 6) ||
                      (rotationConfig?.skipSunday && dow === 0) ||
                      (rotationConfig?.skipHolidays && holidayName) ||
                      (startDate && day < startDate))
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
                  const cellKey = day
                    ? formatIsoDateLocal(day)
                    : `empty-${idx}`;
                  const onKeydown = (e: KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleDayClick(idx);
                    }
                  };
                  return interactive ? (
                    <div
                      key={cellKey}
                      class="min-h-[68px] sm:min-h-[84px] p-1 sm:p-1.5 flex flex-col relative cursor-pointer"
                      style={cellStyle}
                      role="button"
                      tabindex={0}
                      aria-pressed={isSelected}
                      onClick={() => handleDayClick(idx)}
                      onKeydown={onKeydown}
                    >
                      {day && (
                        <>
                          <DayNumber
                            date={day}
                            dow={dow}
                            isToday={isToday}
                            holidayName={holidayName}
                            locale={locale}
                          />
                          {!isSkipped && assignments && (
                            <div class="flex flex-col gap-px flex-1 overflow-hidden">
                              {assignments.map(({ group, member }) => (
                                <div
                                  key={group.id}
                                  class="text-[11px] sm:text-xs leading-tight font-bold truncate rounded px-0.5"
                                  style={{
                                    backgroundColor: member.bgColor,
                                    color: member.textColor,
                                  }}
                                  title={`${group.emoji} ${formatTaskNames(group.tasks, locale)}${locale === "en" ? ": " : "："}${member.name}`}
                                >
                                  <span class="hidden sm:inline">
                                    {group.emoji} {member.name}
                                  </span>
                                  {/* スマホは 1 マスが狭いので頭文字だけ。日付を押すと詳しく出る */}
                                  <span class="sm:hidden" aria-hidden="true">
                                    {Array.from(member.name)[0]}
                                  </span>
                                  <span class="sr-only sm:hidden">
                                    {member.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Day detail popover */}
                          <AnimatePresence>
                            {isSelected && !isSkipped && assignments && (
                              <m.div
                                ref={setPopoverElement}
                                class="rotation-no-print absolute z-20 theme-border theme-shadow-sm p-2.5 min-w-[min(160px,80vw)]"
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
                                  class="text-xs mb-1.5"
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
                                    <span style={{ color: HOLIDAY_COLOR }}>
                                      {" "}
                                      {holidayName}
                                    </span>
                                  )}
                                </div>
                                <div class="flex flex-col gap-1">
                                  {assignments.map(({ group, member }) => (
                                    <div
                                      key={group.id}
                                      class="flex items-center gap-1.5"
                                    >
                                      <span
                                        class="text-xs font-bold px-1.5 py-0.5 rounded"
                                        style={{
                                          backgroundColor: member.bgColor,
                                          color: member.textColor,
                                        }}
                                      >
                                        {member.name}
                                      </span>
                                      <span
                                        class="text-xs"
                                        style={{
                                          color: "var(--dt-text-secondary)",
                                        }}
                                      >
                                        {group.emoji}{" "}
                                        {formatTaskNames(group.tasks, locale)}
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
                      class="min-h-[68px] sm:min-h-[84px] p-1 sm:p-1.5 flex flex-col relative"
                      style={cellStyle}
                    >
                      {day && (
                        <DayNumber
                          date={day}
                          dow={dow}
                          isToday={isToday}
                          holidayName={holidayName}
                          locale={locale}
                        />
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
    };
  }
);
