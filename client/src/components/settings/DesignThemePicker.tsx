import { Printer } from "lucide-react";
import {
  THEME_COLORS,
  THEME_TEXTURES,
  composeTheme,
  composeThemeId,
  splitThemeId,
} from "@/rotation/designThemes";
import { useT } from "@/i18n";

interface DesignThemePickerProps {
  selectedThemeId: string | undefined;
  onSelect: (themeId: string) => void;
}

/** 質感・色それぞれのミニプレビュー。実際のカードと同じ変数で描くので見たままが出る */
function MiniCard({
  textureId,
  colorId,
}: {
  textureId: string;
  colorId: string;
}) {
  const theme = composeTheme(textureId, colorId);
  return (
    <div
      className="w-full h-11 mb-1.5 overflow-hidden flex flex-col"
      style={{
        backgroundColor: theme.preview.bgColor,
        borderRadius: theme.borders.radius,
      }}
    >
      <div
        className="h-3.5 w-full shrink-0"
        style={{ backgroundColor: theme.preview.primaryColor }}
      />
      <div className="flex-1 flex items-center justify-center px-2">
        <div
          className="w-full h-5"
          style={{
            backgroundColor: theme.colors.cardBg,
            backgroundImage: theme.surface?.texture,
            borderRadius: theme.borders.radiusSm,
            border: `${theme.borders.width} solid ${theme.colors.borderColor}`,
            boxShadow: theme.shadows.cardSm,
          }}
        />
      </div>
    </div>
  );
}

function PickerButton({
  isSelected,
  label,
  ariaLabel,
  onClick,
  children,
}: {
  isSelected: boolean;
  label: React.ReactNode;
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative theme-border p-2 text-left transition-all duration-150 flex flex-col justify-start ${
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
      aria-label={ariaLabel}
    >
      {children}
      <div className="flex items-center gap-1">
        <span className="text-xs font-bold" style={{ color: "var(--dt-text)" }}>
          {label}
        </span>
      </div>
    </button>
  );
}

export function DesignThemePicker({
  selectedThemeId,
  onSelect,
}: DesignThemePickerProps) {
  const t = useT();
  // 旧テーマの単体IDは、対応する質感（なければ既定）× その色として選択状態を表示する
  const { textureId, colorId } = splitThemeId(selectedThemeId);

  return (
    <div className="flex flex-col gap-3 p-0.5">
      <section>
        <h3
          className="text-xs font-bold mb-1.5"
          style={{ color: "var(--dt-text-secondary)" }}
        >
          {t("theme.textureLabel")}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {THEME_TEXTURES.map(texture => (
            <PickerButton
              key={texture.id}
              isSelected={texture.id === textureId}
              label={t(texture.labelKey)}
              ariaLabel={t("theme.selectAria", {
                name: t(texture.labelKey),
              })}
              onClick={() => onSelect(composeThemeId(texture.id, colorId))}
            >
              <MiniCard textureId={texture.id} colorId={colorId} />
            </PickerButton>
          ))}
        </div>
      </section>

      <section>
        <h3
          className="text-xs font-bold mb-1.5"
          style={{ color: "var(--dt-text-secondary)" }}
        >
          {t("theme.colorLabel")}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {THEME_COLORS.map(color => (
            <PickerButton
              key={color.id}
              isSelected={color.id === colorId}
              label={
                <>
                  {t(color.labelKey)}
                  {color.id === "whiteboard" && (
                    <Printer
                      className="inline size-3 ml-1 align-[-1px]"
                      style={{ color: "var(--dt-text-muted)" }}
                      aria-label={t("theme.forPrint")}
                    />
                  )}
                </>
              }
              ariaLabel={t("theme.selectAria", { name: t(color.labelKey) })}
              onClick={() => onSelect(composeThemeId(textureId, color.id))}
            >
              <MiniCard textureId={textureId} colorId={color.id} />
            </PickerButton>
          ))}
        </div>
      </section>

      <p className="text-[10px]" style={{ color: "var(--dt-text-muted)" }}>
        {composeTheme(textureId, colorId).description}
      </p>
    </div>
  );
}
