import { Languages } from "@lucide/vue";
import { defineView } from "@/lib/vue";
import { useLocale, useT } from "@/i18n";

interface LanguageSwitcherProps {
  class?: string;
  className?: string;
  /** 字を出さず、印だけにする（狭い所に置くとき） */
  iconOnly?: boolean;
}
const DEFAULT_CLASS =
  "flex items-center gap-1 px-2 h-8 rounded-full text-sm text-muted-foreground/60 hover:text-muted-foreground/80 hover:bg-muted/40 transition-colors";

const LanguageSwitcher = defineView<LanguageSwitcherProps>(
  ["class", "className", "iconOnly"],
  props => {
    const { locale, setLocale } = useLocale();
    const t = useT();
    return () => {
      const next = locale.value === "ja" ? "en" : "ja";
      const nextLabel = t(next === "ja" ? "lang.ja" : "lang.en");
      return (
        <button
          type="button"
          onClick={() => setLocale(next)}
          aria-label={t("lang.switchLabel")}
          title={t("lang.switchLabel")}
          class={props.class ?? props.className ?? DEFAULT_CLASS}
        >
          <Languages
            class={props.iconOnly ? "size-5" : "size-4"}
            aria-hidden="true"
          />
          {!props.iconOnly && <span class="font-medium">{nextLabel}</span>}
        </button>
      );
    };
  }
);
export default LanguageSwitcher;
