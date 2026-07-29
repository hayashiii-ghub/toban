import type { TaskGroup, Member, AssignmentMode } from "@/rotation/types";
import { computeAssignments } from "@/rotation/utils";
import { useT, useDateLocale } from "@/i18n";

interface TodayBannerProps {
  groups: TaskGroup[];
  members: Member[];
  rotation: number;
  /** 日付で自動切替するモードか。true なら今日の日付、false なら現在の周回でラベルする */
  isDateMode: boolean;
  /** 手動モードで表示する周回ラベル（例: 「初期」「2回目」） */
  rotationLabel: string;
  assignmentMode?: AssignmentMode;
}

export function TodayBanner({
  groups,
  members,
  rotation,
  isDateMode,
  rotationLabel,
  assignmentMode,
}: TodayBannerProps) {
  const t = useT();
  const dateLocale = useDateLocale();
  const assignments = computeAssignments(
    groups,
    members,
    rotation,
    assignmentMode
  );
  if (assignments.length === 0) return null;

  // 自動モードは rotation が今日の日付から算出されるので「きょうの当番」、
  // 手動モードはユーザーが選んだ周回なので「いまの当番（N回目）」と出し分ける。
  const today = new Date().toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
  const label = isDateMode
    ? t("today.label", { date: today })
    : t("current.label", { turn: rotationLabel });

  return (
    <div className="px-3 sm:px-4 pb-2 rotation-no-print">
      <div
        className="max-w-4xl mx-auto theme-border theme-shadow-sm px-3 py-2 flex items-center gap-2 flex-wrap"
        style={{
          backgroundColor: "var(--dt-card-bg)",
          borderRadius: "var(--dt-border-radius-sm)",
        }}
      >
        <span
          className="text-xs font-bold shrink-0"
          style={{ color: "var(--dt-text-muted)" }}
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {assignments.map(({ group, member }) => (
            <span
              key={group.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                backgroundColor: member.bgColor,
                color: member.textColor,
              }}
            >
              <span>{group.emoji}</span>
              <span>{member.name}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
