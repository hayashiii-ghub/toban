import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useState } from "react";
import type { Schedule } from "@/rotation/types";

const { get, update } = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/api", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getScheduleForEdit: get,
  updateSchedule: update,
}));

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

it("再起動で未送信のローカル本文を先にPUTし、古いGETによる巻き戻しを防ぐ", async () => {
  vi.useFakeTimers();
  const local: Schedule = {
    id: "reload-local",
    name: "離脱直前に保存した変更",
    rotation: 0,
    groups: [{ id: "g1", emoji: "🧹", tasks: ["掃除"] }],
    members: [
      {
        id: "m1",
        name: "葵",
        color: "#000",
        bgColor: "#fff",
        textColor: "#000",
      },
    ],
    slug: "cloud-slug",
    editToken: "edit-token",
  };
  // This is the only additional durable data; the body still comes from AppState.
  localStorage.setItem(
    "toban-sync-recovery-v1",
    JSON.stringify([[local.id, "pending"]])
  );
  get.mockResolvedValue({ ...local, name: "古いサーバの内容" });
  update.mockResolvedValue(undefined);
  const { useAutoSync } = await import("./useAutoSync");
  const { result } = renderHook(() => {
    const [current, setCurrent] = useState(local);
    useAutoSync(current, setCurrent);
    return current;
  });
  await act(async () => {});
  expect(get).not.toHaveBeenCalled();
  expect(result.current.name).toBe(local.name);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(update).toHaveBeenCalledExactlyOnceWith(
    local.slug,
    local.editToken,
    expect.objectContaining({ name: local.name }),
    undefined
  );
  expect(result.current.name).toBe(local.name);
  expect(get).not.toHaveBeenCalled();
  expect(localStorage.getItem("toban-sync-recovery-v1")).toBe("[]");
});
