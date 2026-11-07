import { Check } from "@lucide/vue";
import { defineView } from "@/lib/vue";
import { onMounted, type CSSProperties } from "vue";
import { APP_FONTS, ensureFontLoaded } from "@/fonts";
import { useT } from "@/i18n";
import type { FontId } from "@shared/appearance";
interface FontPickerProps {
  selectedFontId: FontId;
  onSelect: (fontId: FontId) => void;
}
export const FontPicker = defineView<FontPickerProps>(
  ["selectedFontId", "onSelect"],
  (props, _viewContext) => {
    const t = useT();
    onMounted(() => {
      APP_FONTS.forEach(ensureFontLoaded);
    });
    return () => (
      <div class="grid grid-cols-2 gap-2 p-0.5">
        {APP_FONTS.map(font => {
          const isSelected = props.selectedFontId === font.id;
          return (
            <button
              key={font.id}
              type="button"
              onClick={() => props.onSelect(font.id)}
              class={`relative theme-border p-3 text-left transition-all duration-150 ${isSelected ? "ring-2 ring-offset-1" : "hover:opacity-80"}`}
              style={{
                borderRadius: "var(--dt-border-radius-sm)",
                backgroundColor: "var(--dt-card-bg)",
                ...(isSelected
                  ? ({
                      "--tw-ring-color": "var(--dt-current-highlight)",
                    } as CSSProperties)
                  : {}),
              }}
              aria-pressed={isSelected}
              aria-label={t("font.selectAria", { name: t(font.labelKey) })}
            >
              <div
                class="text-xl leading-tight"
                style={{
                  fontFamily: font.family,
                  fontWeight: font.weights.bold,
                  color: "var(--dt-text)",
                }}
              >
                {t("font.sample")}
              </div>
              <div
                class="text-xs mt-1.5 font-bold"
                style={{ color: "var(--dt-text-secondary)" }}
              >
                {t(font.labelKey)}
              </div>
              {isSelected && (
                <div
                  class="absolute top-1.5 right-1.5 size-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "var(--dt-current-highlight)" }}
                >
                  <Check class="size-3" style={{ color: "var(--dt-text)" }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }
);
