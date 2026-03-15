import { AnimatePresence, motion } from "framer-motion";
import type { Member, TaskGroup } from "@/rotation/types";
import {
  CARD_STAGGER_DELAY,
  TASK_STAGGER_DELAY,
} from "@/rotation/constants";
import { getGridCols } from "@/rotation/utils";

interface AssignmentsGridProps {
  assignments: Array<{ group: TaskGroup; member: Member }>;
  direction: "forward" | "backward";
  rotation: number;
  groupCount: number;
  scheduleId: string;
  stagger?: boolean;
}

export function AssignmentsGrid({
  assignments,
  direction,
  rotation,
  groupCount,
  scheduleId,
  stagger = true,
}: AssignmentsGridProps) {
  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 rotation-print-card-section">
      <div className="max-w-4xl mx-auto">
        <div className={`grid gap-3 md:gap-4 rotation-print-card-grid ${getGridCols(groupCount)}`}>
          <AnimatePresence>
            {assignments.map(({ group, member }, index) => (
              <motion.div
                key={`${scheduleId}-${member.id}-${group.id}-${rotation}`}
                className="brutal-border brutal-shadow rotation-print-card overflow-hidden"
                style={{ borderRadius: "16px", backgroundColor: "#fff" }}
                initial={stagger
                  ? { x: direction === "forward" ? 40 : -40, opacity: 0, scale: 0.95 }
                  : { opacity: 0, scale: 0.97 }
                }
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={stagger
                  ? { duration: 0.4, delay: index * CARD_STAGGER_DELAY, type: "spring", stiffness: 200, damping: 25 }
                  : { duration: 0.25 }
                }
              >
                <div
                  className="px-3 sm:px-4 py-3 sm:py-4 text-center"
                  style={{ backgroundColor: member.color }}
                >
                  <div
                    className="brutal-border w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-1.5 sm:mb-2 flex items-center justify-center font-extrabold text-sm sm:text-base"
                    style={{ backgroundColor: "#fff", borderRadius: "50%", color: member.color }}
                    aria-hidden="true"
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="text-base sm:text-lg font-extrabold text-white">{member.name}</div>
                </div>

                <div className="p-2.5 sm:p-3 flex flex-col gap-1.5 sm:gap-2">
                  {group.tasks.map((task, taskIndex) => (
                    <motion.div
                      key={`${group.id}-task-${taskIndex}`}
                      className="flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 font-bold text-xs sm:text-sm"
                      style={{
                        backgroundColor: member.bgColor,
                        borderRadius: "8px",
                        border: `2px solid ${member.color}40`,
                        color: member.textColor,
                      }}
                      initial={stagger ? { x: 20, opacity: 0 } : { opacity: 1 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={stagger
                        ? { delay: index * CARD_STAGGER_DELAY + taskIndex * TASK_STAGGER_DELAY + 0.2, duration: 0.3 }
                        : { duration: 0 }
                      }
                    >
                      <span className="text-lg" aria-hidden="true">
                        {group.emoji}
                      </span>
                      <span>{task}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
