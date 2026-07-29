import { Check, Printer } from "lucide-react";
import { DESIGN_THEMES } from "@/rotation/designThemes";
import { useT } from "@/i18n";

interface DesignThemePickerProps {
  selectedThemeId: string | undefined;
  onSelect: (themeId: string) => void;
}

export function DesignThemePicker({
  selectedThemeId,
  onSelect,
}: DesignThemePickerProps) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-0.5">
      {DESIGN_THEMES.map(theme => {
        const isSelected = (selectedThemeId ?? "whiteboard") === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelect(theme.id)}
            className={`relative theme-border p-2.5 text-left transition-all duration-150 flex flex-col justify-start ${
              isSelected ? "ring-2 ring-offset-1" : "hover:opacity-80"
            }`}
            style={{
              borderRadius: "var(--dt-border-radius-sm)",
              backgroundColor: "var(--dt-card-bg)",
              ...(isSelected
                ? ({
                    "--tw-ring-color": "var(--dt-current-highlight)",
                  } as React.CSSProperties)
                : {}),
            }}
            aria-pressed={isSelected}
            aria-label={t("theme.selectAria", { name: theme.name })}
          >
            {/* ミニプレビュー */}
            <div
              className="w-full h-12 rounded-md mb-2 overflow-hidden flex flex-col"
              style={{
                backgroundColor: theme.preview.bgColor,
                border: `1px solid ${theme.preview.primaryColor}30`,
              }}
            >
              {/* コントロールバーのプレビュー */}
              <div
                className="h-4 w-full"
                style={{ backgroundColor: theme.preview.primaryColor }}
              />
              {/* カードのプレビュー */}
              <div className="flex-1 flex items-center justify-center gap-1 px-1.5">
                <div
                  className="w-6 h-5 rounded-sm"
                  style={{
                    backgroundColor: theme.preview.secondaryColor,
                    border: `1px solid ${theme.preview.primaryColor}40`,
                  }}
                />
                <div
                  className="w-6 h-5 rounded-sm"
                  style={{
                    backgroundColor: theme.preview.secondaryColor,
                    border: `1px solid ${theme.preview.primaryColor}40`,
                  }}
                />
                <div
                  className="w-6 h-5 rounded-sm"
                  style={{
                    backgroundColor: theme.preview.secondaryColor,
                    border: `1px solid ${theme.preview.primaryColor}40`,
                  }}
                />
              </div>
            </div>

            {/* テーマ名 */}
            <div className="flex items-center gap-1">
              <span
                className="text-xs font-bold"
                style={{ color: "var(--dt-text)" }}
              >
                {theme.name}
              </span>
              {theme.id === "whiteboard" && (
                <Printer
                  className="size-3"
                  style={{ color: "var(--dt-text-muted)" }}
                  aria-label={t("theme.forPrint")}
                />
              )}
            </div>
            <div
              className="text-[10px]"
              style={{ color: "var(--dt-text-muted)" }}
            >
              {theme.description}
            </div>

            {/* 選択チェックマーク */}
            {isSelected && (
              <div
                className="absolute top-1.5 right-1.5 size-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--dt-current-highlight)" }}
              >
                <Check className="size-3" style={{ color: "var(--dt-text)" }} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
