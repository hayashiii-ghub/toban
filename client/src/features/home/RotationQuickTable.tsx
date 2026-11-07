import { computed, ref, watch } from "vue";
import { defineView } from "@/lib/vue";
import { motion as m } from "motion-v";
import type {
  AssignmentMode,
  Member,
  RotationConfig,
  TaskGroup,
} from "@/rotation/types";
import { computeAssignments, listDateTurns } from "@/rotation/utils";
import { formatTaskNames } from "@/rotation/taskFormatting";
import { useDateLocale, useLocale, useT } from "@/i18n";
import { useLocalToday } from "@/hooks/useLocalToday";

interface RotationQuickTableProps {
  groups: TaskGroup[];
  members: Member[];
  rotation: number;
  assignmentMode?: AssignmentMode;
  /** 日付モードなら、今の順番から日付の順に並べて列見出しを日付にする */
  rotationConfig?: RotationConfig;
}

// 現在列の囲み線は「全セルに同幅の透明 border を常時確保し、現在列だけ着色」で描く。
// border の付け外しによる列幅のガタつきを防ぐための幅予約なので、透明 border は消さないこと。
// （box-shadow にしないのは印刷で描画されないブラウザがあるため。印刷品質が最重要価値）
const HIGHLIGHT_BORDER = "2.5px solid var(--dt-current-highlight)";
const RESERVED_BORDER = "2.5px solid transparent";

