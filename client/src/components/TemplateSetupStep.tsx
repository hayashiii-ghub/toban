import { defineView, stateSetter } from "@/lib/vue";
import { useId, shallowRef, onMounted, computed } from "vue";
import { ChevronLeft } from "@lucide/vue";
import type { ScheduleTemplate } from "@/rotation/types";
import {
  applyMemberNames,
  parseNames,
  rotationConfigForPreset,
  type RotationPreset,
} from "@/rotation/templateSetup";
import { LIMITS } from "@shared/limits";
import { useT, type MessageKey } from "@/i18n";
const PRESETS: {
  id: RotationPreset;
  label: MessageKey;
  desc: MessageKey;
}[] = [
  {
    id: "manual",
    label: "setup.preset.manual.label",
    desc: "setup.preset.manual.desc",
  },
  {
    id: "weekly",
    label: "setup.preset.weekly.label",
    desc: "setup.preset.weekly.desc",
  },
  {
    id: "weekdays",
    label: "setup.preset.weekdays.label",
    desc: "setup.preset.weekdays.desc",
  },
];
interface Props {
  template: ScheduleTemplate;
  onBack: () => void;
  onCreate: (template: ScheduleTemplate) => void;
}
/**
 * テンプレートを選んだ直後に、名前と交代のしかたを入れる画面。
 * 名前が空なら見本の名前のまま作る（あとで編集画面で直せる）
 */
export const TemplateSetupStep = defineView<Props>(
  ["template", "onBack", "onCreate"],
  (props, _viewContext) => {
    const t = useT();
    const id = useId();
    const name = shallowRef(props.template.name),
      setName = stateSetter(name);
    const namesText = shallowRef(""),
      setNamesText = stateSetter(namesText);
    const preset = shallowRef<RotationPreset>("manual"),
      setPreset = stateSetter(preset);
    const namesRef = shallowRef<HTMLTextAreaElement | null>(null);
    onMounted(() => {
      namesRef.value?.focus();
    });
    const names = computed(() => parseNames(namesText.value));
    const tooMany = computed(() => names.value.length > LIMITS.members);
    const isTaskMode = computed(() => props.template.assignmentMode === "task");
    const duties = computed(() => props.template.groups.length);
    const sampleNames = computed(() => props.template.members.map(m => m.name));
    const hint = computed(() =>
      (() => {
        if (names.value.length === 0)
          return t("setup.membersEmpty", {
            names: sampleNames.value.slice(0, 3).join(t("setup.nameSeparator")),
          });
        if (tooMany.value) return t("setup.tooMany", { n: LIMITS.members });
        const sentences = [
          t(`setup.count.${names.value.length === 1 ? "one" : "other"}`, {
            n: names.value.length,
          }),
        ];
        if (!isTaskMode.value && names.value.length > duties.value)
          sentences.push(
            t("setup.rest", {
              g: duties.value,
              r: names.value.length - duties.value,
            })
          );
        if (!isTaskMode.value && names.value.length < duties.value)
          sentences.push(t("setup.double", { g: duties.value }));
        return sentences.join(t("setup.sentenceGap"));
      })()
    );
    const create = () => {
      if (tooMany.value) return;
      props.onCreate({
        ...props.template,
        name: name.value.trim() || props.template.name,
        ...applyMemberNames(props.template, names.value),
        rotationConfig: rotationConfigForPreset(preset.value, new Date()),
      });
    };
    return () => (
      <div class="flex flex-col gap-4">
        <button
          type="button"
          onClick={props.onBack}
          class="self-start inline-flex items-center gap-1 text-sm font-bold -ml-1 px-1 py-0.5 rounded hover:bg-black/5"
          style={{ color: "var(--dt-text-secondary)" }}
        >
          <ChevronLeft class="size-4" aria-hidden="true" />
          {t("setup.back")}
        </button>

        <div class="flex items-center gap-2">
          <span class="text-2xl" aria-hidden="true">
            {props.template.emoji}
          </span>
          <h3
            class="text-base font-extrabold"
            style={{ color: "var(--dt-text)" }}
          >
            {t("setup.heading")}
          </h3>
        </div>

        <div>
          <label
            for={`${id}-name`}
            class="text-xs font-bold mb-1 block"
            style={{ color: "var(--dt-text-muted)" }}
          >
            {t("setup.name")}
          </label>
          <input
            id={`${id}-name`}
            type="text"
            value={name.value}
            onInput={e => setName((e.target as HTMLInputElement).value)}
            maxlength={LIMITS.scheduleName}
            class="w-full dt-field px-3 py-2 text-sm font-bold"
          />
        </div>

        <div>
          <label
            for={`${id}-members`}
            class="text-xs font-bold mb-1 block"
            style={{ color: "var(--dt-text-muted)" }}
          >
            {t("setup.members")}
          </label>
          <textarea
            id={`${id}-members`}
            ref={namesRef}
            value={namesText.value}
            onInput={e => setNamesText((e.target as HTMLInputElement).value)}
            placeholder={sampleNames.value.join("\n")}
            rows={Math.min(Math.max(sampleNames.value.length, 4), 7)}
            aria-describedby={`${id}-members-hint`}
            aria-invalid={tooMany.value || undefined}
            class="w-full dt-field px-3 py-2 text-sm font-medium resize-y"
          />
          <p
            id={`${id}-members-hint`}
            class="text-xs mt-1 leading-relaxed"
            style={{
              color: tooMany.value ? "#DC2626" : "var(--dt-text-secondary)",
            }}
          >
            {hint.value}
          </p>
        </div>

        <fieldset class="border-0 p-0 m-0">
          <legend
            class="text-xs font-bold mb-1"
            style={{ color: "var(--dt-text-muted)" }}
          >
            {t("setup.rotation")}
          </legend>
          <div class="flex flex-col gap-2" role="radiogroup">
            {PRESETS.map(option => {
              const selected = preset.value === option.id;
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  key={option.id}
                  onClick={() => setPreset(option.id)}
                  // 選んでいないものも欄だと分かるよう dt-field（枠のないテーマ向け）
                  class={`${selected ? "theme-border" : "dt-field"} w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors`}
                  style={{
                    borderRadius: "var(--dt-border-radius-sm)",
                    ...(selected
                      ? { backgroundColor: "var(--dt-current-highlight)" }
                      : {}),
                  }}
                >
                  <span
                    aria-hidden="true"
                    class="size-4 shrink-0 rounded-full flex items-center justify-center"
                    style={{ border: "2px solid var(--dt-text)" }}
                  >
                    {selected && (
                      <span
                        class="size-2 rounded-full"
                        style={{ backgroundColor: "var(--dt-text)" }}
                      />
                    )}
                  </span>
                  <span class="min-w-0">
                    <span
                      class="block text-sm font-bold"
                      style={{ color: "var(--dt-text)" }}
                    >
                      {t(option.label)}
                    </span>
                    <span
                      class="block text-xs mt-0.5"
                      style={{ color: "var(--dt-text-secondary)" }}
                    >
                      {t(option.desc)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={create}
          disabled={tooMany.value}
          class="theme-border theme-shadow-sm w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 theme-hover-lift disabled:opacity-40"
          style={{
            backgroundColor: "var(--dt-control-bar-bg)",
            color: "var(--dt-control-bar-text)",
            borderRadius: "10px",
          }}
        >
          {t("setup.create")}
        </button>
      </div>
    );
  }
);
