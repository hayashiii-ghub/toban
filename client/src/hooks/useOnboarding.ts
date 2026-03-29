import { useCallback, useEffect, useState } from "react";
import { ONBOARDING_STORAGE_KEY } from "@/rotation/constants";
import { safeGetItem, safeSetItem } from "@/lib/storage";

export function useOnboarding(deps: {
  hasSchedule: boolean;
  isModalOpen: boolean;
  isShareOpen: boolean;
}): { showOnboarding: boolean; handleOnboardingComplete: () => void } {
  const { hasSchedule, isModalOpen, isShareOpen } = deps;
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const onboardingDone = safeGetItem(ONBOARDING_STORAGE_KEY) === "true";
    if (onboardingDone || isModalOpen || isShareOpen || !hasSchedule) return;
    const timer = window.setTimeout(() => setShowOnboarding(true), 800);
    return () => window.clearTimeout(timer);
  }, [hasSchedule, isModalOpen, isShareOpen]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    safeSetItem(ONBOARDING_STORAGE_KEY, "true");
  }, []);

  return { showOnboarding, handleOnboardingComplete };
}
