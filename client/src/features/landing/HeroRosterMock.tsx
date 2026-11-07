import { defineView } from "@/lib/vue";
import { MEMBER_PRESETS } from "@shared/appearance";
import { useT, type MessageKey } from "@/i18n";
import { LP_COLORS as C, alpha } from "./theme";
const ROWS: {
  emoji: string;
  task: MessageKey;
  member: MessageKey;
}[] = [
  { emoji: "🧹", task: "lp.mock.task1", member: "lp.mock.member1" },
  { emoji: "🗑️", task: "lp.mock.task2", member: "lp.mock.member2" },
  { emoji: "🍵", task: "lp.mock.task3", member: "lp.mock.member3" },
  { emoji: "🪟", task: "lp.mock.task4", member: "lp.mock.member4" },
];
const ROW_COLORS = [
  MEMBER_PRESETS[4],
  MEMBER_PRESETS[3],
  MEMBER_PRESETS[1],
  MEMBER_PRESETS[5],
];
/** ヒーローの見本。黒板に貼った紙の当番表と、AI への頼みごとの吹き出し（飾りなので読み上げない） */
export const HeroRosterMock = defineView<object>([], (_props, _viewContext) => {
  const t = useT();
  return () => (
    <div
      aria-hidden="true"
      class="relative mx-auto flex w-full max-w-[340px] md:max-w-[400px] flex-col select-none"
    >
      <div
        class="relative z-10 self-start -mb-4 -ml-2 sm:-ml-8 max-w-[260px] px-4 py-2.5 text-sm leading-snug"
        style={{
          backgroundColor: C.highlight,
          color: C.primary,
          borderRadius: "18px 18px 18px 4px",
          transform: "rotate(-2deg)",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
        }}
      >
        <span class="block text-[11px] opacity-70 mb-0.5">
          {t("lp.mock.askLabel")}
        </span>
        {t("lp.mock.ask")}
      </div>
      <div
        class="relative ml-4 sm:ml-6 px-5 pt-9 pb-5"
        style={{
          backgroundColor: C.cardBg,
          borderRadius: "10px",
          transform: "rotate(-2deg)",
          boxShadow:
            "0 18px 40px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2)",
        }}
      >
        <span
          class="absolute -top-3 right-5 h-6 w-20"
          style={{
            backgroundColor: alpha(C.highlight, 75),
            transform: "rotate(6deg)",
          }}
        />
        <div class="flex items-baseline justify-between mb-4">
          <span class="text-lg" style={{ color: C.text }}>
            {t("lp.mock.title")}
          </span>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: alpha(C.primary, 10), color: C.primary }}
          >
            {t("lp.mock.week")}
          </span>
        </div>
        <ul class="flex flex-col gap-2">
          {ROWS.map((row, i) => (
            <li
              key={row.task}
              class="flex items-center gap-3 px-3 py-2"
              style={{
                borderRadius: "8px",
                border: `1px solid ${C.line}`,
                backgroundColor: "#ffffff",
              }}
            >
              <span class="text-xl">{row.emoji}</span>
              <span class="flex-1 text-sm" style={{ color: C.textSecondary }}>
                {t(row.task)}
              </span>
              <span
                class="text-sm px-3 py-0.5 rounded-full"
                style={{
                  backgroundColor: ROW_COLORS[i].bgColor,
                  color: ROW_COLORS[i].textColor,
                  border: `1.5px solid ${ROW_COLORS[i].color}`,
                }}
              >
                {t(row.member)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});
