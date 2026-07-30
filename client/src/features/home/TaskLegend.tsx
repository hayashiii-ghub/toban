import type { TaskGroup } from "@/rotation/types";
import { useT } from "@/i18n";

interface TaskLegendProps {
  groups: TaskGroup[];
  /** 本体の揃えに合わせる（円盤は中央、カレンダーは左）。 */
  align?: "start" | "center";
  /** 盤面に休みの人が載る円盤だけ true。カレンダーは休みをセルに出さないので付けない。 */
  showOffDuty?: boolean;
}

/**
 * 盤面・セルに入りきらない当番名を枠の外で補う凡例。
 * カレンダーと円盤で同じ見た目にするため1か所に置く。
 *
 * 塗りではなく theme-border で境界を出す：テーマの pageBg と cardBg は
 * ほぼ同色（しろばんは両方 #ffffff）で、その混色をチップ背景にすると
 * 枠が消えるため。角も rounded-full にしてテーマの radius に依存させない。
 */
export function TaskLegend({
  groups,
  align = "start",
  showOffDuty = false,
}: TaskLegendProps) {
  const t = useT();
  const chipClass =
    "theme-border inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold";

  return (
    <ul
      className={`mt-3 flex flex-wrap gap-1.5 list-none p-0 ${
        align === "center" ? "justify-center" : ""
      }`}
    >
      {groups.map(group => (
        <li
          key={group.id}
          className={chipClass}
          style={{
            backgroundColor: "var(--dt-card-bg)",
            color: "var(--dt-text-secondary)",
          }}
        >
          <span aria-hidden="true">{group.emoji}</span>
          <span>{group.tasks.join("・")}</span>
        </li>
      ))}
      {showOffDuty && (
        <li
          className={chipClass}
          style={{
            backgroundColor: "var(--dt-card-bg)",
            color: "var(--dt-text-muted)",
          }}
        >
          <span aria-hidden="true">💤</span>
          <span>{t("disc.offDuty")}</span>
        </li>
      )}
    </ul>
  );
}
