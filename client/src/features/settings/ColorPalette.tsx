import { defineView } from "@/lib/vue";
import { Palette } from "@lucide/vue";
import type { Member } from "@/rotation/types";
import { MEMBER_PRESETS } from "@/rotation/constants";
import { useT } from "@/i18n";
interface Props {
  member: Member;
  onPresetSelect: (memberId: string, presetIdx: number) => void;
  onCustomColor: (memberId: string, hex: string) => void;
}
export const ColorPalette = defineView<Props>(
  ["member", "onPresetSelect", "onCustomColor"],
  (props, _viewContext) => {
    const t = useT();
    return () => (
      <div
        class="flex flex-wrap items-center gap-1.5"
        role="radiogroup"
        aria-label={t("color.paletteAria")}
      >
        {MEMBER_PRESETS.map((preset, pIdx) => (
          <button
            type="button"
            key={preset.color}
            class="size-6 rounded-full transition-transform hover:scale-110"
            style={{
              backgroundColor: preset.color,
              border:
                props.member.color === preset.color
                  ? "3px solid var(--dt-border-color)"
                  : "2px solid #ddd",
              transform:
                props.member.color === preset.color
                  ? "scale(1.15)"
                  : "scale(1)",
            }}
            onClick={() => props.onPresetSelect(props.member.id, pIdx)}
            role="radio"
            aria-checked={props.member.color === preset.color}
            aria-label={t("color.colorN", { n: pIdx + 1 })}
          />
        ))}
        <label
          class="size-6 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer hover:scale-110 transition-transform relative overflow-hidden"
          style={{ borderColor: "var(--dt-text-muted)" }}
        >
          <span class="sr-only">{t("color.custom")}</span>
          <Palette
            class="size-3"
            style={{ color: "var(--dt-text-muted)" }}
            aria-hidden="true"
          />
          <input
            type="color"
            value={props.member.color}
            onInput={e =>
              props.onCustomColor(
                props.member.id,
                (e.target as HTMLInputElement).value
              )
            }
            class="absolute inset-0 opacity-0 cursor-pointer"
            aria-label={t("color.custom")}
          />
        </label>
      </div>
    );
  }
);
