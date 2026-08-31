import { m } from "framer-motion";
import { usePrintDateString } from "@/hooks/usePrintDateString";
import { useT } from "@/i18n";

interface ScheduleHeaderProps {
  scheduleName: string;
  rotationLabel: string;
  localSaveStatus?: "saved" | "failed" | "pending";
}

export function ScheduleHeader({
  scheduleName,
  rotationLabel,
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
          {localSaveStatus === "failed" && (
            <div
              className="rotation-no-print mt-3 space-y-1 text-xs sm:text-sm [overflow-wrap:anywhere]"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              <p role="alert" className="font-bold text-red-700">
                {t("summary.saveFailed")}
              </p>
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
