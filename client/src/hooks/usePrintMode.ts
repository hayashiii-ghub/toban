import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
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
  ) => void;
} {
  const t = useT();
  const printDate = usePrintDateString();
  const previousTitleRef = useRef<string | null>(null);

  useEffect(() => {
    const cleanupPrintState = () => {
      document.getElementById("print-orientation")?.remove();
      if (previousTitleRef.current !== null) {
        document.title = previousTitleRef.current;
        previousTitleRef.current = null;
      }
    };
    window.addEventListener("afterprint", cleanupPrintState);
    return () => {
      window.removeEventListener("afterprint", cleanupPrintState);
      cleanupPrintState();
    };
  }, []);

  const handlePrint = useCallback(
    (viewTab: string, scheduleName?: string, rotationLabel?: string) => {
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
        printDate
      );
      if (filename) {
        // 再入（afterprint 前の再呼び出し）で元タイトルを失わないよう、退避は未セット時のみ
        if (previousTitleRef.current === null) {
          previousTitleRef.current = document.title;
        }
        document.title = filename;
      }
      window.print();
    },
    [t, printDate]
  );

  return { handlePrint };
}
