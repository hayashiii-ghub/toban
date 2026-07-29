import type { RotationConfig } from "@/rotation/types";
import { useT } from "@/i18n";

interface Props {
  config: RotationConfig;
  onUpdate: (updater: (prev: RotationConfig) => RotationConfig) => void;
}

export function RotationConfigEditor({ config, onUpdate }: Props) {
  const t = useT();
  return (
    <div>
      <fieldset className="border-0 p-0 m-0">
        <legend
          className="text-xs font-bold mb-1 block"
          style={{ color: "var(--dt-text-muted)" }}
        >
          {t("rotationConfig.howToRotate")}
        </legend>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            className="settings-option-control flex-1 theme-border transition-colors"
            style={{
              borderRadius: "var(--dt-border-radius-sm)",
              backgroundColor:
                config.mode === "manual"
                  ? "var(--dt-current-highlight)"
                  : "#FAFAFA",
            }}
            onClick={() => onUpdate(prev => ({ ...prev, mode: "manual" }))}
          >
            {t("settings.rotationManual")}
          </button>
          <button
            type="button"
            className="settings-option-control flex-1 theme-border transition-colors"
            style={{
              borderRadius: "var(--dt-border-radius-sm)",
              backgroundColor:
                config.mode === "date"
                  ? "var(--dt-current-highlight)"
                  : "#FAFAFA",
            }}
            onClick={() =>
              onUpdate(prev => ({
                ...prev,
                mode: "date",
                startDate:
                  prev.startDate || new Date().toISOString().split("T")[0],
                cycleDays: prev.cycleDays || 7,
              }))
            }
          >
            {t("rotation.autoByDate")}
          </button>
        </div>
      </fieldset>

      {config.mode === "date" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0">
              <label
                htmlFor="rotation-start-date"
                className="text-xs font-bold block mb-1"
                style={{ color: "var(--dt-text-muted)" }}
              >
                {t("rotationConfig.startDate")}
              </label>
              <div
                className="settings-input-control settings-input-shell theme-border"
                style={{
                  borderRadius: "var(--dt-border-radius-sm)",
                  backgroundColor: "#FAFAFA",
                }}
              >
                <input
                  id="rotation-start-date"
                  type="date"
                  value={config.startDate || ""}
                  onChange={e =>
                    onUpdate(prev => ({ ...prev, startDate: e.target.value }))
                  }
                  className="settings-date-input w-full"
                  aria-label={t("rotationConfig.startDate")}
                />
              </div>
            </div>
            <div className="min-w-0">
              <label
                htmlFor="rotation-cycle-days"
                className="text-xs font-bold block mb-1"
                style={{ color: "var(--dt-text-muted)" }}
              >
                {t("rotationConfig.cycleDays")}
              </label>
              <div
                className="settings-input-control settings-input-shell theme-border justify-center"
                style={{
                  borderRadius: "var(--dt-border-radius-sm)",
                  backgroundColor: "#FAFAFA",
                }}
              >
                <input
                  id="rotation-cycle-days"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={config.cycleDays || 1}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (v > 0 && v <= 365)
                      onUpdate(prev => ({ ...prev, cycleDays: v }));
                  }}
                  className="settings-number-input w-10 bg-transparent text-center outline-none"
                  aria-label={t("rotationConfig.cycleDaysAria")}
                />
                <span
                  className="shrink-0"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {t("rotationConfig.daysUnit")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            <label
              htmlFor="rotation-skip-saturday"
              className="inline-flex items-center gap-2 cursor-pointer pr-2"
            >
              <input
                id="rotation-skip-saturday"
                type="checkbox"
                checked={config.skipSaturday ?? false}
                onChange={e =>
                  onUpdate(prev => ({
                    ...prev,
                    skipSaturday: e.target.checked,
                  }))
                }
                className="size-4 accent-amber-500"
                aria-label={t("rotationConfig.skipSat")}
              />
              <span
                className="text-xs font-bold"
                style={{ color: "var(--dt-text-secondary)" }}
              >
                {t("rotationConfig.skipSat")}
              </span>
            </label>
            <label
              htmlFor="rotation-skip-sunday"
              className="inline-flex items-center gap-2 cursor-pointer pr-2"
            >
              <input
                id="rotation-skip-sunday"
                type="checkbox"
                checked={config.skipSunday ?? false}
                onChange={e =>
                  onUpdate(prev => ({ ...prev, skipSunday: e.target.checked }))
                }
                className="size-4 accent-amber-500"
                aria-label={t("rotationConfig.skipSun")}
              />
              <span
                className="text-xs font-bold"
                style={{ color: "var(--dt-text-secondary)" }}
              >
                {t("rotationConfig.skipSun")}
              </span>
            </label>
            <label
              htmlFor="rotation-skip-holidays"
              className="inline-flex items-center gap-2 cursor-pointer pr-2"
            >
              <input
                id="rotation-skip-holidays"
                type="checkbox"
                checked={config.skipHolidays ?? false}
                onChange={e =>
                  onUpdate(prev => ({
                    ...prev,
                    skipHolidays: e.target.checked,
                  }))
                }
                className="size-4 accent-amber-500"
                aria-label={t("rotationConfig.skipHoliday")}
              />
              <span
                className="text-xs font-bold"
                style={{ color: "var(--dt-text-secondary)" }}
              >
                {t("rotationConfig.skipHoliday")}
              </span>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
