import type {
  Assignment,
  AssignmentMode,
  Member,
  RotationConfig,
  TaskGroup,
} from "@/rotation/types";
import { AssignmentsGrid } from "@/features/home/AssignmentsGrid";
import { RotationQuickTable } from "@/features/home/RotationQuickTable";
import { RotationCalendar } from "@/features/home/RotationCalendar";
import { RotationDisc } from "@/features/home/RotationDisc";
import type { ViewTabValue } from "@/features/home/viewTabsConfig";

interface ScheduleViewsProps {
  viewTab: ViewTabValue;
  /** cards 用の算出済み割り当て。 */
  assignments: Assignment[];
  groups: TaskGroup[];
  members: Member[];
  /** = effectiveRotation。 */
  rotation: number;
  /** calendar 用。 */
  rotationConfig?: RotationConfig;
  assignmentMode?: AssignmentMode;
  scheduleId: string;
  /** cards のアニメ方向（Home はローテーション連動、共有閲覧は固定 forward）。 */
  direction: "forward" | "backward";
  /** cards の stagger（Home はアニメ中のみ、共有閲覧は false）。 */
  stagger: boolean;
}

/**
 * viewTab に応じた表示の出し分け。Home と SharedScheduleView で共有し、
 * view 追加時の片ページ更新漏れを防ぐ。状態は持たない presentational。
 */
export function ScheduleViews({
  viewTab,
  assignments,
  groups,
  members,
  rotation,
  rotationConfig,
  assignmentMode,
  scheduleId,
  direction,
  stagger,
}: ScheduleViewsProps) {
  return (
    <>
      {viewTab === "cards" && (
        <AssignmentsGrid
          assignments={assignments}
          direction={direction}
          rotation={rotation}
          scheduleId={scheduleId}
          stagger={stagger}
          assignmentMode={assignmentMode}
        />
      )}
      {viewTab === "table" && (
        <RotationQuickTable
          groups={groups}
          members={members}
          rotation={rotation}
          assignmentMode={assignmentMode}
        />
      )}
      {viewTab === "calendar" && (
        <RotationCalendar
          groups={groups}
          members={members}
          rotation={rotation}
          rotationConfig={rotationConfig}
          assignmentMode={assignmentMode}
        />
      )}
      {viewTab === "disc" && (
        <RotationDisc
          groups={groups}
          members={members}
          rotation={rotation}
          assignmentMode={assignmentMode}
        />
      )}
    </>
  );
}