export const RotationQuickTable = defineView<RotationQuickTableProps>(
  ["groups", "members", "rotation", "assignmentMode", "rotationConfig"],
  props => {
    const t = useT();
    const { locale } = useLocale();
    const dateLocale = useDateLocale();
    const today = useLocalToday();
    const activeMembers = computed(() =>
      props.members.filter(member => !member.skipped)
    );
    const allColumnAssignmentsRef = computed(() =>
      activeMembers.value.map((_, index) =>
        computeAssignments(
          props.groups,
          props.members,
          index,
          props.assignmentMode
        )
      )
    );
    const dateTurns = computed(() =>
      props.rotationConfig?.mode === "date"
        ? listDateTurns(
            props.rotationConfig,
            activeMembers.value.length,
            today.value
          )
        : []
    );
    const columnsRef = computed(() => {
      const turns = dateTurns.value;
      return turns.length === activeMembers.value.length && turns.length > 0
        ? turns.map(turn => ({
            rotation: turn.rotation,
            label:
              props.rotationConfig?.cycleDays === 1
                ? turn.start.toLocaleDateString(dateLocale.value, {
                    month: "numeric",
                    day: "numeric",
                    weekday: "short",
                  })
                : t("turn.columnFrom", {
                    date: turn.start.toLocaleDateString(dateLocale.value, {
                      month: "numeric",
                      day: "numeric",
                    }),
                  }),
          }))
        : activeMembers.value.map((_, index) => ({
            rotation: index,
            label:
              index === 0
                ? t("rotation.initial")
                : t("rotation.nth", { n: index }),
          }));
    });
    const scrollRef = ref<HTMLDivElement | null>(null);
    const showScrollHintRef = ref(false);
    watch(
      [scrollRef, () => activeMembers.value.length],
      ([element], _, onCleanup) => {
        if (!element) return;
        const check = () => {
          showScrollHintRef.value =
            element.scrollWidth > element.clientWidth + 1;
        };
        check();
        const observer = new ResizeObserver(check);
        observer.observe(element);
        const handleScroll = () => {
          if (element.scrollLeft > 10) showScrollHintRef.value = false;
        };
        element.addEventListener("scroll", handleScroll, { passive: true });
        onCleanup(() => {
          observer.disconnect();
          element.removeEventListener("scroll", handleScroll);
        });
      },
      { flush: "post", immediate: true }
    );

    // 担当名の固定列を避け、現在列が見える範囲の中央に来るようにする。
    watch(
      [scrollRef, () => props.rotation],
      ([element]) => {
        if (!element || typeof element.scrollTo !== "function") return;
        if (element.scrollWidth <= element.clientWidth + 1) return;
        const cell = element.querySelector<HTMLElement>("th[aria-current]");
        if (!cell) return;
        const pinned =
          element.querySelector<HTMLElement>("thead th")?.offsetWidth ?? 0;
        const visible = element.clientWidth - pinned;
        const left =
          cell.offsetLeft - pinned - (visible - cell.offsetWidth) / 2;
        const reduceMotion = window.matchMedia?.(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        element.scrollTo({
          left: Math.max(0, left),
          behavior: reduceMotion ? "auto" : "smooth",
        });
      },
      { flush: "post", immediate: true }
    );

    return () => {
      const { groups, rotation } = props;
      const columns = columnsRef.value;
      const allColumnAssignments = allColumnAssignmentsRef.value;
      const showScrollHint = showScrollHintRef.value;
      return (
        <div class="px-3 sm:px-4 py-3 sm:py-4 pb-8 sm:pb-12 rotation-print-table-section">
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
              <h2
                class="text-sm mb-3 sm:mb-4 tracking-wider uppercase"
                style={{
                  color: "var(--dt-text-secondary)",
                  fontWeight: "var(--dt-font-weight-extra)",
                }}
              >
                {t("quickTable.heading")}
              </h2>
              {showScrollHint && (
                <div
                  class="flex items-center gap-1.5 mb-2 text-xs font-bold sm:hidden rotation-no-print"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  <span>←</span>
                  <span>{t("quickTable.scrollHint")}</span>
                  <span>→</span>
                </div>
              )}
              <div ref={scrollRef} class="overflow-x-auto -mx-1">
                {/* border-separate: collapse だと隣接セルの透明/着色 border の衝突解決が仕様依存になり囲み線が欠ける */}
                <table
                  class="w-full text-sm border-separate"
                  style={{ borderSpacing: 0 }}
                  aria-label={t("quickTable.tableAria")}
                >
                  <thead>
                    <tr>
                      <th
                        class="text-left py-2 sm:py-2.5 px-2 sm:px-3 text-sm sticky left-0 z-[1]"
                        style={{
                          backgroundColor: "var(--dt-card-bg)",
                          color: "var(--dt-text)",
                          borderBottom:
                            "var(--dt-border-width) solid var(--dt-table-border-strong)",
                          fontWeight: "var(--dt-font-weight-extra)",
                        }}
                        scope="col"
                      >
                        {t("quickTable.assignee")}
                      </th>
                      {columns.map(column => {
                        const isCurrent = column.rotation === rotation;
                        return (
                          <th
                            key={column.rotation}
                            class="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 text-sm whitespace-nowrap"
                            style={{
                              color: isCurrent
                                ? "var(--dt-text)"
                                : "var(--dt-text-secondary)",
                              borderBottom:
                                "var(--dt-border-width) solid var(--dt-table-border-strong)",
                              fontWeight: isCurrent
                                ? "var(--dt-font-weight-extra)"
                                : 600,
                            }}
                            scope="col"
                            aria-current={isCurrent ? "true" : undefined}
                          >
                            {column.label}
                            {/* 非現在列も visibility: hidden で ◀ の幅を確保（ヘッダ幅の変動 = 列ガタつき防止） */}
                            <span
                              aria-hidden="true"
                              style={{
                                visibility: isCurrent ? "visible" : "hidden",
                              }}
                            >
                              {" ◀"}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group, groupIndex) => (
                      <tr key={group.id}>
                        <th
                          scope="row"
                          class="py-2 sm:py-2.5 px-2 sm:px-3 font-bold text-sm whitespace-nowrap text-left sticky left-0 z-[1]"
                          style={{
                            backgroundColor: "var(--dt-card-bg)",
                            borderTop:
                              groupIndex > 0
                                ? `1px solid var(--dt-table-border-light)`
                                : "none",
                            color: "var(--dt-text-secondary)",
                          }}
                        >
                          <span class="text-sm sm:text-base" aria-hidden="true">
                            {group.emoji}
                          </span>{" "}
                          <span class="text-xs sm:text-sm inline-block align-bottom max-w-[9rem] sm:max-w-none truncate">
                            {formatTaskNames(group.tasks, locale.value)}
                          </span>
                        </th>
                        {columns.map(column => {
                          const member =
                            allColumnAssignments[column.rotation]?.[groupIndex]
                              ?.member;
                          const isCurrent = column.rotation === rotation;
                          return (
                            <td
                              key={column.rotation}
                              class="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 font-bold text-sm whitespace-nowrap"
                              style={{
                                borderTop:
                                  groupIndex === 0
                                    ? isCurrent
                                      ? HIGHLIGHT_BORDER
                                      : RESERVED_BORDER
                                    : `1px solid var(--dt-table-border-light)`,
                                borderLeft: isCurrent
                                  ? HIGHLIGHT_BORDER
                                  : RESERVED_BORDER,
                                borderRight: isCurrent
                                  ? HIGHLIGHT_BORDER
                                  : RESERVED_BORDER,
                                borderBottom:
                                  groupIndex === groups.length - 1
                                    ? isCurrent
                                      ? HIGHLIGHT_BORDER
                                      : RESERVED_BORDER
                                    : "none",
                                fontWeight: isCurrent
                                  ? "var(--dt-font-weight-extra)"
                                  : 500,
                                color: member?.color,
                              }}
                            >
                              {member?.name}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </m.div>
          </div>
        </div>
      );
    };
  }
);
