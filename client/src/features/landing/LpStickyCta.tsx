import { defineView } from "@/lib/vue";
import { type VNodeChild } from "vue";
import { ArrowRight, Check } from "@lucide/vue";
import { useT } from "@/i18n";
/**
 * LP・テンプレートのページにいつも出しておく「作る」ボタン。
 * スマホは画面の下に横いっぱいの帯（親指の届く位置。アプリ本体の操作の帯と同じ場所）、PC は右下に浮かべる。
 * 「登録不要・完全無料」はここだけに出す（ヒーローには置かない）。下の面は、黒板の上に重なっても字が読めるように敷く。
 * ページの最後が帯に隠れないよう、帯の高さの分だけ下を空ける
 */
export const LpStickyCta = defineView<{
  href: string;
  children?: VNodeChild;
}>(["href"], (props, viewContext) => {
  const t = useT();
  return () => (
    <>
      <div
        aria-hidden="true"
        class="sm:hidden h-[calc(6rem+env(safe-area-inset-bottom,0px))]"
      />
      <div class="fixed z-50 print:hidden inset-x-0 bottom-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-lp-card border-t border-lp-line shadow-[0_-6px_20px_rgba(41,74,58,0.1)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:p-2.5 sm:pt-2 sm:rounded-2xl sm:border sm:shadow-[0_10px_30px_rgba(41,74,58,0.18)]">
        <ul class="mb-2 flex items-center justify-center gap-4 text-xs font-bold text-lp-text-secondary">
          {(["lp.feat.noSignup.label", "lp.feat.free.label"] as const).map(
            key => (
              <li key={key} class="flex items-center gap-1">
                <span class="size-4 rounded-full bg-lp-highlight flex items-center justify-center">
                  <Check
                    class="size-3 text-lp-primary"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                </span>
                {t(key)}
              </li>
            )
          )}
        </ul>
        <a
          href={props.href}
          class="flex sm:inline-flex w-full sm:w-auto items-center justify-center gap-2 h-12 px-6 rounded-xl font-bold shadow-lg transition-colors bg-lp-primary hover:bg-lp-primary-hover text-lp-hero-text"
        >
          {viewContext.slots.default?.()}
          <ArrowRight class="size-4" aria-hidden="true" />
        </a>
      </div>
    </>
  );
});
