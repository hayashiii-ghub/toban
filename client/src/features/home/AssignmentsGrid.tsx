import { AnimatePresence, m } from "framer-motion";
import type { AssignmentMode, Member, TaskGroup } from "@/rotation/types";
import { CARD_STAGGER_DELAY, TASK_STAGGER_DELAY } from "@/rotation/constants";
import { getGridCols } from "@/rotation/utils";
import { useT } from "@/i18n";

interface AssignmentsGridProps {
  assignments: Array<{ group: TaskGroup; member: Member }>;
  direction: "forward" | "backward";
  rotation: number;
  scheduleId: string;
  stagger?: boolean;
  assignmentMode?: AssignmentMode;
}

export function AssignmentsGrid({
  assignments,
  direction,
  rotation,
  scheduleId,
  stagger = true,
  assignmentMode,
}: AssignmentsGridProps) {
  const t = useT();
  const isTaskMode = assignmentMode === "task";
  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 rotation-print-card-section">
      <div className="max-w-4xl mx-auto">
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {assignments
            .map(({ group, member }) =>
              isTaskMode
                ? `${group.tasks[0] ?? ""}: ${member.name}`
                : `${member.name}: ${group.tasks.join("・")}`
            )
            .join("、")}
        </div>
        <ul
          className={`list-none p-0 grid gap-3 md:gap-4 rotation-print-card-grid ${getGridCols()}`}
          aria-label={t("assignments.listAria")}
        >
          <AnimatePresence>
            {assignments.map(({ group, member }, index) => (
              <m.li
                key={`${scheduleId}-${member.id}-${group.id}-${rotation}`}
                aria-label={
                  isTaskMode
                    ? `${group.tasks[0] ?? ""}: ${member.name}`
                    : `${member.name}: ${group.tasks.join("・")}`
                }
                className="theme-border theme-shadow rotation-print-card overflow-hidden"
                style={{
                  borderRadius: "var(--dt-border-radius)",
                  backgroundColor: "var(--dt-card-bg)",
                }}
                initial={
                  stagger
                    ? {
                        x: direction === "forward" ? 40 : -40,
                        opacity: 0,
                        scale: 0.95,
                      }
                    : { opacity: 0, scale: 0.97 }
                }
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={
                  stagger
                    ? {
                        duration: 0.4,
                        delay: index * CARD_STAGGER_DELAY,
                        type: "spring",
                        stiffness: 200,
                        damping: 25,
                      }
                    : { duration: 0.25 }
                }
              >
                {isTaskMode ? (
                  <>
                    {/* タスクモード: タスク絵文字+名前が上、メンバーが下 */}
                    <div
                      className="px-3 sm:px-4 py-3 sm:py-4 text-center"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--dt-page-bg) 60%, var(--dt-card-bg))",
                      }}
                    >
                      <div
                        className="text-3xl sm:text-4xl mb-1"
                        aria-hidden="true"
                      >
                        {group.emoji}
                      </div>
                      <div
                        className="text-base sm:text-lg"
                        style={{
                          color: "var(--dt-text)",
                          fontWeight: "var(--dt-font-weight-extra)",
                        }}
                      >
                        {group.tasks[0] ?? ""}
                      </div>
                    </div>
                    <div className="p-2.5 sm:p-3 flex flex-col gap-1.5 sm:gap-2">
                      <m.div
                        className="flex items-center justify-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 font-bold text-sm sm:text-base"
                        style={{
                          backgroundColor: member.bgColor,
                          borderRadius: "var(--dt-border-radius-sm)",
                          border: `2px solid ${member.color}40`,
                          color: member.textColor,
                        }}
                        initial={
                          stagger ? { x: 20, opacity: 0 } : { opacity: 1 }
                        }
                        animate={{ x: 0, opacity: 1 }}
                        transition={
                          stagger
                            ? {
                                delay: index * CARD_STAGGER_DELAY + 0.2,
                                duration: 0.3,
                              }
                            : { duration: 0 }
                        }
                      >
                        <span
                          className="size-5 sm:size-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-extrabold text-white shrink-0"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.name.charAt(0)}
                        </span>
                        <span>{member.name}</span>
                      </m.div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 担当者モード: メンバー名が上、タスクが下 */}
                    <div
                      className="px-3 sm:px-4 py-3 sm:py-4 text-center"
                      style={{ backgroundColor: member.color }}
                    >
                      <div
                        className="theme-border size-10 sm:size-12 mx-auto mb-1.5 sm:mb-2 flex items-center justify-center font-extrabold text-sm sm:text-base"
                        style={{
                          backgroundColor: "var(--dt-card-bg)",
                          borderRadius: "50%",
                          color: member.color,
                        }}
                        aria-hidden="true"
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-white">
                        {member.name}
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 flex flex-col gap-1.5 sm:gap-2">
                      {group.tasks.map((task, taskIndex) => (
                        <m.div
                          key={`${group.id}-task-${taskIndex}`}
                          className="flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 font-bold text-xs sm:text-sm"
                          style={{
                            backgroundColor: member.bgColor,
                            borderRadius: "var(--dt-border-radius-sm)",
                            border: `2px solid ${member.color}40`,
                            color: member.textColor,
                          }}
                          initial={
                            stagger ? { x: 20, opacity: 0 } : { opacity: 1 }
                          }
                          animate={{ x: 0, opacity: 1 }}
                          transition={
                            stagger
                              ? {
                                  delay:
                                    index * CARD_STAGGER_DELAY +
                                    taskIndex * TASK_STAGGER_DELAY +
                                    0.2,
                                  duration: 0.3,
                                }
                              : { duration: 0 }
                          }
                        >
                          <span className="text-lg" aria-hidden="true">
                            {group.emoji}
                          </span>
                          <span>{task}</span>
                        </m.div>
                      ))}
                    </div>
                  </>
                )}
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}
