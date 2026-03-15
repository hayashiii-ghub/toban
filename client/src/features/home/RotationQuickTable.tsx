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
  const activeMembers = members.filter(m => !m.skipped);
  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4 pb-8 sm:pb-12 rotation-print-table-section">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="brutal-border brutal-shadow-sm p-3 sm:p-5 rotation-print-card"
          style={{ backgroundColor: "#fff", borderRadius: "12px" }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <h2
            className="text-sm font-extrabold mb-3 sm:mb-4 tracking-wider uppercase"
            style={{ color: "#666" }}
          >
            当番の順番 早見表
          </h2>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse" aria-label="ローテーション早見表">
              <thead>
                <tr>
                  <th
                    className="text-left py-2 sm:py-2.5 px-2 sm:px-3 font-extrabold text-sm"
                    style={{ color: "#1a1a1a", borderBottom: "3px solid #1a1a1a" }}
                    scope="col"
                  >
                    担当
                  </th>
                  {activeMembers.map((_, rotationIndex) => {
                    const isCurrent = rotationIndex === rotation;
                    return (
                      <th
                        key={rotationIndex}
                        className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 font-bold text-sm whitespace-nowrap"
                        style={{
                          color: isCurrent ? "#1a1a1a" : "#666",
                          borderBottom: "3px solid #1a1a1a",
                          fontWeight: isCurrent ? 800 : 600,
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
                    <td
                      className="py-2 sm:py-2.5 px-2 sm:px-3 font-bold text-sm whitespace-nowrap"
                      style={{
                        borderTop: groupIndex > 0 ? "2px solid #e5e5e5" : "none",
                        color: "#666",
                      }}
                    >
                      <span className="text-sm sm:text-base" aria-hidden="true">
                        {group.emoji}
                      </span>{" "}
                      <span className="text-xs sm:text-sm">
                        {group.tasks.join("・")}
                      </span>
                    </td>
                    {activeMembers.map((_, rotationIndex) => {
                      const colAssignments = computeAssignments(groups, members, rotationIndex);
                      const member = colAssignments[groupIndex]?.member;
                      const isCurrent = rotationIndex === rotation;
                      return (
                        <td
                          key={rotationIndex}
                          className="text-center py-2 sm:py-2.5 px-1.5 sm:px-2 font-bold text-sm"
                          style={{
                            borderTop: groupIndex > 0 ? "2px solid #e5e5e5" : "none",
                            borderLeft: isCurrent ? "2.5px solid #FBBF24" : "none",
                            borderRight: isCurrent ? "2.5px solid #FBBF24" : "none",
                            borderBottom: isCurrent && groupIndex === groups.length - 1 ? "2.5px solid #FBBF24" : "none",
                            ...(isCurrent && groupIndex === 0 ? { borderTop: "2.5px solid #FBBF24" } : {}),
                            fontWeight: isCurrent ? 800 : 500,
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
