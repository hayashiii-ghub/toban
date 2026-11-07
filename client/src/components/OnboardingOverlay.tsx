import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  watchPostEffect,
  type Ref,
} from "vue";
import { defineView } from "@/lib/vue";
import { AnimatePresence, motion as m, useDomRef } from "motion-v";
import { useT } from "@/i18n";

interface OnboardingOverlayProps {
  onComplete: () => void;
}

// title / description は辞書から引く（key 単位）。selector は data 属性なので非翻訳。
// 画面の上から順に、最初に使うものだけを案内する（切り替えのタブや表示形式は見れば分かる）
const STEPS = [
  { selector: '[data-onboarding="schedule-tabs"]', key: "add" },
  { selector: '[data-onboarding="edit-button"]', key: "edit" },
  { selector: '[data-onboarding="rotation-controls"]', key: "rotation" },
  { selector: '[data-onboarding="print-button"]', key: "print" },
  { selector: '[data-onboarding="share-button"]', key: "share" },
] as const;

export const OnboardingOverlay = defineView<OnboardingOverlayProps>(
  ["onComplete"],
  props => {
    const t = useT();
    const currentStepRef = ref(0);
    const targetRectRef = shallowRef<DOMRect | null>(null);
    const tooltipRef = useDomRef() as Ref<HTMLDivElement | null>;
    const stepRef = computed(() => STEPS[currentStepRef.value]);
    watchPostEffect(onCleanup => {
      const selector = stepRef.value.selector;
      const updateTargetRect = () => {
        const element = document.querySelector(selector);
        if (element) targetRectRef.value = element.getBoundingClientRect();
      };
      updateTargetRect();
      window.addEventListener("resize", updateTargetRect);
      window.addEventListener("scroll", updateTargetRect, true);
      const observer = new ResizeObserver(updateTargetRect);
      const element = document.querySelector(selector);
      if (element) observer.observe(element);
      onCleanup(() => {
        window.removeEventListener("resize", updateTargetRect);
        window.removeEventListener("scroll", updateTargetRect, true);
        observer.disconnect();
      });
    });
    const tooltipStyleRef = computed(() => {
      const targetRect = targetRectRef.value;
      // 位置のずらしは transform ではなく x / y で渡す。motion-v が scale のアニメーションで
      // transform を上書きするため、transform に書くと上に出すはずの吹き出しが対象に重なる
      if (!targetRect) return { top: "50%", left: "50%", x: "-50%", y: "-50%" };

      const padding = 12;
      const tooltipWidth = Math.min(280, window.innerWidth - 24);
      const spaceBelow = window.innerHeight - targetRect.bottom;
      const placeBelow = spaceBelow > 160;

      let top: number;
      if (placeBelow) {
        top = targetRect.bottom + padding;
      } else {
        top = targetRect.top - padding;
      }

      let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      left = Math.max(
        12,
        Math.min(left, window.innerWidth - tooltipWidth - 12)
      );

      return {
        position: "fixed" as const,
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
        y: placeBelow ? 0 : "-100%",
      };
    });
    function handleNext() {
      if (currentStepRef.value < STEPS.length - 1) currentStepRef.value += 1;
      else props.onComplete();
    }
    function handleBack() {
      if (currentStepRef.value > 0) currentStepRef.value -= 1;
    }
    watch(
      currentStepRef,
      (_, __, onCleanup) => {
        const timer = setTimeout(() => tooltipRef.value?.focus(), 50);
        onCleanup(() => clearTimeout(timer));
      },
      { immediate: true, flush: "post" }
    );
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          props.onComplete();
          break;
        case "Enter":
        case " ":
        case "ArrowRight":
          event.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handleBack();
          break;
      }
    }
    onMounted(() => window.addEventListener("keydown", handleKeyDown));
    onScopeDispose(() => window.removeEventListener("keydown", handleKeyDown));
    return () => {
      const { onComplete } = props;
      const currentStep = currentStepRef.value;
      const targetRect = targetRectRef.value;
      const tooltipStyle = tooltipStyleRef.value;
      const step = stepRef.value;
      const stepTitle = t(`onboarding.${step.key}.title`);
      const stepDescription = t(`onboarding.${step.key}.desc`);
      const highlightPadding = 6;

      return (
        <div
          class="fixed inset-0 z-[100] rotation-no-print"
          role="dialog"
          aria-modal="true"
          aria-label={t("onboarding.guide", { title: stepTitle })}
          style={{ pointerEvents: "none" }}
        >
          <m.div
            class="fixed inset-0"
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              pointerEvents: "auto",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onComplete}
          />

          {targetRect && (
            <div
              class="fixed"
              style={{
                top: `${targetRect.top - highlightPadding}px`,
                left: `${targetRect.left - highlightPadding}px`,
                width: `${targetRect.width + highlightPadding * 2}px`,
                height: `${targetRect.height + highlightPadding * 2}px`,
                borderRadius: "8px",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                pointerEvents: "none",
                zIndex: 101,
              }}
            />
          )}

          <AnimatePresence mode="wait">
            <m.div
              key={currentStep}
              ref={tooltipRef}
              tabindex={-1}
              style={{ ...tooltipStyle, pointerEvents: "auto", zIndex: 102 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              aria-label={t("onboarding.stepAria", {
                current: currentStep + 1,
                total: STEPS.length,
                title: stepTitle,
                desc: stepDescription,
              })}
            >
              <div
                class="theme-border p-4"
                style={{
                  backgroundColor: "var(--dt-card-bg)",
                  borderRadius: "var(--dt-border-radius)",
                  border: "var(--dt-border-width) solid var(--dt-border-color)",
                  boxShadow: "var(--dt-shadow-card)",
                }}
              >
                <div
                  class="font-extrabold text-base mb-1"
                  style={{ color: "var(--dt-text)" }}
                >
                  {stepTitle}
                </div>
                <div class="text-sm mb-4" style={{ color: "#444" }}>
                  {stepDescription}
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex gap-1.5">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        class="size-2.5 rounded-full"
                        style={
                          i === currentStep
                            ? {
                                backgroundColor: "var(--dt-current-highlight)",
                                border: "2px solid var(--dt-border-color)",
                              }
                            : {
                                backgroundColor: "transparent",
                                border: "2px solid #ccc",
                              }
                        }
                      />
                    ))}
                  </div>

                  <div class="flex items-center gap-2">
                    {currentStep === 0 ? (
                      <button
                        type="button"
                        onClick={onComplete}
                        class="px-3 py-1.5 text-xs font-bold"
                        style={{ color: "var(--dt-text-muted)" }}
                      >
                        {t("onboarding.skip")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleBack}
                        class="theme-border px-3 py-1.5 text-xs font-bold transition-all duration-150 theme-hover-lift"
                        style={{
                          backgroundColor: "var(--dt-card-bg)",
                          borderRadius: "var(--dt-border-radius-sm)",
                          border: "2px solid var(--dt-border-color)",
                          boxShadow: "var(--dt-shadow-card-sm)",
                        }}
                      >
                        {t("onboarding.back")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleNext}
                      class="px-3 py-1.5 text-xs font-bold transition-all duration-150 theme-hover-lift"
                      style={{
                        backgroundColor: "var(--dt-current-highlight)",
                        borderRadius: "var(--dt-border-radius-sm)",
                        border: "2px solid var(--dt-border-color)",
                        boxShadow: "var(--dt-shadow-card-sm)",
                        color: "var(--dt-text)",
                      }}
                    >
                      {currentStep === STEPS.length - 1
                        ? t("onboarding.start")
                        : t("onboarding.next")}
                    </button>
                  </div>
                </div>
              </div>
            </m.div>
          </AnimatePresence>
        </div>
      );
    };
  }
);
