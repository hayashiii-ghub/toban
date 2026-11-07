import { ref } from "vue";
import { defineView } from "@/lib/vue";
import { CalendarDays, CalendarPlus } from "@lucide/vue";
import type { Member } from "@/rotation/types";
import { useLocale, useT } from "@/i18n";
import { calendarFeedUrl, calendarLinks } from "@/lib/calendarLinks";

interface CalendarButtonsProps {
  slug: string;
  memberId?: string | null;
  class?: string;
  className?: string;
}
export const CalendarButtons = defineView<CalendarButtonsProps>(
  ["slug", "memberId", "class", "className"],
  props => {
    const t = useT();
    const { locale } = useLocale();
    return () => {
      const { slug, memberId } = props;
      const className = props.class ?? props.className ?? "";
      const links = calendarLinks(
        calendarFeedUrl(
          window.location.origin,
          slug,
          memberId ?? null,
          locale.value
        )
      );

      const buttonClass =
        "theme-border theme-shadow-sm w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold transition-all duration-150 theme-hover-lift";
      const buttonStyle = {
        backgroundColor: "var(--dt-card-bg)",
        color: "var(--dt-text)",
        borderRadius: "10px",
      };

      return (
        <div class={className}>
          <a
            href={links.google}
            target="_blank"
            rel="noopener noreferrer"
            class={buttonClass}
            style={buttonStyle}
          >
            <CalendarPlus class="size-4" aria-hidden="true" />
            {t("calendar.google")}
          </a>
          <a href={links.apple} class={buttonClass} style={buttonStyle}>
            <CalendarPlus class="size-4" aria-hidden="true" />
            {t("calendar.apple")}
          </a>
        </div>
      );
    };
  }
);

export interface CalendarSubscribeProps {
  slug: string;
  member?: Member;
}
export const CalendarSubscribe = defineView<CalendarSubscribeProps>(
  ["slug", "member"],
  props => {
    const t = useT();
    const mineOnlyRef = ref(true);
    return () => {
      const { slug, member } = props;
      const mineOnly = mineOnlyRef.value;
      // 共有の画面の「見るだけ／編集もできる」に見た目を揃える
      const choiceClass = (selected: boolean) =>
        `theme-border py-2 text-sm font-bold truncate transition-all duration-150 ${
          selected ? "theme-shadow-sm" : "theme-hover-lift"
        }`;
      const choiceStyle = (selected: boolean) => ({
        backgroundColor: selected
          ? "var(--dt-tab-active-bg)"
          : "var(--dt-tab-inactive-bg)",
        color: selected
          ? "var(--dt-tab-active-text)"
          : "var(--dt-tab-inactive-text)",
        borderRadius: "var(--dt-border-radius-sm)",
      });

      return (
        <div class="flex flex-col gap-3">
          <h3
            class="flex items-center gap-1.5 text-sm font-bold"
            style={{ color: "var(--dt-text-secondary)" }}
          >
            <CalendarDays class="size-4" aria-hidden="true" />
            {t("calendar.add")}
          </h3>
          {member && (
            <div
              role="group"
              aria-label={t("calendar.who")}
              class="grid grid-cols-2 gap-2"
            >
              {[true, false].map(mine => (
                <button
                  key={String(mine)}
                  type="button"
                  aria-pressed={mineOnly === mine}
                  onClick={() => {
                    mineOnlyRef.value = mine;
                  }}
                  class={choiceClass(mineOnly === mine)}
                  style={choiceStyle(mineOnly === mine)}
                >
                  {mine
                    ? t("calendar.mine", { name: member.name })
                    : t("calendar.everyone")}
                </button>
              ))}
            </div>
          )}
          <CalendarButtons
            slug={slug}
            memberId={member && mineOnly ? member.id : null}
            class="grid grid-cols-1 sm:grid-cols-2 gap-2"
          />
          <p
            class="text-xs leading-relaxed"
            style={{ color: "var(--dt-text-muted)" }}
          >
            {t("calendar.note")}
          </p>
        </div>
      );
    };
  }
);
