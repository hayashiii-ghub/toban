import { defineView } from "@/lib/vue";
import { Printer } from "@lucide/vue";
import { useT } from "@/i18n";

const BUTTON_CLASS =
  "theme-border theme-shadow-sm flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 font-bold text-sm transition-all duration-150 theme-hover-lift active:translate-x-[1px] active:translate-y-[1px] rotation-no-print";

interface PrintMenuProps {
  onPrint: () => void;
}

export const PrintMenu = defineView<PrintMenuProps>(["onPrint"], props => {
  const t = useT();
  return () => {
    const { onPrint } = props;

    return (
      <button
        type="button"
        onClick={onPrint}
        data-onboarding="print-button"
        class={BUTTON_CLASS}
        style={{
          backgroundColor: "var(--dt-button-bg)",
          borderRadius: "var(--dt-border-radius-sm)",
        }}
        aria-label={t("print.printAria")}
      >
        <Printer class="size-4" aria-hidden="true" />
        {t("print.print")}
      </button>
    );
  };
});
