import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRotationAnimation } from "./useRotationAnimation";
import { ANIMATION_DURATION_MS } from "@/rotation/constants";

describe("useRotationAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createSetState = () => vi.fn() as React.Dispatch<React.SetStateAction<import("@shared/types").AppState>>;

  it("初期状態: isAnimating=false, direction='forward'", () => {
    const setState = createSetState();
    const { result } = renderHook(() => useRotationAnimation(setState));
    expect(result.current.isAnimating).toBe(false);
    expect(result.current.direction).toBe("forward");
  });

  it("handleRotate('forward')でisAnimating=true, direction='forward'になる", () => {
    const setState = createSetState();
    const { result } = renderHook(() => useRotationAnimation(setState));
    act(() => result.current.handleRotate("forward"));
    expect(result.current.isAnimating).toBe(true);
    expect(result.current.direction).toBe("forward");
  });

  it("handleRotate('backward')でdirection='backward'になる", () => {
    const setState = createSetState();
    const { result } = renderHook(() => useRotationAnimation(setState));
    act(() => result.current.handleRotate("backward"));
    expect(result.current.isAnimating).toBe(true);
    expect(result.current.direction).toBe("backward");
  });

  it("isAnimating中はhandleRotateが無視される", () => {
    const setState = createSetState();
    const { result } = renderHook(() => useRotationAnimation(setState));
    act(() => result.current.handleRotate("forward"));
    expect(setState).toHaveBeenCalledTimes(1);
    act(() => result.current.handleRotate("backward"));
    expect(setState).toHaveBeenCalledTimes(1);
    expect(result.current.direction).toBe("forward");
  });

  it("ANIMATION_DURATION_MS後にisAnimatingがfalseに戻る", () => {
    const setState = createSetState();
    const { result } = renderHook(() => useRotationAnimation(setState));
    act(() => result.current.handleRotate("forward"));
    expect(result.current.isAnimating).toBe(true);
    act(() => { vi.advanceTimersByTime(ANIMATION_DURATION_MS); });
    expect(result.current.isAnimating).toBe(false);
  });

  it("setStateが正しい更新関数で呼ばれる", () => {
    const setState = createSetState();
    const { result } = renderHook(() => useRotationAnimation(setState));
    act(() => result.current.handleRotate("forward"));
    expect(setState).toHaveBeenCalledTimes(1);
    const updater = setState.mock.calls[0][0] as (prev: import("@shared/types").AppState) => import("@shared/types").AppState;
    const prev: import("@shared/types").AppState = {
      activeScheduleId: "s1",
      schedules: [{
        id: "s1", name: "test", rotation: 0,
        groups: [{ id: "g1", emoji: "🧹", tasks: ["掃除"] }],
        members: [
          { id: "m1", name: "A", color: "#000", bgColor: "#fff", textColor: "#000" },
          { id: "m2", name: "B", color: "#000", bgColor: "#fff", textColor: "#000" },
        ],
      }],
    };
    const next = updater(prev);
    expect(next.schedules[0].rotation).toBe(1);
  });
});
