import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState } from "@shared/types";
import { ANIMATION_DURATION_MS } from "@/rotation/constants";
import { normalizeRotation } from "@/rotation/utils";

export function useRotationAnimation(
  setState: React.Dispatch<React.SetStateAction<AppState>>,
): {
  isAnimating: boolean;
  direction: "forward" | "backward";
  handleRotate: (nextDirection: "forward" | "backward") => void;
} {
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const animationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current !== null) window.clearTimeout(animationTimeoutRef.current);
    };
  }, []);

  const handleRotate = useCallback((nextDirection: "forward" | "backward") => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(nextDirection);
    setState((prev) => {
      const schedule = prev.schedules.find((item) => item.id === prev.activeScheduleId);
      if (!schedule) return prev;
      const activeMembers = schedule.members.filter(m => !m.skipped);
      if (activeMembers.length === 0) return prev;
      const nextRotation = nextDirection === "forward" ? schedule.rotation + 1 : schedule.rotation - 1;
      return {
        ...prev,
        schedules: prev.schedules.map((item) =>
          item.id === prev.activeScheduleId
            ? { ...item, rotation: normalizeRotation(nextRotation, activeMembers.length) }
            : item,
        ),
      };
    });
    if (animationTimeoutRef.current !== null) window.clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, ANIMATION_DURATION_MS);
  }, [isAnimating, setState]);

  return { isAnimating, direction, handleRotate };
}
