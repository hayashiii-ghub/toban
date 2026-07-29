import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useT } from "@/i18n";

interface OnboardingOverlayProps {
  onComplete: () => void;
}

// title / description は辞書から引く（key 単位）。selector は data 属性なので非翻訳。
const STEPS = [
  { selector: '[data-onboarding="schedule-tabs"]', key: "tabs" },
  { selector: '[data-onboarding="edit-button"]', key: "edit" },
  { selector: '[data-onboarding="rotation-controls"]', key: "rotation" },
  { selector: '[data-onboarding="view-tabs"]', key: "view" },
  { selector: '[data-onboarding="print-button"]', key: "print" },
  { selector: '[data-onboarding="share-button"]', key: "share" },
  { selector: '[data-onboarding="add-button"]', key: "add" },
] as const;

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const t = useT();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = STEPS[currentStep];
  const stepTitle = t(`onboarding.${step.key}.title`);
  const stepDescription = t(`onboarding.${step.key}.desc`);

  const updateTargetRect = useCallback(() => {
    const el = document.querySelector(step.selector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
  }, [step.selector]);

  useEffect(() => {
    updateTargetRect();

    const handleResize = () => updateTargetRect();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    const observer = new ResizeObserver(handleResize);
    const el = document.querySelector(step.selector);
    if (el) observer.observe(el);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
      observer.disconnect();
    };
  }, [step.selector, updateTargetRect]);

  const tooltipStyle = useMemo(() => {
    if (!targetRect)
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

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
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));

    return {
      position: "fixed" as const,
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      transform: placeBelow ? undefined : "translateY(-100%)",
    };
  }, [targetRect]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  }, [currentStep]);

  // Focus the tooltip when step changes
  useEffect(() => {
    // Small delay to let animation start before focusing
    const timer = setTimeout(() => {
      tooltipRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onComplete();
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleNext();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleBack();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handleBack, onComplete]);

  const highlightPadding = 6;

  return (
    <div
      className="fixed inset-0 z-[100] rotation-no-print"
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.guide", { title: stepTitle })}
      style={{ pointerEvents: "none" }}
    >
      <m.div
        className="fixed inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.5)", pointerEvents: "auto" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onComplete}
      />

      {targetRect && (
        <div
          className="fixed"
          style={{
            top: targetRect.top - highlightPadding,
            left: targetRect.left - highlightPadding,
            width: targetRect.width + highlightPadding * 2,
            height: targetRect.height + highlightPadding * 2,
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
          tabIndex={-1}
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
            className="theme-border p-4"
            style={{
              backgroundColor: "var(--dt-card-bg)",
              borderRadius: "var(--dt-border-radius)",
              border: "var(--dt-border-width) solid var(--dt-border-color)",
              boxShadow: "var(--dt-shadow-card)",
            }}
          >
            <div
              className="font-extrabold text-base mb-1"
              style={{ color: "var(--dt-text)" }}
            >
              {stepTitle}
            </div>
            <div className="text-sm mb-4" style={{ color: "#444" }}>
              {stepDescription}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="size-2.5 rounded-full"
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

              <div className="flex items-center gap-2">
                {currentStep === 0 ? (
                  <button
                    type="button"
                    onClick={onComplete}
                    className="px-3 py-1.5 text-xs font-bold"
                    style={{ color: "var(--dt-text-muted)" }}
                  >
                    {t("onboarding.skip")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="theme-border px-3 py-1.5 text-xs font-bold transition-all duration-150 theme-hover-lift"
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
                  className="px-3 py-1.5 text-xs font-bold transition-all duration-150 theme-hover-lift"
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
}
