import type { Ref } from "vue";
import { defineView, stateSetter } from "@/lib/vue";
import { computed, shallowRef, useId } from "vue";
import { motion as m, useDomRef } from "motion-v";
import { X, Save, Copy, Trash2, ArrowUpRight } from "@lucide/vue";
import type {
  AssignmentMode,
  TaskGroup,
  Member,
  RotationConfig,
} from "@/rotation/types";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useSheetSwipe } from "@/hooks/useSheetSwipe";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { SITE_LINKS } from "@/components/siteLinks";
import type { ScheduleSettings } from "@/hooks/useScheduleManager";
import { TaskGroupEditor } from "./TaskGroupEditor";
import { ScheduleNameField } from "@/features/settings/ScheduleNameField";
import { DesignThemePicker } from "./DesignThemePicker";
import { FontPicker } from "./FontPicker";
import { RotationConfigEditor } from "./RotationConfigEditor";
import { getThemeById, getThemeLabel } from "@/rotation/designThemes";
import { applyFont, getFontById } from "@/fonts";
import type { FontId } from "@shared/appearance";
import { applyThemeToRoot } from "@/contexts/DesignThemeContext";
import { SheetHandle } from "@/components/SheetHandle";
import { useLocale, useT, type MessageKey } from "@/i18n";
import { useSettingsDraft } from "@/features/settings/useSettingsDraft";
import { prepareSettingsSave } from "@/features/settings/settingsDraft";
interface Props {
  scheduleName: string;
  groups: TaskGroup[];
  members: Member[];
  rotationConfig?: RotationConfig;
  pinned?: boolean;
  assignmentMode?: AssignmentMode;
  designThemeId?: string;
  fontId?: FontId;
  canDelete: boolean;
  onSave: (settings: ScheduleSettings) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}
