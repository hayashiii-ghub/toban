import { defineView } from "@/lib/vue";
import { motion as m } from "motion-v";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Loader2,
  Pencil,
  Printer,
  Share2,
} from "@lucide/vue";
import type { SyncStatus } from "@/lib/syncManager";
import { useT } from "@/i18n";
import { VIEW_TABS, type ViewTabValue } from "./viewTabsConfig";

// 帯の上のものは、白い面などに載せずに帯の色の上へ直接置く（home.css の .control-bar-flat）。
// 読めるかどうかは帯の字の色で決める（どのテーマもコントラスト比 4.5 以上。designThemes.test.ts が見張る）
// 印刷・共有・編集。スマホの下の帯ではアイコンの下に文字を置いて幅を詰める
const ACTION_CLASS =
  "control-bar-flat flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 h-11 sm:h-10 min-w-[2.75rem] min-[360px]:min-w-[3.25rem] px-1 sm:px-3 text-[11px] sm:text-sm font-bold leading-tight disabled:opacity-50";

const STEP_CLASS =
  "control-bar-flat h-10 w-8 min-[360px]:w-9 flex items-center justify-center disabled:opacity-50";

export interface RotationControlsProps {
  rotation: number;
  rotationLabel: string;
  isSharing: boolean;
  isDateMode?: boolean;
  /** 日付モードの交代の間隔（「7日ごとに交代」） */
  dateDetail?: string;
  isAnimating?: boolean;
  syncStatus?: SyncStatus;
  onPrint: () => void;
  onOpenSettings: () => void;
  onShare: () => void;
  onRotateForward?: () => void;
  onRotateBackward?: () => void;
  /** 表示の切り替え（カード・早見表・カレンダー・円盤）。帯の中に並べる */
  viewTab: ViewTabValue;
  onChangeView: (view: ViewTabValue) => void;
}

export const RotationControls = defineView<RotationControlsProps>(
  [
    "rotation",
    "rotationLabel",
    "isSharing",
    "isDateMode",
    "dateDetail",
    "isAnimating",
    "syncStatus",
    "onPrint",
    "onOpenSettings",
    "onShare",
    "onRotateForward",
    "onRotateBackward",
    "viewTab",
    "onChangeView",
  ],
  props => {
    const t = useT();
    return () => {
      const {
        rotation,
        rotationLabel,
        isSharing,
        isDateMode,
        dateDetail,
        isAnimating,
        syncStatus,
        onPrint,
        onOpenSettings,
        onShare,
        onRotateForward,
        onRotateBackward,
        viewTab,
        onChangeView,
      } = props;

      return (
        // スマホは Home の .home-bottom-panel で画面の下に固定される（親指の届く位置）。
        // PC はタイトルの下にヘッダーとして置く
        <div class="rotation-no-print sm:px-4 sm:pb-3">
          <div class="sm:max-w-4xl sm:mx-auto">
            <m.div
              class="theme-border theme-shadow max-sm:shadow-none max-sm:border-x-0 max-sm:border-b-0 sm:rounded-[var(--dt-border-radius)] px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:p-2.5 flex flex-wrap lg:grid lg:grid-cols-[1fr_auto_1fr] items-center justify-between gap-x-2 gap-y-1.5 sm:gap-y-2.5"
              style={{
                backgroundColor: "var(--dt-control-bar-bg)",
                color: "var(--dt-control-bar-text)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              {/* 並び: スマホは表示の切り替えを上の段、その下に順番と操作。PC（lg 以上）は 1 行で
              順番・表示の切り替え（真ん中）・操作。そのあいだの幅では、表示の切り替えを 2 段目に回す */}
              <div
                class="order-2 sm:order-1 flex items-center min-w-0"
                data-onboarding="rotation-controls"
              >
                {isDateMode ? (
                  <div class="flex items-center gap-2 h-11 sm:h-10 px-1 min-w-0">
                    <CalendarDays
                      class="size-4 shrink-0 hidden min-[360px]:block"
                      aria-hidden="true"
                    />
                    <div class="min-w-0 leading-tight">
                      <div class="text-[13px] min-[360px]:text-sm sm:text-base font-bold whitespace-nowrap">
                        {rotationLabel}
                      </div>
                      {dateDetail && (
                        <div class="text-[11px] sm:text-xs mt-0.5 whitespace-nowrap">
                          {dateDetail}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div class="flex items-center h-11 sm:h-10">
                    {onRotateBackward && (
                      <button
                        type="button"
                        onClick={onRotateBackward}
                        disabled={isAnimating}
                        class={STEP_CLASS}
                        aria-label={t("rotation.prevAria")}
                      >
                        <ChevronLeft class="size-4" />
                      </button>
                    )}
                    <div
                      class="min-w-[3rem] sm:min-w-[4rem] px-1 text-center text-sm sm:text-base whitespace-nowrap"
                      style={{ fontWeight: "var(--dt-font-weight-extra)" }}
                      aria-label={t("rotation.currentAria", { n: rotation })}
                    >
                      {rotationLabel}
                    </div>
                    {onRotateForward && (
                      <button
                        type="button"
                        onClick={onRotateForward}
                        disabled={isAnimating}
                        class={STEP_CLASS}
                        aria-label={t("rotation.nextAria")}
                      >
                        <ChevronRight class="size-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div
                role="group"
                aria-label={t("view.switchAria")}
                class="control-bar-views order-1 sm:order-3 lg:order-2 w-full lg:w-auto grid grid-cols-4 lg:flex gap-1"
              >
                {VIEW_TABS.map(({ value, labelKey }) => {
                  const selected = viewTab === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() => onChangeView(value)}
                      aria-pressed={selected}
                      class="control-bar-flat h-9 px-1.5 lg:px-3.5 text-xs sm:text-sm font-bold whitespace-nowrap"
                    >
                      {t(labelKey)}
                    </button>
                  );
                })}
              </div>

              <div class="order-3 sm:order-2 lg:order-3 flex items-center gap-0.5 sm:gap-1 ml-auto">
                <button
                  type="button"
                  onClick={onPrint}
                  data-onboarding="print-button"
                  class={ACTION_CLASS}
                  aria-label={t("print.printAria")}
                >
                  <Printer class="size-4" aria-hidden="true" />
                  {t("print.print")}
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  disabled={isSharing}
                  data-onboarding="share-button"
                  class={ACTION_CLASS}
                  aria-label={t("rotation.shareAria")}
                >
                  {isSharing ? (
                    <Loader2 class="size-4 animate-spin" aria-hidden="true" />
                  ) : syncStatus === "error" ? (
                    <CloudOff
                      class="size-4"
                      style={{ color: "#EF4444" }}
                      aria-label={t("rotation.syncError")}
                    />
                  ) : (
                    <Share2 class="size-4" aria-hidden="true" />
                  )}
                  {t("common.share")}
                </button>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  data-onboarding="edit-button"
                  class={ACTION_CLASS}
                  aria-label={t("rotation.editAria")}
                >
                  <Pencil class="size-4" aria-hidden="true" />
                  {t("common.edit")}
                </button>
              </div>
            </m.div>
          </div>
        </div>
      );
    };
  }
);
