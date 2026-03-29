import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabDragDrop } from "./useTabDragDrop";

const createMockDragEvent = () =>
  ({ preventDefault: vi.fn(), dataTransfer: { effectAllowed: "", dropEffect: "" } } as unknown as React.DragEvent);

describe("useTabDragDrop", () => {
  it("初期状態: draggedTabId=null, dragOverTabId=null", () => {
    const { result } = renderHook(() => useTabDragDrop(vi.fn()));
    expect(result.current.draggedTabId).toBeNull();
    expect(result.current.dragOverTabId).toBeNull();
  });

  it("onDragStartでdraggedTabIdが設定される", () => {
    const { result } = renderHook(() => useTabDragDrop(vi.fn()));
    act(() => result.current.onDragStart(createMockDragEvent(), "schedule-1"));
    expect(result.current.draggedTabId).toBe("schedule-1");
  });

  it("onDragOverでdragOverTabIdが設定される", () => {
    const { result } = renderHook(() => useTabDragDrop(vi.fn()));
    const event = createMockDragEvent();
    act(() => result.current.onDragOver(event, "schedule-2"));
    expect(result.current.dragOverTabId).toBe("schedule-2");
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("onDropでhandleTabDropが呼ばれ、状態がリセットされる", () => {
    const handleTabDrop = vi.fn();
    const { result } = renderHook(() => useTabDragDrop(handleTabDrop));
    act(() => result.current.onDragStart(createMockDragEvent(), "schedule-1"));
    act(() => result.current.onDrop(createMockDragEvent(), "schedule-2"));
    expect(handleTabDrop).toHaveBeenCalledWith("schedule-1", "schedule-2");
    expect(result.current.draggedTabId).toBeNull();
    expect(result.current.dragOverTabId).toBeNull();
  });

  it("onDragEndで両方のIDがリセットされる", () => {
    const { result } = renderHook(() => useTabDragDrop(vi.fn()));
    act(() => result.current.onDragStart(createMockDragEvent(), "schedule-1"));
    act(() => result.current.onDragOver(createMockDragEvent(), "schedule-2"));
    act(() => result.current.onDragEnd());
    expect(result.current.draggedTabId).toBeNull();
    expect(result.current.dragOverTabId).toBeNull();
  });
});
