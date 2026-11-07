import {
  computed,
  defineComponent,
  onScopeDispose,
  shallowRef,
  watch,
  watchEffect,
} from "vue";
import { useParams, useLocation } from "@/lib/router";
import { toast } from "vue-sonner";
import { getSchedule, ApiError, InvalidApiResponseError } from "@/lib/api";
import type { ScheduleDTO } from "@/rotation/types";
import {
  computeAssignments,
  computeDateRotationForDate,
  generateId,
} from "@/rotation/utils";
import { loadState, saveState } from "@/lib/appState";
import { ScheduleViews } from "@/features/home/ScheduleViews";
import { ViewTabs, type ViewTabValue } from "@/features/home/ViewTabs";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { Copy } from "@lucide/vue";
import { LoadingScreen } from "@/components/LoadingScreen";
import { DEFAULT_THEME_ID } from "@/rotation/defaultState";
import { PrintMenu } from "@/components/PrintMenu";
import { usePrintDateString } from "@/hooks/usePrintDateString";
import { usePrintMode } from "@/hooks/usePrintMode";
import { useTurnLabel } from "@/hooks/useTurnLabel";
import { useLocalToday } from "@/hooks/useLocalToday";
import { MyDuty, loadSharedMe, saveSharedMe } from "@/features/shared/MyDuty";
import { useT, type MessageKey } from "@/i18n";
import { getSavedFontId } from "@/fonts";
import "./home.css";

