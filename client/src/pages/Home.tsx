import { h, onMounted, Teleport } from "vue";
import { defineView } from "@/lib/vue";
import { AnimatePresence } from "motion-v";
import { NewScheduleModal } from "@/components/NewScheduleModal";
import { ShareConfirmationDialog } from "@/components/ShareConfirmationDialog";
import { ModalHost } from "@/components/ModalHost";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { RotationControls } from "@/features/home/RotationControls";
import { ScheduleViews } from "@/features/home/ScheduleViews";
import { ScheduleHeader } from "@/features/home/ScheduleHeader";
import { ScheduleTabs } from "@/features/home/ScheduleTabs";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useHomeState } from "@/hooks/useHomeState";
import { useTobanTools } from "@/hooks/useTobanTools";
import { useTurnLabel } from "@/hooks/useTurnLabel";
import { useT } from "@/i18n";
import { SITE_TITLE } from "@shared/site";
import "./home.css";
const Home = defineView<object>([], () => {
  const s = useHomeState();
  const t = useT();
  onMounted(() => {
    // Keep the canonical root URL's search title stable. The visible app can
    // follow the visitor's language without exposing crawler locale detection
    // as a different title for the same URL.
    document.title = SITE_TITLE;
  });
  useTobanTools(s); // WebMCP tools を登録（非対応ブラウザでは no-op）
  const turn = useTurnLabel(
    () => s.activeSchedule?.rotationConfig,
    () => s.members,
    () => s.effectiveRotation
  );
  return () => {
    if (!s.activeSchedule) {
      return (
        <DesignThemeProvider themeId={undefined}>
          <main
            class="rotation-page flex-1"
            style={{ backgroundColor: "var(--dt-page-bg)" }}
          >
            <div class="max-w-md mx-auto px-4 py-16 text-center space-y-4">
              <p class="text-lg font-bold" style={{ color: "var(--dt-text)" }}>
                {t("home.empty")}
              </p>
              <p class="text-sm" style={{ color: "var(--dt-text-secondary)" }}>
                {t("home.emptyHint")}
              </p>
              <button
                type="button"
                class="theme-border px-6 py-3 font-bold theme-hover-lift transition-all duration-150"
                style={{
                  backgroundColor: "var(--dt-button-bg)",
                  borderRadius: "var(--dt-border-radius-sm)",
                  color: "var(--dt-text)",
                }}
                onClick={s.openNewSchedule}
              >
                {t("home.create")}
              </button>
            </div>
            {h(Teleport, { to: document.body }, [
              <AnimatePresence>
                {s.modal.type === "newSchedule" && (
                  <NewScheduleModal
                    onSelect={s.onAddSchedule}
                    onClose={s.closeModal}
                  />
                )}
              </AnimatePresence>,
            ])}
            {s.showOnboarding && (
              <OnboardingOverlay onComplete={s.handleOnboardingComplete} />
            )}
            <InstallPrompt />
          </main>
        </DesignThemeProvider>
      );
    }
    const scheduleName = s.activeSchedule.name;
    const rotationLabel = turn.label;
    return (
      <DesignThemeProvider
        themeId={s.activeSchedule.designThemeId}
        fontId={s.activeSchedule.fontId}
      >
        <main
          class="rotation-page flex-1"
          style={{ backgroundColor: "var(--dt-page-bg)" }}
        >
          <ScheduleHeader
            scheduleName={s.activeSchedule.name}
            localSaveStatus={s.localSaveStatus}
            rotationLabel={rotationLabel}
            isDateMode={turn.isDateMode}
          />

          {/* スマホでは下にまとめて固定し、上から「当番表のタブ・操作の帯（表示の切り替えを含む）」の順に並べる
                （並びは home.css の .home-bottom-panel）。PC はこの囲みが無いものとして上から順に置く */}
          <div class="home-bottom-panel rotation-no-print" data-home-toolbar>
            <RotationControls
              rotation={s.effectiveRotation}
              rotationLabel={turn.period}
              isSharing={s.isSharing}
              isDateMode={s.isDateMode}
              dateDetail={turn.detail}
              isAnimating={s.isAnimating}
              onPrint={() =>
                s.handlePrint(s.viewTab, scheduleName, turn.fileLabel)
              }
              onOpenSettings={s.openSettings}
              onShare={s.handleShare}
              onRotateForward={() => s.handleRotate("forward")}
              onRotateBackward={() => s.handleRotate("backward")}
              syncStatus={s.syncStatus}
              viewTab={s.viewTab}
              onChangeView={s.changeTab}
            />

            <ScheduleTabs
              schedules={s.state.schedules}
              activeScheduleId={s.state.activeScheduleId}
              onSelectSchedule={s.selectSchedule}
              onAddSchedule={s.openNewSchedule}
              onMoveTab={s.onMoveTab}
              onReorderTab={s.onReorderTab}
              onTogglePin={s.onTogglePin}
              onDuplicate={s.onDuplicateSchedule}
              onRequestDelete={s.openConfirmDelete}
            />
          </div>

          <ScheduleViews
            viewTab={s.viewTab}
            assignments={s.assignments}
            groups={s.groups}
            members={s.members}
            rotation={s.effectiveRotation}
            rotationConfig={s.activeSchedule.rotationConfig}
            assignmentMode={s.activeSchedule.assignmentMode}
            scheduleId={s.activeSchedule.id}
            calendarMonth={s.calendarMonth}
            onCalendarMonthChange={s.setCalendarMonth}
            direction={s.direction}
            stagger={s.isAnimating}
          />

          {h(Teleport, { to: document.body }, [
            <AnimatePresence>
              {s.shareConfirmation && (
                <ShareConfirmationDialog
                  scheduleName={s.shareConfirmation.scheduleName}
                  isSharing={s.isSharing}
                  onConfirm={s.confirmShare}
                  onCancel={s.cancelShareConfirmation}
                />
              )}
            </AnimatePresence>,
          ])}
          <ModalHost
            modalType={s.modal.type}
            deleteTargetId={s.modal.deleteTargetId}
            showShare={s.showShare}
            activeSchedule={s.activeSchedule}
            schedules={s.state.schedules}
            onAddSchedule={s.onAddSchedule}
            onDeleteSchedule={s.onDeleteSchedule}
            onDuplicateSchedule={s.onDuplicateSchedule}
            onSaveSettings={s.onSaveSettings}
            onCloseModal={s.closeModal}
            onRequestDelete={() => s.openConfirmDelete(s.activeSchedule!.id)}
            onCloseShare={() => s.setShowShare(false)}
          />
          {s.showOnboarding && (
            <OnboardingOverlay onComplete={s.handleOnboardingComplete} />
          )}
          <InstallPrompt />
        </main>
      </DesignThemeProvider>
    );
  };
});
export default Home;
