import { motion } from "framer-motion";
import type { Member, TaskGroup } from "@/rotation/types";
import { computeAssignments } from "@/rotation/utils";

interface RotationQuickTableProps {
  groups: TaskGroup[];
  members: Member[];
  rotation: number;
}

export function RotationQuickTable({
  groups,
  members,
  rotation,
}: RotationQuickTableProps) {
  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 pb-8 sm:pb-12">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="brutal-border brutal-shadow-sm p-3 sm:p-5 rotation-print-card"
          style={{ backgroundColor: "#fff", borderRadius: "12px" }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <h2
            className="text-xs sm:text-sm font-extrabold mb-3 sm:mb-4 tracking-wider uppercase"
            style={{ color: "#999" }}
          >
            ローテーション早見表
          </h2>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs sm:text-sm border-collapse" aria-label="ローテーション早見表">
              <thead>
                <tr>
                  <th
                    className="text-left py-2 sm:py-2.5 px-2 sm:px-3 font-extrabold text-[10px] sm:text-xs"
                    style={{ color: "#1a1a1a", borderBottom: "3px solid #1a1a1a" }}
                    scope="col"
                  >
                    回
                  </th>
                  {groups.map((group) => (
                    <th
                      key={group.id}
                      className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 font-bold text-[10px] sm:text-xs"
                      style={{ color: "#666", borderBottom: "3px solid #1a1a1a" }}
                      scope="col"
                    >
                      <span className="text-sm sm:text-base" aria-hidden="true">
                        {group.emoji}
                      </span>
                      <br />
                      <span className="text-[9px] sm:text-[10px] leading-tight">
                        {group.tasks.join("・")}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((_, rotationIndex) => {
                  const rowAssignments = computeAssignments(groups, members, rotationIndex);
                  const isCurrent = rotationIndex === rotation;

                  return (
                    <tr
                      key={rotationIndex}
                      style={{
                        backgroundColor: isCurrent ? "#FBBF24" : "transparent",
                        fontWeight: isCurrent ? 800 : 500,
                      }}
                      aria-current={isCurrent ? "true" : undefined}
                    >
                      <td
                        className="py-2 sm:py-2.5 px-2 sm:px-3 font-bold text-[10px] sm:text-xs whitespace-nowrap"
                        style={{ borderTop: "2px solid #e5e5e5" }}
                      >
                        {rotationIndex === 0 ? "初期" : `${rotationIndex}回目`}
                        {isCurrent && " ◀"}
                      </td>
                      {rowAssignments.map(({ member }, groupIndex) => (
                        <td
                          key={groupIndex}
                          className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 font-bold text-xs sm:text-sm"
                          style={{
                            borderTop: "2px solid #e5e5e5",
                            color: member.color,
                          }}
                        >
                          {member.name}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
