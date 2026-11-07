import { onScopeDispose, reactive, shallowRef } from "vue";
import type { AppState } from "@shared/types";
import type { StateSetter } from "@/lib/vue";
import { ANIMATION_DURATION_MS } from "@/rotation/constants";
import { normalizeRotation } from "@/rotation/utils";

export function useRotationAnimation(setState: StateSetter<AppState>) {
  const isAnimating = shallowRef(false);
  const direction = shallowRef<"forward" | "backward">("forward");
  let animationTimeout: number | null = null;
  onScopeDispose(() => {
    if (animationTimeout !== null) window.clearTimeout(animationTimeout);
  });
  function handleRotate(nextDirection: "forward" | "backward") {
    if (isAnimating.value) return;
    isAnimating.value = true;
    direction.value = nextDirection;
    setState(previous => {
      const schedule = previous.schedules.find(
        item => item.id === previous.activeScheduleId
      );
      if (!schedule) return previous;
      const activeMembers = schedule.members.filter(member => !member.skipped);
      if (activeMembers.length === 0) return previous;
      const nextRotation =
        schedule.rotation + (nextDirection === "forward" ? 1 : -1);
      return {
        ...previous,
        schedules: previous.schedules.map(item =>
          item.id === previous.activeScheduleId
            ? {
                ...item,
                rotation: normalizeRotation(nextRotation, activeMembers.length),
              }
            : item
        ),
      };
    });
    if (animationTimeout !== null) window.clearTimeout(animationTimeout);
    animationTimeout = window.setTimeout(() => {
      isAnimating.value = false;
      animationTimeout = null;
    }, ANIMATION_DURATION_MS);
  }
  return reactive({ isAnimating, direction, handleRotate });
}