export default defineComponent(() => {
  const params = useParams<{ slug: string }>();
  const slug = computed(() => params.slug);
  const [, navigate] = useLocation();
  const t = useT();
  const today = useLocalToday();
  // Keep responses keyed by slug so an older request never renders another roster.
  const loaded = shallowRef<{
    slug: string;
    schedule: ScheduleDTO | null;
    errorKey: MessageKey | null;
  } | null>(null);
  const current = computed(() =>
    loaded.value?.slug === slug.value ? loaded.value : null
  );
  const loading = computed(() => !current.value);
  const schedule = computed(() => current.value?.schedule ?? null);
  const errorKey = computed(() => current.value?.errorKey ?? null);
  const viewTab = shallowRef<ViewTabValue>("cards");
  const setViewTab = (value: ViewTabValue) => {
    viewTab.value = value;
  };
  const meBySlug = shallowRef<Record<string, string | null>>({});
  const meId = computed(() =>
    slug.value
      ? slug.value in meBySlug.value
        ? meBySlug.value[slug.value]
        : loadSharedMe(slug.value)
      : null
  );
  const chooseMe = (memberId: string | null) => {
    const currentSlug = slug.value;
    if (!currentSlug) return;
    saveSharedMe(currentSlug, memberId);
    meBySlug.value = { ...meBySlug.value, [currentSlug]: memberId };
  };
  const printDate = usePrintDateString();
  const { handlePrint } = usePrintMode();
  watch(
    slug,
    (value, _previous, onCleanup) => {
      if (!value) return;
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });
      getSchedule(value)
        .then(data => {
          if (!cancelled)
            loaded.value = { slug: value, schedule: data, errorKey: null };
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          let key: MessageKey = "shared.error.network";
          if (error instanceof ApiError)
            key =
              error.status === 404
                ? "shared.error.notFound"
                : error.status >= 500
                  ? "shared.error.server"
                  : "shared.error.fetch";
          else if (error instanceof InvalidApiResponseError)
            key = "shared.error.fetch";
          loaded.value = { slug: value, schedule: null, errorKey: key };
        });
    },
    { immediate: true }
  );
  watchEffect(() => {
    document.title = schedule.value?.name
      ? `${schedule.value.name} - toban`
      : t("lp.docTitle");
  });
  onScopeDispose(() => {
    document.title = t("lp.docTitle");
  });
  const effectiveRotation = computed(() => {
    const current = schedule.value;
    if (!current) return 0;
    if (current.rotationConfig?.mode === "date")
      return computeDateRotationForDate(
        current.rotationConfig,
        current.members.filter(member => !member.skipped).length,
        today.value
      );
    return current.rotation;
  });
  const turn = useTurnLabel(
    () => schedule.value?.rotationConfig,
    () => schedule.value?.members ?? [],
    effectiveRotation
  );
  const assignments = computed(() =>
    schedule.value
      ? computeAssignments(
          schedule.value.groups,
          schedule.value.members,
          effectiveRotation.value,
          schedule.value.assignmentMode
        )
      : []
  );
  function handleImport() {
    const current = schedule.value;
    if (!current) return;
    const state = loadState();
    const memberIdMap = new Map<string, string>();
    const members = current.members.map(member => {
      const id = generateId("m");
      memberIdMap.set(member.id, id);
      return { ...member, id };
    });
    const copied = {
      id: generateId("s"),
      name: current.name,
      rotation: current.rotation,
      groups: current.groups.map(group => ({
        ...group,
        id: generateId("g"),
        memberIds: group.memberIds?.map(id => memberIdMap.get(id) ?? id),
      })),
      members,
      assignmentMode: current.assignmentMode,
      rotationConfig: current.rotationConfig,
      designThemeId: current.designThemeId,
      fontId: current.fontId ?? getSavedFontId(),
    };
    if (
      !saveState({
        schedules: [...state.schedules, copied],
        activeScheduleId: copied.id,
      })
    ) {
      toast.error(t("summary.saveFailed"));
      return;
    }
    toast.success(t("shared.copied"));
    void navigate("/");
  }
  return () => {
    const loadingValue = loading.value;
    const scheduleValue = schedule.value;
    const errorValue = errorKey.value;
    const viewValue = viewTab.value;
    const meValue = meId.value;
    const printValue = printDate.value;
    const rotationValue = effectiveRotation.value;
    const assignmentValues = assignments.value;
    if (loadingValue) return <LoadingScreen />;

    if (errorValue || !scheduleValue) {
      const key = errorValue ?? "shared.error.notFound";
      const isNotFound = key === "shared.error.notFound";
      return (
        <DesignThemeProvider themeId={DEFAULT_THEME_ID}>
          <div
            class="rotation-page flex-1 flex items-center justify-center p-4"
            style={{ backgroundColor: "var(--dt-page-bg)" }}
          >
            <div
              class="theme-border theme-shadow w-full max-w-md p-8 text-center"
              style={{
                borderRadius: "var(--dt-border-radius)",
                backgroundColor: "var(--dt-card-bg)",
              }}
            >
              {/* 受け取った人の過失ではないので、404 ページと同じく警告色を使わない */}
              <div
                class="theme-border size-16 mx-auto mb-5 flex items-center justify-center text-3xl"
                style={{
                  borderRadius: "50%",
                  backgroundColor: "var(--dt-current-highlight)",
                }}
                aria-hidden="true"
              >
                {isNotFound ? "🔍" : "📡"}
              </div>
              <h1
                class="text-lg font-bold mb-2"
                style={{ color: "var(--dt-text)" }}
              >
                {t(key)}
              </h1>
              <p
                class="text-sm mb-6 leading-relaxed"
                style={{ color: "var(--dt-text-secondary)" }}
              >
                {t(
                  isNotFound
                    ? "shared.error.notFoundHint"
                    : "shared.error.retryHint"
                )}
              </p>
              <div class="flex flex-col sm:flex-row gap-3 justify-center">
                {!isNotFound && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    class="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-5 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
                    style={{
                      backgroundColor: "var(--dt-control-bar-bg)",
                      color: "var(--dt-control-bar-text)",
                      borderRadius: "10px",
                    }}
                  >
                    {t("error.reload")}
                  </button>
                )}
                <a
                  href="/"
                  class="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-5 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
                  style={{
                    backgroundColor: "var(--dt-button-bg)",
                    color: "var(--dt-text)",
                    borderRadius: "10px",
                  }}
                >
                  {t("shared.createYourOwn")}
                </a>
              </div>
            </div>
          </div>
        </DesignThemeProvider>
      );
    }

    const rotationLabel = turn.label;

    return (
      <DesignThemeProvider
        themeId={scheduleValue?.designThemeId}
        fontId={scheduleValue?.fontId}
      >
        <main
          class="rotation-page flex-1"
          style={{ backgroundColor: "var(--dt-page-bg)" }}
        >
          <header class="rotation-print-header pt-6 sm:pt-8 pb-6 sm:pb-8 px-3 sm:px-4">
            <div class="max-w-4xl mx-auto text-center">
              <h1
                class="text-2xl sm:text-3xl font-extrabold rotation-no-print"
                style={{ color: "var(--dt-text)" }}
              >
                {scheduleValue.name}
              </h1>
              <div
                class="rotation-print-only text-2xl sm:text-3xl md:text-4xl tracking-tight"
                style={{
                  color: "var(--dt-text)",
                  fontWeight: "var(--dt-font-weight-extra)",
                }}
                aria-hidden="true"
              >
                {scheduleValue.name}
              </div>
              {/* 手動の「初期」「3回目」は受け取った人には意味が伝わらないので、日付モードだけ出す */}
              {turn.isDateMode && (
                <p
                  class="text-sm sm:text-base font-bold mt-2 rotation-no-print"
                  style={{ color: "var(--dt-text-secondary)" }}
                >
                  {rotationLabel}
                </p>
              )}
              <div
                class="rotation-print-only mt-3 pt-2 text-sm font-bold"
                style={{
                  color: "var(--dt-text-secondary)",
                  borderBottom: "3px solid var(--dt-border-color)",
                }}
              >
                <span class="inline-block pb-2">
                  {t(
                    turn.isDateMode
                      ? "shared.printHeaderDate"
                      : "shared.printHeader",
                    { label: rotationLabel, date: printValue }
                  )}
                </span>
              </div>
            </div>
          </header>

          <MyDuty
            slug={scheduleValue.slug}
            meId={meValue}
            groups={scheduleValue.groups}
            members={scheduleValue.members}
            rotation={rotationValue}
            rotationConfig={scheduleValue.rotationConfig}
            assignmentMode={scheduleValue.assignmentMode}
            onChange={chooseMe}
          />

          <ViewTabs viewTab={viewValue} onChangeTab={setViewTab} />

          <ScheduleViews
            highlightMemberId={meValue}
            viewTab={viewValue}
            assignments={assignmentValues}
            groups={scheduleValue.groups}
            members={scheduleValue.members}
            rotation={rotationValue}
            rotationConfig={scheduleValue.rotationConfig}
            assignmentMode={scheduleValue.assignmentMode}
            scheduleId={scheduleValue.slug}
            direction="forward"
            stagger={false}
          />

          <div class="px-3 sm:px-4 pb-8 sm:pb-12 rotation-no-print">
            <div class="max-w-4xl mx-auto text-center flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <PrintMenu
                onPrint={() =>
                  handlePrint(viewValue, scheduleValue.name, turn.fileLabel)
                }
              />
              <button
                type="button"
                onClick={handleImport}
                class="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
                style={{
                  backgroundColor: "var(--dt-control-bar-bg)",
                  color: "var(--dt-control-bar-text)",
                  borderRadius: "var(--dt-border-radius-sm)",
                }}
              >
                <Copy class="size-4" />
                {t("shared.copyToMine")}
              </button>
              <a
                href="/"
                class="inline-flex items-center justify-center px-2 py-2 text-sm font-bold underline underline-offset-4"
                style={{ color: "var(--dt-text-secondary)" }}
              >
                {t("shared.createYourOwn")}
              </a>
            </div>
          </div>
        </main>
      </DesignThemeProvider>
    );
  };
});
