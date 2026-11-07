import { defineView } from "@/lib/vue";
import type { RotationConfig } from "@/rotation/types";
import { formatIsoDateLocal } from "@/rotation/dateUtils";
import { useT } from "@/i18n";
interface Props {
  config: RotationConfig;
  onUpdate: (updater: (prev: RotationConfig) => RotationConfig) => void;
}
export const RotationConfigEditor = defineView<Props>(
  ["config", "onUpdate"],
  (props, _viewContext) => {
    const t = useT();
    return () => (
      <div>
        <fieldset class="border-0 p-0 m-0">
          <legend
            class="text-xs font-bold mb-1 block"
            style={{ color: "var(--dt-text-muted)" }}
          >
            {t("rotationConfig.howToRotate")}
          </legend>
          <div class="flex gap-2 mb-3">
            <button
              type="button"
              class={`settings-option-control flex-1 ${props.config.mode === "manual" ? "theme-border" : "dt-field"} transition-colors`}
              style={{
                borderRadius: "var(--dt-border-radius-sm)",
                ...(props.config.mode === "manual"
                  ? { backgroundColor: "var(--dt-current-highlight)" }
                  : {}),
              }}
              onClick={() =>
                props.onUpdate(prev => ({ ...prev, mode: "manual" }))
              }
            >
              {t("settings.rotationManual")}
            </button>
            <button
              type="button"
              class={`settings-option-control flex-1 ${props.config.mode === "date" ? "theme-border" : "dt-field"} transition-colors`}
              style={{
                borderRadius: "var(--dt-border-radius-sm)",
                ...(props.config.mode === "date"
                  ? { backgroundColor: "var(--dt-current-highlight)" }
                  : {}),
              }}
              onClick={() =>
                props.onUpdate(prev => ({
                  ...prev,
                  mode: "date",
                  startDate: prev.startDate || formatIsoDateLocal(new Date()),
                  cycleDays: prev.cycleDays || 7,
                }))
              }
            >
              {t("rotationConfig.automatic")}
            </button>
          </div>
        </fieldset>

        {props.config.mode === "date" && (
          <>
            <div class="grid grid-cols-2 gap-2">
              <div class="min-w-0">
                <label
                  for="rotation-start-date"
                  class="text-xs font-bold block mb-1"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {t("rotationConfig.startDate")}
                </label>
                <div class="settings-input-control settings-input-shell dt-field">
                  <input
                    id="rotation-start-date"
                    type="date"
                    value={props.config.startDate || ""}
                    onInput={e =>
                      props.onUpdate(prev => ({
                        ...prev,
                        startDate: (e.target as HTMLInputElement).value,
                      }))
                    }
                    class="settings-date-input w-full"
                    aria-label={t("rotationConfig.startDate")}
                  />
                </div>
              </div>
              <div class="min-w-0">
                <label
                  for="rotation-cycle-days"
                  class="text-xs font-bold block mb-1"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {t("rotationConfig.cycleDays")}
                </label>
                <div class="settings-input-control settings-input-shell dt-field justify-center">
                  <input
                    id="rotation-cycle-days"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    value={props.config.cycleDays || 1}
                    onInput={e => {
                      const v = parseInt(
                        (e.target as HTMLInputElement).value,
                        10
                      );
                      if (v > 0 && v <= 365)
                        props.onUpdate(prev => ({ ...prev, cycleDays: v }));
                    }}
                    class="settings-number-input w-10 bg-transparent text-center outline-none"
                    aria-label={t("rotationConfig.cycleDaysAria")}
                  />
                  <span
                    class="shrink-0"
                    style={{ color: "var(--dt-text-muted)" }}
                  >
                    {t(
                      (props.config.cycleDays || 1) === 1
                        ? "rotationConfig.dayUnit"
                        : "rotationConfig.daysUnit"
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-1.5 mt-3">
              <label
                for="rotation-skip-saturday"
                class="inline-flex items-center gap-2 cursor-pointer pr-2"
              >
                <input
                  id="rotation-skip-saturday"
                  type="checkbox"
                  checked={props.config.skipSaturday ?? false}
                  onInput={e =>
                    props.onUpdate(prev => ({
                      ...prev,
                      skipSaturday: (e.target as HTMLInputElement).checked,
                    }))
                  }
                  class="size-4 accent-amber-500"
                  aria-label={t("rotationConfig.skipSat")}
                />
                <span
                  class="text-xs font-bold"
                  style={{ color: "var(--dt-text-secondary)" }}
                >
                  {t("rotationConfig.skipSat")}
                </span>
              </label>
              <label
                for="rotation-skip-sunday"
                class="inline-flex items-center gap-2 cursor-pointer pr-2"
              >
                <input
                  id="rotation-skip-sunday"
                  type="checkbox"
                  checked={props.config.skipSunday ?? false}
                  onInput={e =>
                    props.onUpdate(prev => ({
                      ...prev,
                      skipSunday: (e.target as HTMLInputElement).checked,
                    }))
                  }
                  class="size-4 accent-amber-500"
                  aria-label={t("rotationConfig.skipSun")}
                />
                <span
                  class="text-xs font-bold"
                  style={{ color: "var(--dt-text-secondary)" }}
                >
                  {t("rotationConfig.skipSun")}
                </span>
              </label>
              <label
                for="rotation-skip-holidays"
                class="inline-flex items-center gap-2 cursor-pointer pr-2"
              >
                <input
                  id="rotation-skip-holidays"
                  type="checkbox"
                  checked={props.config.skipHolidays ?? false}
                  onInput={e =>
                    props.onUpdate(prev => ({
                      ...prev,
                      skipHolidays: (e.target as HTMLInputElement).checked,
                    }))
                  }
                  class="size-4 accent-amber-500"
                  aria-label={t("rotationConfig.skipHoliday")}
                />
                <span
                  class="text-xs font-bold"
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
);
