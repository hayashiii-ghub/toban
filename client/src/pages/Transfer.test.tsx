import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, screen, waitFor } from "@/test/vue";
import { renderAt } from "@/test/router";
import { toast } from "vue-sonner";
import { STORAGE_KEY } from "@/rotation/constants";
import { DEFAULT_APP_STATE } from "@/rotation/defaultState";
import { loadState, saveState } from "@/lib/appState";
import { encodeShareTransferData } from "@/lib/shareTransfer";
import type { AppState } from "@/rotation/types";
import type { ScheduleResponse } from "@shared/schemas";
import Transfer from "./Transfer";

const slug = "transfer-review";
const editToken = "transfer-test-token";
const fetched: ScheduleResponse = {
  ...DEFAULT_APP_STATE.schedules[0],
  slug,
  name: "取り込んだ当番表",
  fontId: "elegant",
  createdAt: "2026-09-30T00:00:00Z",
  updatedAt: "2026-09-30T00:00:00Z",
};

async function renderTransfer(response = fetched) {
  const data = encodeShareTransferData(
    JSON.stringify({ slug, editToken, name: response.name })
  );
  const path = `/transfer?data=${encodeURIComponent(data)}`;
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json(response));
  vi.stubGlobal("fetch", fetchMock);
  const location = await renderAt(path, [
    { path: "/transfer", component: Transfer },
  ]);
  return { location, path, fetchMock };
}

function seedState(hasExistingTransfer: boolean): AppState {
  const initial = structuredClone(DEFAULT_APP_STATE);
  if (hasExistingTransfer) {
    initial.schedules.push({
      ...structuredClone(initial.schedules[0]),
      id: "existing-transfer",
      slug,
      editToken: "old-edit-token",
      name: "変更前の当番表",
      fontId: "handwriting",
      pinned: true,
    });
    initial.activeScheduleId = "existing-transfer";
  }
  expect(saveState(initial)).toBe(true);
  return initial;
}

beforeEach(() => {
  vi.spyOn(toast, "success").mockReturnValue("transfer-test-toast");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Transfer の端末への保存", () => {
  it("別ページへ移った後に届く転送応答を保存しない", async () => {
    const initial = seedState(false);
    const saved = localStorage.getItem(STORAGE_KEY);
    let finish!: (response: Response) => void;
    const pending = new Promise<Response>(resolve => {
      finish = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => pending)
    );
    const data = encodeShareTransferData(
      JSON.stringify({ slug, editToken, name: fetched.name })
    );
    const location = await renderAt(
      `/transfer?data=${encodeURIComponent(data)}`,
      [{ path: "/transfer", component: Transfer }]
    );
    await location.navigate("/elsewhere");

    await act(() => finish(Response.json(fetched)));
    expect(loadState()).toEqual(initial);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
    expect(toast.success).not.toHaveBeenCalled();
    expect(location.history.at(-1)).toBe("/elsewhere");
  });

  it("編集リンクの本文を実際に保存してから、成功を知らせホームへ移る", async () => {
    const initial = seedState(false);
    const { location, fetchMock } = await renderTransfer();

    await waitFor(() => expect(location.history?.at(-1)).toBe("/"));
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/schedules/${slug}/edit`,
      expect.objectContaining({
        headers: { "x-edit-token": editToken },
      })
    );
    const stored = loadState();
    expect(stored.schedules).toHaveLength(initial.schedules.length + 1);
    expect(stored.schedules[0]).toEqual(initial.schedules[0]);
    const imported = stored.schedules.find(schedule => schedule.slug === slug)!;
    expect(imported).toMatchObject({
      name: fetched.name,
      editToken,
      groups: fetched.groups,
      members: fetched.members,
      fontId: "elegant",
    });
    expect(stored.activeScheduleId).toBe(imported.id);
    expect(toast.success).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith(
      `「${fetched.name}」の編集権限を追加しました`
    );
  });

  it("同じ表の編集リンクを取り込み直すと、IDと固定設定を保って更新する", async () => {
    const initial = seedState(true);
    const { location } = await renderTransfer({
      ...fetched,
      fontId: undefined,
    });

    await waitFor(() => expect(location.history?.at(-1)).toBe("/"));
    const stored = loadState();
    expect(stored.schedules).toHaveLength(initial.schedules.length);
    expect(stored.schedules[0]).toEqual(initial.schedules[0]);
    expect(stored.schedules[1]).toMatchObject({
      id: "existing-transfer",
      name: fetched.name,
      editToken,
      groups: fetched.groups,
      members: fetched.members,
      fontId: "handwriting",
      pinned: true,
    });
    expect(stored.activeScheduleId).toBe("existing-transfer");
    expect(toast.success).toHaveBeenCalledWith(
      `「${fetched.name}」の編集権限を更新しました`
    );
  });

  it.each([
    ["新規追加", false],
    ["既存表更新", true],
  ] as const)(
    "%sの保存が容量不足で失敗したら、成功扱いせず既存データを残す",
    async (_name, hasExistingTransfer) => {
      const initial = seedState(hasExistingTransfer);
      const originalSaved = localStorage.getItem(STORAGE_KEY);
      const setItem = localStorage.setItem.bind(localStorage);
      vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
        if (key === STORAGE_KEY) {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }
        setItem(key, value);
      });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const { location, path } = await renderTransfer();

      expect(
        await screen.findByRole("heading", {
          name: "転送データの保存に失敗しました",
        })
      ).toBeVisible();
      expect(toast.success).not.toHaveBeenCalled();
      expect(location.history).toEqual([path]);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(originalSaved);
      expect(loadState()).toEqual(initial);
    }
  );
});
