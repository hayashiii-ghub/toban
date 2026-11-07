import { defineView } from "@/lib/vue";
import { type VNodeChild } from "vue";
import { Link } from "@/lib/router";
import { MEMBER_PRESETS } from "@shared/appearance";
import { LP_COLORS as C } from "./theme";
type Tone = (typeof MEMBER_PRESETS)[number];
/** 黒板の下の木枠（チョーク受け） */
export const ChalkEdge = defineView<object>([], (_props, _viewContext) => {
  return () => (
    <div
      aria-hidden="true"
      class="absolute inset-x-0 bottom-0 h-3"
      style={{ backgroundColor: C.border }}
    />
  );
});
/** テンプレートのカード。上辺の色帯と絵文字の地の色を tone で揃える */
export const TemplateCard = defineView<{
  href: string;
  emoji: string;
  name: string;
  tasks: string;
  meta?: VNodeChild;
  tone: Tone;
}>(
  ["href", "emoji", "name", "tasks", "meta", "tone"],
  (props, _viewContext) => {
    return () => (
      <Link
        href={props.href}
        class="group flex items-start gap-3 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
        style={{
          backgroundColor: C.cardBg,
          border: `1px solid ${C.line}`,
          borderTop: `4px solid ${props.tone.color}`,
          borderRadius: "8px",
        }}
      >
        <span
          aria-hidden="true"
          class="size-10 flex-shrink-0 rounded-lg flex items-center justify-center text-xl"
          style={{ backgroundColor: props.tone.bgColor }}
        >
          {props.emoji}
        </span>
        <div class="min-w-0 flex-1">
          <div class="text-sm group-hover:underline" style={{ color: C.text }}>
            {props.name}
          </div>
          <div class="text-xs mt-1 line-clamp-2" style={{ color: C.textMuted }}>
            {props.tasks}
          </div>
          {props.meta && (
            <div class="text-xs mt-1" style={{ color: C.textMuted }}>
              {props.meta}
            </div>
          )}
        </div>
      </Link>
    );
  }
);
