import type { Ref } from "vue";
import { defineView, stateSetter } from "@/lib/vue";
import { computed, shallowRef } from "vue";
import { motion as m, AnimatePresence, useDomRef } from "motion-v";
import { ChevronDown, FileText, Plus, Search, X } from "@lucide/vue";
import type { ScheduleTemplate } from "@/rotation/types";
import { getTemplates } from "@shared/template-localization";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORIES_EN,
} from "@shared/template-categories";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSheetSwipe } from "@/hooks/useSheetSwipe";
import { SheetHandle } from "./SheetHandle";
import { useT, useLocale } from "@/i18n";
import { TemplateSetupStep } from "./TemplateSetupStep";
const TEMPLATE_SECTIONS = [
  { id: "office", from: 0, to: 2, defaultOpen: false },
  { id: "kindergarten", from: 2, to: 7, defaultOpen: false },
  { id: "school", from: 7, to: 13, defaultOpen: false },
  { id: "faculty", from: 13, to: 14, defaultOpen: false },
  { id: "pta", from: 14, to: 18, defaultOpen: false },
  { id: "care", from: 18, to: 21, defaultOpen: false },
  { id: "community", from: 21, to: 23, defaultOpen: false },
  { id: "restaurant", from: 23, to: 24, defaultOpen: false },
  { id: "home", from: 24, to: 26, defaultOpen: false },
  { id: "other", from: 26, to: 28, defaultOpen: false },
  { id: "checklist", from: 28, to: 31, defaultOpen: false },
];
function normalizeForSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}
interface Props {
  onSelect: (template: ScheduleTemplate) => void;
  onClose: () => void;
}
export const NewScheduleModal = defineView<Props>(
  ["onSelect", "onClose"],
  (props, _viewContext) => {
    const t = useT();
    const { locale } = useLocale();
    const localizedTemplates = computed(() => getTemplates(locale.value));
    const customTemplate = computed(
      () => localizedTemplates.value[localizedTemplates.value.length - 1]
    );
    const modalRef: Ref<HTMLDivElement | null> = useDomRef();
    const openSections = shallowRef<Set<string>>(
        (() =>
          new Set(
            TEMPLATE_SECTIONS.flatMap(s => (s.defaultOpen ? [s.id] : []))
          ))()
      ),
      setOpenSections = stateSetter(openSections);
    const query = shallowRef(""),
      setQuery = stateSetter(query);
    const setupTemplate = shallowRef<ScheduleTemplate | null>(null),
      setSetupTemplate = stateSetter(setupTemplate);
    const sectionLabel = (id: string) =>
      locale.value === "en"
        ? TEMPLATE_CATEGORIES_EN[id].label
        : TEMPLATE_CATEGORIES.find(cat => cat.id === id)!.label;
    const needle = computed(() => normalizeForSearch(query.value.trim()));
    const results = computed(() =>
      needle.value
        ? TEMPLATE_SECTIONS.flatMap(section =>
            localizedTemplates.value
              .slice(section.from, section.to)
              .filter(template =>
                normalizeForSearch(
                  [
                    template.name,
                    sectionLabel(section.id),
                    ...template.groups.flatMap(g => g.tasks),
                  ].join(" ")
                ).includes(needle.value)
              )
          )
        : []
    );
    const handleEscape = () => props.onClose();
    useEscapeKey(handleEscape);
    useFocusTrap(modalRef, true);
    const handleSheetSwipe = useSheetSwipe(modalRef, props.onClose);
    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === e.currentTarget) {
        props.onClose();
      }
    };
    const toggleSection = (label: string) => {
      setOpenSections(prev => {
        const next = new Set(prev);
        if (next.has(label)) {
          next.delete(label);
        } else {
          next.add(label);
        }
        return next;
      });
    };
    return () => (
      <m.div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 rotation-no-print"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-schedule-title"
      >
        <m.div
          ref={modalRef}
          class="theme-border theme-shadow w-full max-w-md modal-max-h overflow-hidden flex flex-col sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl"
          style={{ backgroundColor: "var(--dt-card-bg)" }}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          {/* ヘッダー。スマホでは下になでると閉じる */}
          <div
            class="relative flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 max-sm:touch-none"
            style={{
              borderBottom:
                "var(--dt-border-width) solid var(--dt-border-color)",
            }}
            onPointerdown={handleSheetSwipe}
          >
            <SheetHandle />
            <h2
              id="new-schedule-title"
              class="text-lg font-extrabold"
              style={{ color: "var(--dt-text)" }}
            >
              <FileText
                class="size-5 inline-block mr-2 -mt-0.5"
                aria-hidden="true"
              />
              {t("newSchedule.title")}
            </h2>
            <button
              type="button"
              onClick={props.onClose}
              class="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t("common.close")}
            >
              <X class="size-5" aria-hidden="true" />
            </button>
          </div>

          {/* テンプレート一覧 */}
          <div class="p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5 overflow-y-auto flex flex-col gap-1">
            {setupTemplate.value ? (
              <TemplateSetupStep
                template={setupTemplate.value}
                onBack={() => setSetupTemplate(null)}
                onCreate={props.onSelect}
              />
            ) : (
              <>
                <p
                  class="text-sm font-bold mb-2"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {t("newSchedule.instruction")}
                </p>

                {/* 新しくつくる（カスタム） */}
                <button
                  type="button"
                  onClick={() => props.onSelect(customTemplate.value)}
                  class="theme-border theme-shadow-sm p-3 sm:p-4 w-full text-left transition-all duration-150 theme-hover-lift mb-2"
                  style={{
                    borderRadius: "var(--dt-border-radius)",
                    backgroundColor: "var(--dt-current-highlight)",
                  }}
                >
                  <div class="flex items-center gap-3">
                    <Plus
                      class="size-6"
                      style={{ color: "var(--dt-text)" }}
                      aria-hidden="true"
                    />
                    <div class="min-w-0">
                      <div
                        class="text-sm font-extrabold"
                        style={{ color: "var(--dt-text)" }}
                      >
                        {t("newSchedule.createBlank")}
                      </div>
                      <div
                        class="text-xs font-medium mt-0.5"
                        style={{ color: "var(--dt-text-secondary)" }}
                      >
                        {t("newSchedule.createBlankDesc")}
                      </div>
                    </div>
                  </div>
                </button>

                {/* 探す */}
                <label class="relative block mb-1">
                  <Search
                    class="size-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--dt-text-muted)" }}
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={query.value}
                    onInput={e =>
                      setQuery((e.target as HTMLInputElement).value)
                    }
                    placeholder={t("newSchedule.searchPlaceholder")}
                    aria-label={t("newSchedule.searchAria")}
                    class="w-full dt-field pl-9 pr-3 py-2.5 text-sm"
                  />
                </label>

                {needle.value ? (
                  results.value.length > 0 ? (
                    <div class="flex flex-col gap-2 p-1">
                      {results.value.map(template => (
                        <TemplateButton
                          key={template.name}
                          template={template}
                          onSelect={setSetupTemplate}
                        />
                      ))}
                    </div>
                  ) : (
                    <p
                      class="text-sm py-6 text-center"
                      style={{ color: "var(--dt-text-muted)" }}
                    >
                      {t("newSchedule.noResults", {
                        query: query.value.trim(),
                      })}
                    </p>
                  )
                ) : (
                  <>
                    {/* テンプレートセクション */}
                    {TEMPLATE_SECTIONS.map(section => {
                      const isOpen = openSections.value.has(section.id);
                      const templates = localizedTemplates.value.slice(
                        section.from,
                        section.to
                      );
                      const category = TEMPLATE_CATEGORIES.find(
                        cat => cat.id === section.id
                      )!;
                      const label =
                        locale.value === "en"
                          ? TEMPLATE_CATEGORIES_EN[section.id].label
                          : category.label;
                      return (
                        <div key={section.id}>
                          <button
                            type="button"
                            onClick={() => toggleSection(section.id)}
                            class="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <span
                              class="text-sm font-extrabold tracking-wider"
                              style={{ color: "var(--dt-text-secondary)" }}
                            >
                              {category.emoji} {label}
                            </span>
                            <ChevronDown
                              class="size-4 transition-transform duration-200"
                              style={{
                                color: "var(--dt-text-muted)",
                                transform: isOpen
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                              }}
                              aria-hidden="true"
                            />
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <m.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                class="overflow-hidden"
                              >
                                <div
                                  class="flex flex-col gap-2 p-1"
                                  role="group"
                                  aria-label={label}
                                >
                                  {templates.map((template, idx) => (
                                    <TemplateButton
                                      key={section.from + idx}
                                      template={template}
                                      onSelect={setSetupTemplate}
                                    />
                                  ))}
                                </div>
                              </m.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </m.div>
      </m.div>
    );
  }
);
const TemplateButton = defineView<{
  template: ScheduleTemplate;
  onSelect: (template: ScheduleTemplate) => void;
}>(["template", "onSelect"], (props, _viewContext) => {
  const t = useT();
  const { locale } = useLocale();
  const separator = computed(() => (locale.value === "en" ? " · " : " ・ "));
  return () => (
    <button
      type="button"
      onClick={() => props.onSelect(props.template)}
      class="theme-border theme-shadow-sm p-3 sm:p-4 w-full text-left transition-all duration-150 theme-hover-lift"
      style={{
        borderRadius: "var(--dt-border-radius)",
        backgroundColor: "#FAFAFA",
      }}
    >
      <div class="flex items-center gap-3">
        <span class="text-2xl" aria-hidden="true">
          {props.template.emoji}
        </span>
        <div class="min-w-0">
          <div
            class="text-sm font-extrabold"
            style={{ color: "var(--dt-text)" }}
          >
            {props.template.name}
          </div>
          <div
            class="text-xs font-medium mt-0.5 truncate"
            style={{ color: "var(--dt-text-muted)" }}
          >
            {t(
              `templateSummary.${props.template.assignmentMode === "task" ? "task" : "group"}.${props.template.groups.length === 1 ? "one" : "other"}`,
              { count: props.template.groups.length }
            )}
            {separator.value}
            {t(
              `templateSummary.member.${props.template.members.length === 1 ? "one" : "other"}`,
              { count: props.template.members.length }
            )}
            {props.template.groups.length > 0 && (
              <span>
                {separator.value}
                {props.template.groups
                  .map(g => g.tasks.join(locale.value === "en" ? ", " : "、"))
                  .join(" / ")}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
});
