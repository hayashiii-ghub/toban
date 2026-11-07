import { computed, reactive, toValue, type MaybeRefOrGetter } from "vue";
import type { Member, RotationConfig } from "@/rotation/types";
import { listDateTurns } from "@/rotation/utils";
import { formatIsoDateLocal, startOfLocalDay } from "@/rotation/dateUtils";
import { useDateLocale, useT } from "@/i18n";
import { useLocalToday } from "@/hooks/useLocalToday";

export interface TurnLabel {
  /** 手動は「初期」「3回目」、日付モードは「9/29(火)〜10/5(月)の当番」 */
  label: string;
  /** 操作の帯に出す短い形。日付モードは「の当番」を付けない（「9/29(火)〜10/5(月)」） */
  period: string;
  /** 日付モードの交代の間隔（「7日ごとに交代」） */
  detail?: string;
  /** 印刷のファイル名に入れる形。日付モードは期間の初日（2026-09-29）。「/」などを含めない */
  fileLabel: string;
  isDateMode: boolean;
}

/** 今の順番の呼び名。ホーム・共有ページ・印刷の見出しで同じものを使う */
export function useTurnLabel(
  configSource: MaybeRefOrGetter<RotationConfig | undefined>,
  membersSource: MaybeRefOrGetter<Member[]>,
  rotationSource: MaybeRefOrGetter<number>
): TurnLabel {
  const t = useT();
  const dateLocale = useDateLocale();
  const today = useLocalToday();
  const value = computed<TurnLabel>(() => {
    const rotationConfig = toValue(configSource);
    const members = toValue(membersSource);
    const rotation = toValue(rotationSource);
    const activeCount = members.filter(m => !m.skipped).length;
    const turn =
      rotationConfig?.mode === "date"
        ? listDateTurns(rotationConfig, activeCount, today.value, 1)[0]
        : undefined;

    if (rotationConfig?.mode !== "date") {
      const label =
        rotation === 0
          ? t("rotation.initial")
          : t("rotation.nth", { n: rotation });
      return { label, period: label, fileLabel: label, isDateMode: false };
    }
    const weekdaysOnly =
      !!rotationConfig.skipSaturday && !!rotationConfig.skipSunday;
    const detail =
      rotationConfig.cycleDays === 1
        ? t(weekdaysOnly ? "turn.everyWeekday" : "turn.everyDay")
        : t("turn.everyNDays", { n: rotationConfig.cycleDays ?? 0 });
    if (!turn) {
      const label = t("rotation.autoByDate");
      return { label, period: label, fileLabel: label, isDateMode: true };
    }

    const format = (date: Date) =>
      date.toLocaleDateString(dateLocale.value, {
        month: "numeric",
        day: "numeric",
        weekday: "short",
      });
    const beforeStart = turn.start > startOfLocalDay(today.value);
    const singleDay = turn.start.getTime() === turn.end.getTime();
    const label = beforeStart
      ? t("turn.startsOn", { date: format(turn.start) })
      : singleDay
        ? t("turn.single", { date: format(turn.start) })
        : t("turn.range", { start: format(turn.start), end: format(turn.end) });
    const period = beforeStart
      ? label
      : singleDay
        ? format(turn.start)
        : t("turn.period", {
            start: format(turn.start),
            end: format(turn.end),
          });
    return {
      label,
      period,
      detail,
      fileLabel: formatIsoDateLocal(turn.start),
      isDateMode: true,
    };
  });
  return reactive({
    label: computed(() => value.value.label),
    period: computed(() => value.value.period),
    detail: computed(() => value.value.detail),
    fileLabel: computed(() => value.value.fileLabel),
    isDateMode: computed(() => value.value.isDateMode),
  });
}
