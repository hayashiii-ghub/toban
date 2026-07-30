import type { TaskGroup } from "@/rotation/types";
import { useT } from "@/i18n";

interface TaskLegendProps {
  groups: TaskGroup[];
  /** 本体の揃えに合わせる（円盤は中央、カレンダーは左）。 */
  align?: "start" | "center";
  /** 盤面に休みの人が載る円盤だけ true。カレンダーは休みをセルに出さないので付けない。 */
  showOffDuty?: boolean;
  /** 盤面の形に合わせる（円盤は丸、カレンダーはセル内チップと同じ角丸）。 */
  shape?: "rounded" | "pill";
}

/**
 * 盤面・セルに入りきらない当番名を枠の外で補う凡例。
 * カレンダーと円盤で同じ見た目にするため1か所に置く。
 *
 * 塗りではなく theme-border で境界を出す：テーマの pageBg と cardBg は
 * ほぼ同色（しろばんは両方 #ffffff）で、その混色をチップ背景にすると
 * 枠が消えるため。
 *
 * 角だけは盤面に合わせて変える。円盤は盤面が円なので rounded-full、
 * カレンダーは四角いセルとその中の担当者チップ（rounded）に合わせる。
 * どちらもテーマの radius には依存させない。
 */
export function TaskLegend({
  groups,
  align = "start",
  showOffDuty = false,
  shape = "rounded",
}: TaskLegendProps) {
  const t = useT();
  const chipClass = `theme-border inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold ${
    shape === "pill" ? "rounded-full" : "rounded"
  }`;

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
