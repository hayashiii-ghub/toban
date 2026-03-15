import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface OnboardingOverlayProps {
  onComplete: () => void;
}

const STEPS = [
  {
    selector: '[data-onboarding="step-1"]',
    title: "複数の当番表",
    description: "タブで当番表を切り替えられます",
  },
  {
    selector: '[data-onboarding="step-2"]',
    title: "ローテーション操作",
    description: "「進む」「戻る」でローテーションを回せます",
  },
  {
    selector: '[data-onboarding="step-3"]',
    title: "編集機能",
    description: "タスクや担当者を自由に編集できます",
  },
  {
    selector: '[data-onboarding="step-4"]',
    title: "共有機能",
    description: "QRコードやURLで他の人と共有できます",
  },
] as const;

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = STEPS[currentStep];

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
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const padding = 12;
    const tooltipWidth = 280;
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
      setCurrentStep((s) => s + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const highlightPadding = 6;

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: "none" }}>
      <motion.div
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
        <motion.div
          key={currentStep}
          style={{ ...tooltipStyle, pointerEvents: "auto", zIndex: 102 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="brutal-border p-4"
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              border: "3px solid #1a1a1a",
              boxShadow: "4px 4px 0px #1a1a1a",
            }}
          >
            <div className="font-extrabold text-base mb-1" style={{ color: "#1a1a1a" }}>
              {step.title}
            </div>
            <div className="text-sm mb-4" style={{ color: "#444" }}>
              {step.description}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full"
                    style={
                      i === currentStep
                        ? { backgroundColor: "#FBBF24", border: "2px solid #1a1a1a" }
                        : { backgroundColor: "transparent", border: "2px solid #ccc" }
                    }
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {currentStep === 0 ? (
                  <button
                    onClick={onComplete}
                    className="px-3 py-1.5 text-xs font-bold"
                    style={{ color: "#888" }}
                  >
                    スキップ
                  </button>
                ) : (
                  <button
                    onClick={handleBack}
                    className="brutal-border px-3 py-1.5 text-xs font-bold transition-all duration-150 hover:translate-x-[-1px] hover:translate-y-[-1px]"
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: "8px",
                      border: "2px solid #1a1a1a",
                      boxShadow: "2px 2px 0px #1a1a1a",
                    }}
                  >
                    戻る
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-3 py-1.5 text-xs font-bold transition-all duration-150 hover:translate-x-[-1px] hover:translate-y-[-1px]"
                  style={{
                    backgroundColor: "#FBBF24",
                    borderRadius: "8px",
                    border: "2px solid #1a1a1a",
                    boxShadow: "2px 2px 0px #1a1a1a",
                    color: "#1a1a1a",
                  }}
                >
                  {currentStep === STEPS.length - 1 ? "始める！" : "次へ"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
