import { useRef, useState, useEffect, useMemo } from "react";
import { m } from "framer-motion";
import type { AssignmentMode, Member, TaskGroup } from "@/rotation/types";
import { computeAssignments } from "@/rotation/utils";
import { formatTaskNames } from "@/rotation/taskFormatting";
import { useLocale, useT } from "@/i18n";

interface RotationQuickTableProps {
  groups: TaskGroup[];
  members: Member[];
  rotation: number;
  assignmentMode?: AssignmentMode;
}

// 現在列の囲み線は「全セルに同幅の透明 border を常時確保し、現在列だけ着色」で描く。
// border の付け外しによる列幅のガタつきを防ぐための幅予約なので、透明 border は消さないこと。
// （box-shadow にしないのは印刷で描画されないブラウザがあるため。印刷品質が最重要価値）
const HIGHLIGHT_BORDER = "2.5px solid var(--dt-current-highlight)";
const RESERVED_BORDER = "2.5px solid transparent";

export function RotationQuickTable({
  groups,
  members,
  rotation,
  assignmentMode,
}: RotationQuickTableProps) {
  const t = useT();
  const { locale } = useLocale();
  const activeMembers = useMemo(
    () => members.filter(m => !m.skipped),
    [members]
  );

  const allColumnAssignments = useMemo(() => {
    return activeMembers.map((_, rotationIndex) =>
      computeAssignments(groups, members, rotationIndex, assignmentMode)
    );
  }, [groups, members, activeMembers, assignmentMode]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setShowScrollHint(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const handleScroll = () => {
      if (el.scrollLeft > 10) setShowScrollHint(false);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", handleScroll);
    };
  }, [activeMembers.length]);

  // 回転が進んだら現在列が見えるよう中央へ横スクロール（はみ出していない時は何もしない）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof el.scrollTo !== "function") return;
    if (el.scrollWidth <= el.clientWidth + 1) return;
    const cell = el.querySelector<HTMLElement>("th[aria-current]");
    if (!cell) return;
    const left = cell.offsetLeft - (el.clientWidth - cell.offsetWidth) / 2;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    el.scrollTo({
      left: Math.max(0, left),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [rotation]);

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 pb-8 sm:pb-12 rotation-print-table-section">
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
          <h2
            className="text-sm mb-3 sm:mb-4 tracking-wider uppercase"
            style={{
              color: "var(--dt-text-secondary)",
              fontWeight: "var(--dt-font-weight-extra)",
            }}
          >
            {t("quickTable.heading")}
          </h2>
          {showScrollHint && (
            <div
              className="flex items-center gap-1.5 mb-2 text-xs font-bold sm:hidden rotation-no-print"
              style={{ color: "var(--dt-text-muted)" }}
            >
              <span>←</span>
              <span>{t("quickTable.scrollHint")}</span>
              <span>→</span>
            </div>
          )}
          <div ref={scrollRef} className="overflow-x-auto -mx-1">
            {/* border-separate: collapse だと隣接セルの透明/着色 border の衝突解決が仕様依存になり囲み線が欠ける */}
            <table
              className="w-full text-sm border-separate"
              style={{ borderSpacing: 0 }}
              aria-label={t("quickTable.tableAria")}
            >
              <thead>
                <tr>
                  <th
                    className="text-left py-2 sm:py-2.5 px-2 sm:px-3 text-sm"
                    style={{
                      color: "var(--dt-text)",
                      borderBottom:
                        "var(--dt-border-width) solid var(--dt-table-border-strong)",
                      fontWeight: "var(--dt-font-weight-extra)",
                    }}
                    scope="col"
                  >
                    {t("quickTable.assignee")}
                  </th>
                  {activeMembers.map((_, rotationIndex) => {
                    const isCurrent = rotationIndex === rotation;
                    return (
                      <th
                        key={rotationIndex}
                        className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 text-sm whitespace-nowrap"
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
                        {rotationIndex === 0
                          ? t("rotation.initial")
                          : t("rotation.nth", { n: rotationIndex })}
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
                      className="py-2 sm:py-2.5 px-2 sm:px-3 font-bold text-sm whitespace-nowrap text-left"
                      style={{
                        borderTop:
                          groupIndex > 0
                            ? `1px solid var(--dt-table-border-light)`
                            : "none",
                        color: "var(--dt-text-secondary)",
                      }}
                    >
                      <span className="text-sm sm:text-base" aria-hidden="true">
                        {group.emoji}
                      </span>{" "}
                      <span className="text-xs sm:text-sm">
                        {formatTaskNames(group.tasks, locale)}
                      </span>
                    </th>
                    {activeMembers.map((_, rotationIndex) => {
                      const member =
                        allColumnAssignments[rotationIndex]?.[groupIndex]
                          ?.member;
                      const isCurrent = rotationIndex === rotation;
                      return (
                        <td
                          key={rotationIndex}
                          className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 font-bold text-sm"
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
}
