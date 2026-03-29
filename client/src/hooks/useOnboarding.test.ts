import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/rotation/constants", () => ({
  ONBOARDING_STORAGE_KEY: "test-onboarding-key",
}));

const mockSafeGetItem = vi.fn<(key: string) => string | null>();
const mockSafeSetItem = vi.fn<(key: string, value: string) => void>();
vi.mock("@/lib/storage", () => ({
  safeGetItem: (...args: unknown[]) => mockSafeGetItem(...(args as [string])),
  safeSetItem: (...args: unknown[]) => mockSafeSetItem(...(args as [string, string])),
}));

import { useOnboarding } from "./useOnboarding";

describe("useOnboarding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSafeGetItem.mockReset();
    mockSafeSetItem.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("オンボーディング済みの場合は表示しない", () => {
    mockSafeGetItem.mockReturnValue("true");
    const { result } = renderHook(() =>
      useOnboarding({ hasSchedule: true, isModalOpen: false, isShareOpen: false }),
    );
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.showOnboarding).toBe(false);
  });

  it("条件が揃えば800ms後に表示する", () => {
    mockSafeGetItem.mockReturnValue(null);
    const { result } = renderHook(() =>
      useOnboarding({ hasSchedule: true, isModalOpen: false, isShareOpen: false }),
    );
    expect(result.current.showOnboarding).toBe(false);
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.showOnboarding).toBe(true);
  });

  it("モーダルが開いている場合は表示しない", () => {
    mockSafeGetItem.mockReturnValue(null);
    const { result } = renderHook(() =>
      useOnboarding({ hasSchedule: true, isModalOpen: true, isShareOpen: false }),
    );
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.showOnboarding).toBe(false);
  });

  it("handleOnboardingCompleteでlocalStorageに保存して非表示にする", () => {
    mockSafeGetItem.mockReturnValue(null);
    const { result } = renderHook(() =>
      useOnboarding({ hasSchedule: true, isModalOpen: false, isShareOpen: false }),
    );
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.showOnboarding).toBe(true);

    act(() => { result.current.handleOnboardingComplete(); });
    expect(result.current.showOnboarding).toBe(false);
    expect(mockSafeSetItem).toHaveBeenCalledWith("test-onboarding-key", "true");
  });
});
