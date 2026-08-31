import { m } from "framer-motion";
import { usePrintDateString } from "@/hooks/usePrintDateString";
import { useT } from "@/i18n";
import type { Schedule } from "@/rotation/types";

interface ScheduleHeaderProps {
  scheduleName: string;
  rotationLabel: string;
  schedule?: Schedule;
  localSaveStatus?: "saved" | "failed" | "pending";
}

export function ScheduleHeader({
  scheduleName,
  rotationLabel,
  schedule,
  localSaveStatus,
}: ScheduleHeaderProps) {
  const t = useT();
  const printDate = usePrintDateString();
  return (
    <header className="rotation-print-header pt-6 sm:pt-8 pb-6 sm:pb-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto text-center">
        <m.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            className="text-2xl sm:text-3xl md:text-4xl tracking-tight rotation-no-print [overflow-wrap:anywhere]"
            style={{
              color: "var(--dt-text)",
              fontWeight: "var(--dt-font-weight-extra)",
            }}
          >
            {scheduleName}
          </h1>
          {(schedule?.slug || localSaveStatus === "failed") && (
            <div
              className="rotation-no-print mt-3 space-y-1 text-xs sm:text-sm [overflow-wrap:anywhere]"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              {schedule?.slug && (
                <p className="text-xs">{t("summary.sharedEdits")}</p>
              )}
              {localSaveStatus === "failed" && (
                <p role="alert" className="font-bold text-red-700">
                  {t("summary.saveFailed")}
                </p>
              )}
            </div>
          )}
          <div
            className="rotation-print-only text-2xl sm:text-3xl md:text-4xl tracking-tight"
            style={{
              color: "var(--dt-text)",
              fontWeight: "var(--dt-font-weight-extra)",
            }}
            aria-hidden="true"
          >
            {scheduleName}
          </div>

          <div
            className="rotation-print-only mt-3 pt-2 text-sm font-bold"
            style={{
              color: "var(--dt-text-secondary)",
              borderBottom: "3px solid var(--dt-border-color)",
            }}
          >
            <span className="inline-block pb-2">
              {t("shared.printHeader", {
                label: rotationLabel,
                date: printDate,
              })}
            </span>
          </div>
        </m.div>
      </div>
    </header>
  );
}
