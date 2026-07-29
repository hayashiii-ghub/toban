import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  APP_FONTS,
  applyFont,
  ensureFontLoaded,
  getFontById,
  getSavedFontId,
  saveFontId,
} from "@/fonts";
import { useT } from "@/i18n";

interface FontPickerProps {
  /** 選択が変わったとき呼ぶ（親のサマリー更新用、任意） */
  onChange?: (fontId: string) => void;
}

export function FontPicker({ onChange }: FontPickerProps) {
  const t = useT();
  const [selected, setSelected] = useState(getSavedFontId());

  // プレビューを各フォントで見せるため、ピッカーを開いた時点で全フォントを読み込む。
  // 起動時ではなくここで読むので、既定ユーザーの初期負荷は増えない。
  useEffect(() => {
    APP_FONTS.forEach(ensureFontLoaded);
  }, []);

  const handleSelect = (fontId: string) => {
    setSelected(fontId);
    saveFontId(fontId);
    applyFont(getFontById(fontId));
    onChange?.(fontId);
  };

  return (
    <div className="grid grid-cols-2 gap-2 p-0.5">
      {APP_FONTS.map(font => {
        const isSelected = selected === font.id;
        return (
          <button
            key={font.id}
            type="button"
            onClick={() => handleSelect(font.id)}
            className={`relative theme-border p-3 text-left transition-all duration-150 ${
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
            aria-label={t("font.selectAria", { name: t(font.labelKey) })}
          >
            <div
              className="text-xl leading-tight"
              style={{
                fontFamily: font.family,
                fontWeight: font.weights.bold,
                color: "var(--dt-text)",
              }}
            >
              あいう Aa
            </div>
            <div
              className="text-xs mt-1.5 font-bold"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              {t(font.labelKey)}
            </div>
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
