import { nextTick, onMounted, onScopeDispose } from "vue";
import { toast } from "vue-sonner";
import { viewOrientation } from "@/features/home/viewTabsConfig";
import { usePrintDateString } from "@/hooks/usePrintDateString";
import { useT } from "@/i18n";

/**
 * ブラウザは「PDFに保存」時のデフォルトファイル名に document.title を使う。
 * Home の title は index.html 固定のため、そのままだと全 PDF が同名になり
 * 複数保存しづらい。印刷直前に「当番表名＿順番＿日付」へ差し替え、
 * afterprint で元に戻す。name が無ければ差し替えない（=従来どおり）。
 */
export function buildPrintFilename(
  name?: string,
  label?: string,
  date?: string
): string | null {
  if (!name) return null;
  const parts = [name, label, date].filter(Boolean) as string[];
  // ファイル名に使えない文字を除去
  const filename = parts
    .join("_")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
  return filename || null;
}

export function usePrintMode(): {
  handlePrint: (
    viewTab: string,
    scheduleName?: string,
    rotationLabel?: string
  ) => Promise<void>;
} {
  const t = useT();
  const printDate = usePrintDateString();
  let previousTitle: string | null = null;
  let disposed = false;

  const cleanupPrintState = () => {
    document.getElementById("print-orientation")?.remove();
    if (previousTitle !== null) {
      document.title = previousTitle;
      previousTitle = null;
    }
  };
  onMounted(() => window.addEventListener("afterprint", cleanupPrintState));
  onScopeDispose(() => {
    disposed = true;
    window.removeEventListener("afterprint", cleanupPrintState);
    cleanupPrintState();
  });

  const handlePrint = async (
    viewTab: string,
    scheduleName?: string,
    rotationLabel?: string
  ) => {
    await nextTick();
    if (disposed) return;
    if (typeof window.print !== "function") {
      toast.error(t("shared.printUnsupported"));
      return;
    }
    const orientation = viewOrientation(viewTab);
    const style = document.createElement("style");
    style.id = "print-orientation";
    style.textContent = `@page { size: A4 ${orientation}; }`;
    document.head.appendChild(style);

    const filename = buildPrintFilename(
      scheduleName,
      rotationLabel,
      printDate.value
    );
    if (filename) {
      // 再入（afterprint 前の再呼び出し）で元タイトルを失わないよう、退避は未セット時のみ
      if (previousTitle === null) {
        previousTitle = document.title;
      }
      document.title = filename;
    }
    window.print();
  };

  return { handlePrint };
}
