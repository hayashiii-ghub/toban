import { defineView } from "@/lib/vue";
import { Loader2 } from "@lucide/vue";
import { useT } from "@/i18n";

/** 画面を読み込んでいる間の表示（遅い回線でも止まって見えないよう、言葉も添える） */
export const LoadingScreen = defineView<object>([], () => {
  const t = useT();
  return () => {
    return (
      <div
        class="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: "var(--dt-page-bg)" }}
        role="status"
      >
        <Loader2
          class="size-8 animate-spin"
          style={{ color: "var(--dt-current-highlight)" }}
          aria-hidden="true"
        />
        <span class="text-sm" style={{ color: "var(--dt-text-muted)" }}>
          {t("common.loading")}
        </span>
      </div>
    );
  };
});