type EditorTab = "content" | "rotation" | "appearance" | "advanced";
// 上に並べて、どの項目にもすぐ移れるようにする（開いた項目を閉じないと下が見えない、をなくす）
const EDITOR_TABS: {
  id: EditorTab;
  label: MessageKey;
}[] = [
  { id: "content", label: "settings.sectionContent" },
  { id: "rotation", label: "settings.sectionRotation" },
  { id: "appearance", label: "settings.sectionAppearance" },
  { id: "advanced", label: "settings.sectionAdvanced" },
];
export const SettingsModal = defineView<Props>(
  [
    "scheduleName",
    "groups",
    "members",
    "rotationConfig",
    "pinned",
    "assignmentMode",
    "designThemeId",
    "fontId",
    "canDelete",
    "onSave",
    "onDuplicate",
    "onDelete",
    "onClose",
  ],
  (props, _viewContext) => {
    const t = useT();
    const { locale } = useLocale();
    const _editor0 = useSettingsDraft({
      name: props.scheduleName,
      groups: props.groups,
      members: props.members,
      rotationConfig: props.rotationConfig,
      pinned: props.pinned,
      assignmentMode: props.assignmentMode,
      designThemeId: props.designThemeId,
      fontId: props.fontId,
    });
    const _derived1 = computed(() => _editor0.draft);
    const validationError = shallowRef<string | null>(null),
      setValidationError = stateSetter(validationError);
    const modalRef: Ref<HTMLDivElement | null> = useDomRef();
    const handleThemePreview = (themeId: string) => {
      _editor0.applyPatch({ designThemeId: themeId });
      applyThemeToRoot(getThemeById(themeId));
    };
    const handleFontPreview = (nextFontId: FontId) => {
      _editor0.applyPatch({ fontId: nextFontId });
      applyFont(getFontById(nextFontId));
    };
    const handleAssignmentModeChange = (mode: AssignmentMode) => {
      _editor0.changeAssignmentMode(mode, t("settings.newTask"));
    };
    const discardAndRun = (action: () => void) => {
      if (_editor0.isDirty && !window.confirm(t("settings.confirmClose")))
        return false;
      applyThemeToRoot(getThemeById(_editor0.initial.designThemeId));
      applyFont(getFontById(_editor0.initial.fontId));
      action();
      return true;
    };
    const handleCloseWithCheck = () => discardAndRun(props.onClose);
    useEscapeKey(() => handleCloseWithCheck());
    useFocusTrap(modalRef, true);
    const handleSheetSwipe = useSheetSwipe(modalRef, handleCloseWithCheck);
    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleCloseWithCheck();
      }
    };
    const handleSave = () => {
      const result = prepareSettingsSave(_editor0.draft, _editor0.initial.name);
      if (!result.ok) {
        setValidationError(t(result.key, result.params));
        selectTab("content");
        return;
      }
      setValidationError(null);
      props.onSave(result.settings);
    };
    const countLabel = (kind: "task" | "group" | "member", count: number) =>
      t(`templateSummary.${kind}.${count === 1 ? "one" : "other"}`, { count });
    const taskSummary = computed(() =>
      locale.value === "en"
        ? _derived1.value.assignmentMode === "task"
          ? `${countLabel("task", _derived1.value.groups.length)} · ${countLabel("member", _derived1.value.members.length)}`
          : `${countLabel("member", _derived1.value.members.length)} · ${countLabel("group", _derived1.value.groups.length)}`
        : _derived1.value.assignmentMode === "task"
          ? t("settings.summaryTaskMode", {
              tasks: _derived1.value.groups.length,
              members: _derived1.value.members.length,
            })
          : t("settings.summaryMemberMode", {
              members: _derived1.value.members.length,
              groups: _derived1.value.groups.length,
            })
    );
    const tabsId = useId();
    const tab = shallowRef<EditorTab>("content"),
      setTab = stateSetter(tab);
    const panelScrollRef = shallowRef<HTMLDivElement | null>(null);
    const selectTab = (next: EditorTab) => {
      setTab(next);
      if (panelScrollRef.value) panelScrollRef.value.scrollTop = 0;
    };
    const isWide = shallowRef(
      (() => window.matchMedia?.("(min-width: 640px)").matches ?? false)()
    );
    const handleTabKeyDown = (e: KeyboardEvent) => {
      const index = EDITOR_TABS.findIndex(item => item.id === tab.value);
      const moveTo = (next: number) => {
        const target =
          EDITOR_TABS[(next + EDITOR_TABS.length) % EDITOR_TABS.length];
        selectTab(target.id);
        document.getElementById(`${tabsId}-${target.id}-tab`)?.focus();
      };
      if (e.key === "ArrowRight") moveTo(index + 1);
      else if (e.key === "ArrowLeft") moveTo(index - 1);
      else if (e.key === "Home") moveTo(0);
      else if (e.key === "End") moveTo(EDITOR_TABS.length - 1);
      else return;
      e.preventDefault();
    };
    return () => (
      // スマホは下からのシート、PC は画面の真ん中のポップアップ
      <m.div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 rotation-no-print bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <m.div
          ref={modalRef}
          class="theme-border theme-shadow w-full max-w-lg sheet-fixed-h overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl"
          style={{ backgroundColor: "var(--dt-card-bg)" }}
          initial={isWide.value ? { scale: 0.95, y: 12 } : { y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={isWide.value ? { scale: 0.95, y: 12 } : { y: 24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {/* ヘッダー。スマホでは下になでると閉じる */}
          <div
            class="relative shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 max-sm:touch-none"
            style={{
              borderBottom:
                "var(--dt-border-width) solid var(--dt-border-color)",
            }}
            onPointerdown={handleSheetSwipe}
          >
            <SheetHandle />
            <h2
              id="settings-title"
              class="text-lg font-extrabold flex items-center gap-2"
              style={{ color: "var(--dt-text)" }}
            >
              {t("settings.title")}
              {_editor0.isDirty && (
                <span
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
                >
                  {t("settings.unsaved")}
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={handleCloseWithCheck}
              class="p-1 hover:bg-black/5 rounded-lg transition-colors"
              aria-label={t("common.close")}
            >
              <X class="size-5" aria-hidden="true" />
            </button>
          </div>

          {/* バリデーションエラー */}
          {validationError.value && (
            <div
              class="mx-4 sm:mx-5 mt-3 px-3 py-2 text-sm font-bold rounded-lg"
              style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
              role="alert"
            >
              {validationError.value}
            </div>
          )}

          {/* 項目のタブ。よく使う順に「名前と仕事」「交代のしかた」「見た目」「くわしい設定」 */}
          <div
            role="tablist"
            aria-label={t("settings.title")}
            onKeydown={handleTabKeyDown}
            // 4 つを等分して、幅いっぱいに並べる
            class="shrink-0 grid grid-cols-4 px-2 sm:px-3"
            style={{
              borderBottom:
                "var(--dt-border-width) solid var(--dt-border-color)",
            }}
          >
            {EDITOR_TABS.map(item => {
              const selected = tab.value === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`${tabsId}-${item.id}-tab`}
                  aria-selected={selected}
                  aria-controls={`${tabsId}-${item.id}-panel`}
                  tabindex={selected ? 0 : -1}
                  onClick={() => selectTab(item.id)}
                  class="px-0.5 sm:px-3 py-3 text-[11px] min-[360px]:text-xs sm:text-sm font-bold whitespace-nowrap transition-colors -mb-px"
                  style={{
                    color: selected ? "var(--dt-text)" : "var(--dt-text-muted)",
                    borderBottom: `3px solid ${selected ? "var(--dt-control-bar-bg)" : "transparent"}`,
                  }}
                >
                  {t(item.label)}
                </button>
              );
            })}
          </div>

          <div ref={panelScrollRef} class="flex-1 min-h-0 overflow-y-auto">
            {/* 名前と仕事 */}
            <div
              role="tabpanel"
              id={`${tabsId}-content-panel`}
              aria-labelledby={`${tabsId}-content-tab`}
              hidden={tab.value !== "content"}
              class="px-4 sm:px-5 py-4"
            >
              <div class="flex flex-col gap-3">
                <ScheduleNameField
                  id={`${tabsId}-name`}
                  value={_derived1.value.name}
                  label={t("settings.scheduleName")}
                  placeholder={t("settings.scheduleNamePlaceholder")}
                  onChange={name => _editor0.applyPatch({ name })}
                />
                <p class="text-xs" style={{ color: "var(--dt-text-muted)" }}>
                  {taskSummary.value}
                </p>
                <TaskGroupEditor
                  groups={_derived1.value.groups}
                  members={_derived1.value.members}
                  onGroupsChange={nextGroups =>
                    _editor0.applyPatch({ groups: nextGroups })
                  }
                  onMembersChange={nextMembers =>
                    _editor0.applyPatch({ members: nextMembers })
                  }
                  assignmentMode={_derived1.value.assignmentMode}
                />
              </div>
            </div>

            {/* 交代のしかた */}
            <div
              role="tabpanel"
              id={`${tabsId}-rotation-panel`}
              aria-labelledby={`${tabsId}-rotation-tab`}
              hidden={tab.value !== "rotation"}
              class="px-4 sm:px-5 py-4"
            >
              <RotationConfigEditor
                config={_derived1.value.rotationConfig}
                onUpdate={_editor0.updateRotationConfig}
              />
            </div>

            {/* 見た目（テーマと文字）。選ぶと後ろの当番表にもすぐ映る */}
            <div
              role="tabpanel"
              id={`${tabsId}-appearance-panel`}
              aria-labelledby={`${tabsId}-appearance-tab`}
              hidden={tab.value !== "appearance"}
              class="px-4 sm:px-5 py-4"
            >
              <div class="flex flex-col gap-5">
                <div>
                  <h3
                    class="text-xs font-bold mb-2"
                    style={{ color: "var(--dt-text-muted)" }}
                  >
                    {t("settings.sectionDesign")}
                    <span class="font-medium">
                      {t("settings.summarySeparator")}
                      {getThemeLabel(_derived1.value.designThemeId, t)}
                    </span>
                  </h3>
                  <DesignThemePicker
                    selectedThemeId={_derived1.value.designThemeId}
                    onSelect={handleThemePreview}
                  />
                </div>
                <div>
                  <h3
                    class="text-xs font-bold mb-1"
                    style={{ color: "var(--dt-text-muted)" }}
                  >
                    {t("settings.sectionFont")}
                    <span class="font-medium">
                      {t("settings.summarySeparator")}
                      {t(getFontById(_derived1.value.fontId).labelKey)}
                    </span>
                  </h3>
                  <p
                    class="text-xs mb-2"
                    style={{ color: "var(--dt-text-muted)" }}
                  >
                    {t("font.appliesToRoster")}
                  </p>
                  <FontPicker
                    selectedFontId={_derived1.value.fontId}
                    onSelect={handleFontPreview}
                  />
                </div>
              </div>
            </div>

            {/* くわしい設定（割り当ての見方と、この当番表の複製・削除） */}
            <div
              role="tabpanel"
              id={`${tabsId}-advanced-panel`}
              aria-labelledby={`${tabsId}-advanced-tab`}
              hidden={tab.value !== "advanced"}
              class="px-4 sm:px-5 py-4 flex flex-col gap-6"
            >
              <fieldset class="border-0 p-0 m-0">
                <legend
                  class="text-xs font-bold mb-1 block"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {t("settings.chooseView")}
                </legend>
                <div class="flex flex-col gap-2">
                  {(
                    [
                      [
                        "member",
                        "settings.whoDoesWhat",
                        "settings.whoDoesWhatDesc",
                      ],
                      [
                        "task",
                        "settings.whatByWhom",
                        "settings.whatByWhomDesc",
                      ],
                    ] as const
                  ).map(([mode, label, desc]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={_derived1.value.assignmentMode === mode}
                      class={`${_derived1.value.assignmentMode === mode ? "theme-border" : "dt-field"} w-full text-left px-3 py-2.5 transition-colors`}
                      style={{
                        borderRadius: "var(--dt-border-radius-sm)",
                        ...(_derived1.value.assignmentMode === mode
                          ? { backgroundColor: "var(--dt-current-highlight)" }
                          : {}),
                      }}
                      onClick={() => handleAssignmentModeChange(mode)}
                    >
                      <span
                        class="block text-sm font-bold"
                        style={{ color: "var(--dt-text)" }}
                      >
                        {t(label)}
                      </span>
                      <span
                        class="block text-xs mt-0.5"
                        style={{ color: "var(--dt-text-secondary)" }}
                      >
                        {t(desc)}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <section>
                <h3
                  class="text-xs font-bold mb-2"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {t("settings.thisRoster")}
                </h3>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => discardAndRun(props.onDuplicate)}
                    class="theme-border inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold transition-all duration-150 theme-hover-lift"
                    style={{
                      color: "var(--dt-text)",
                      backgroundColor: "var(--dt-button-bg)",
                      borderRadius: "10px",
                    }}
                  >
                    <Copy class="size-4" aria-hidden="true" />
                    {t("common.duplicate")}
                  </button>
                  {props.canDelete && (
                    <button
                      type="button"
                      onClick={() => discardAndRun(props.onDelete)}
                      class="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-red-50"
                      style={{ color: "#DC2626", borderRadius: "10px" }}
                    >
                      <Trash2 class="size-4" aria-hidden="true" />
                      {t("common.delete")}
                    </button>
                  )}
                </div>
              </section>

              <section>
                <h3
                  class="text-xs font-bold mb-1"
                  style={{ color: "var(--dt-text-muted)" }}
                >
                  {t("settings.thisApp")}
                </h3>
                {/* 書きかけを消さないよう、どれも新しいタブで開く */}
                <ul class="-mx-2">
                  {SITE_LINKS.map(link => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-3 h-11 px-2 rounded-lg text-sm font-bold transition-colors hover:bg-black/5"
                        style={{ color: "var(--dt-text)" }}
                      >
                        {link.icon}
                        <span class="flex-1">{t(link.labelKey)}</span>
                        <ArrowUpRight
                          class="size-4 opacity-50"
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          {/* フッター（保存だけ。複製と削除は「くわしい設定」とタブのメニューにある） */}
          <div
            class="shrink-0 px-4 sm:px-5 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4"
            style={{
              borderTop: "var(--dt-border-width) solid var(--dt-border-color)",
            }}
          >
            <button
              type="button"
              onClick={handleSave}
              class="theme-border theme-shadow-sm w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-150 theme-hover-lift"
              style={{
                backgroundColor: "var(--dt-control-bar-bg)",
                color: "var(--dt-control-bar-text)",
                borderRadius: "10px",
              }}
            >
              <Save class="size-4" aria-hidden="true" /> {t("common.save")}
            </button>
          </div>
        </m.div>
      </m.div>
    );
  }
);
