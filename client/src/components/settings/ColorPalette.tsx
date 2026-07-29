import { Palette } from "lucide-react";
import type { Member } from "@/rotation/types";
import { MEMBER_PRESETS } from "@/rotation/constants";
import { useT } from "@/i18n";

interface Props {
  member: Member;
  onPresetSelect: (memberId: string, presetIdx: number) => void;
  onCustomColor: (memberId: string, hex: string) => void;
}

export function ColorPalette({ member, onPresetSelect, onCustomColor }: Props) {
  const t = useT();
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="radiogroup"
      aria-label={t("color.paletteAria")}
    >
      {MEMBER_PRESETS.map((preset, pIdx) => (
        <button
          type="button"
          key={preset.color}
          className="size-6 rounded-full transition-transform hover:scale-110"
          style={{
            backgroundColor: preset.color,
            border:
              member.color === preset.color
                ? "3px solid var(--dt-border-color)"
                : "2px solid #ddd",
            transform:
              member.color === preset.color ? "scale(1.15)" : "scale(1)",
          }}
          onClick={() => onPresetSelect(member.id, pIdx)}
          role="radio"
          aria-checked={member.color === preset.color}
          aria-label={t("color.colorN", { n: pIdx + 1 })}
        />
      ))}
      <label
        className="size-6 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer hover:scale-110 transition-transform relative overflow-hidden"
        style={{ borderColor: "#bbb" }}
      >
        <span className="sr-only">{t("color.custom")}</span>
        <Palette
          className="size-3"
          style={{ color: "#999" }}
          aria-hidden="true"
        />
        <input
          type="color"
          value={member.color}
          onChange={e => onCustomColor(member.id, e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label={t("color.custom")}
        />
      </label>
    </div>
  );
}
