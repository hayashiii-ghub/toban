import { useEffect, useState } from "react";
import { useDateLocale } from "@/i18n";

// 印刷日表示用の日付文字列。
// CSR-only だが react-doctor/rendering-hydration-mismatch-time を満たすため
// マウント後に評価する。
export function usePrintDateString(): string {
  const dateLocale = useDateLocale();
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    );
  }, [dateLocale]);
  return dateStr;
}
