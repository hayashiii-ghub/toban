import { useRef, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { AssignmentMode, Member, TaskGroup } from "@/rotation/types";
import { computeAssignments } from "@/rotation/utils";

interface RotationQuickTableProps {
  groups: TaskGroup[];
  members: Member[];
  rotation: number;
  assignmentMode?: AssignmentMode;
}

export function RotationQuickTable({
  groups,
  members,
  rotation,
  assignmentMode,
}: RotationQuickTableProps) {
  const activeMembers = useMemo(() => members.filter(m => !m.skipped), [members]);

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
    return () => { ro.disconnect(); el.removeEventListener("scroll", handleScroll); };
  }, [activeMembers.length]);

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 pb-8 sm:pb-12 rotation-print-table-section">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="theme-border theme-shadow-sm p-3 sm:p-5 rotation-print-card"
          style={{ backgroundColor: "var(--dt-card-bg)", borderRadius: "var(--dt-border-radius)" }}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.25 }}
        >
          <h2
            className="text-sm mb-3 sm:mb-4 tracking-wider uppercase"
            style={{ color: "var(--dt-text-secondary)", fontWeight: "var(--dt-font-weight-extra)" }}
          >
            当番の順番 早見表
          </h2>
          {showScrollHint && (
            <div className="flex items-center gap-1.5 mb-2 text-xs font-bold sm:hidden rotation-no-print" style={{ color: "var(--dt-text-muted)" }}>
              <span>←</span>
              <span>横にスクロールできます</span>
              <span>→</span>
            </div>
          )}
          <div ref={scrollRef} className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse" aria-label="ローテーション早見表">
              <thead>
                <tr>
                  <th
                    className="text-left py-2 sm:py-2.5 px-2 sm:px-3 text-sm"
                    style={{ color: "var(--dt-text)", borderBottom: "var(--dt-border-width) solid var(--dt-table-border-strong)", fontWeight: "var(--dt-font-weight-extra)" }}
                    scope="col"
                  >
                    担当
                  </th>
                  {activeMembers.map((_, rotationIndex) => {
                    const isCurrent = rotationIndex === rotation;
                    return (
                      <th
                        key={rotationIndex}
                        className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 text-sm whitespace-nowrap"
                        style={{
                          color: isCurrent ? "var(--dt-text)" : "var(--dt-text-secondary)",
                          borderBottom: "var(--dt-border-width) solid var(--dt-table-border-strong)",
                          fontWeight: isCurrent ? "var(--dt-font-weight-extra)" : 600,
                        }}
                        scope="col"
                      >
                        {rotationIndex === 0 ? "初期" : `${rotationIndex}回目`}
                        {isCurrent && " ◀"}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr aria-hidden="true"><td colSpan={activeMembers.length + 1} style={{ height: "6px", border: "none" }} /></tr>
                {groups.map((group, groupIndex) => (
                  <tr key={group.id}>
                    <th
                      scope="row"
                      className="py-2 sm:py-2.5 px-2 sm:px-3 font-bold text-sm whitespace-nowrap text-left"
                      style={{
                        borderTop: groupIndex > 0 ? `1px solid var(--dt-table-border-light)` : "none",
                        color: "var(--dt-text-secondary)",
                      }}
                    >
                      <span className="text-sm sm:text-base" aria-hidden="true">
                        {group.emoji}
                      </span>{" "}
                      <span className="text-xs sm:text-sm">
                        {group.tasks.join("・")}
                      </span>
                    </th>
                    {activeMembers.map((_, rotationIndex) => {
                      const member = allColumnAssignments[rotationIndex]?.[groupIndex]?.member;
                      const isCurrent = rotationIndex === rotation;
                      return (
                        <td
                          key={rotationIndex}
                          className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 font-bold text-sm"
                          style={{
                            borderTop: groupIndex > 0 ? `1px solid var(--dt-table-border-light)` : "none",
                            borderLeft: isCurrent ? `2.5px solid var(--dt-current-highlight)` : "none",
                            borderRight: isCurrent ? `2.5px solid var(--dt-current-highlight)` : "none",
                            borderBottom: isCurrent && groupIndex === groups.length - 1 ? `2.5px solid var(--dt-current-highlight)` : "none",
                            ...(isCurrent && groupIndex === 0 ? { borderTop: `2.5px solid var(--dt-current-highlight)` } : {}),
                            fontWeight: isCurrent ? "var(--dt-font-weight-extra)" : 500,
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
        </motion.div>
      </div>
    </div>
  );
}
