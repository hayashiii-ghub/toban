import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@/test/vue";
import { ONBOARDING_STORAGE_KEY } from "@/rotation/constants";
import { useOnboarding } from "./useOnboarding";
const ready = { hasSchedule: true, isModalOpen: false, isShareOpen: false };
async function renderOnboarding(deps = ready) {
  const view = renderHook(() => useOnboarding(deps));
  await act(() => {
    vi.advanceTimersByTime(800);
  });
  return view;
}
describe("useOnboarding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it("オンボーディング済みの場合は表示しない", async () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    const { result } = await renderOnboarding();
    expect(result.current.showOnboarding).toBe(false);
  });
  it("条件が揃えば800ms後に表示する", async () => {
    const { result } = renderHook(() => useOnboarding(ready));
    expect(result.current.showOnboarding).toBe(false);
    await act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current.showOnboarding).toBe(true);
  });
  it("モーダルが開いている場合は表示しない", async () => {
    const { result } = await renderOnboarding({ ...ready, isModalOpen: true });
    expect(result.current.showOnboarding).toBe(false);
  });
  it("完了すると保存され、次に開いたときは表示しない", async () => {
    const first = await renderOnboarding();
    expect(first.result.current.showOnboarding).toBe(true);
    await act(() => {
      first.result.current.handleOnboardingComplete();
    });
    expect(first.result.current.showOnboarding).toBe(false);
    first.unmount();
    const second = await renderOnboarding();
    expect(second.result.current.showOnboarding).toBe(false);
  });
});
