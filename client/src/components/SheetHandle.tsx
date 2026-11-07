import { defineView } from "@/lib/vue";
/**
 * スマホで下から出る画面の、いちばん上の短い線。下になでると閉じられる目印（useSheetSwipe）。
 * 見出し（position: relative）の中に置く。PC の真ん中に出る形では出さない
 */
export const SheetHandle = defineView<object>([], () => {
  return () => {
    return (
      <div
        aria-hidden="true"
        class="sm:hidden absolute left-1/2 top-1 h-1 w-10 -translate-x-1/2 rounded-full"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--dt-text) 25%, transparent)",
        }}
      />
    );
  };
});
