import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { Route, Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { LIMITS } from "@shared/limits";
import { STORAGE_KEY } from "@/rotation/constants";
import type { AppState } from "@/rotation/types";
import SharedScheduleView from "./SharedScheduleView";
import { loadState, saveState } from "@/lib/appState";
import { toast } from "sonner";

// 共有相手だけが見る画面なので、作者が壊れに気づけない。
// API は fetch の手前だけ差し替え、api.ts の検証・割り当て計算・描画は本物を通す。
const shared = {
  slug: "AbCdEfGhIj",
  name: "3年2組 掃除当番",
  rotation: 1,
  groups: [
    { id: "g1", tasks: ["黒板"], emoji: "🧽" },
    { id: "g2", tasks: ["床はき"], emoji: "🧹", memberIds: ["m2"] },
  ],
  members: [
    {
      id: "m1",
      name: "あおい",
      color: "#3B82F6",
      bgColor: "#DBEAFE",
      textColor: "#1E3A5F",
    },
    {
      id: "m2",
      name: "そら",
      color: "#10B981",
      bgColor: "#D1FAE5",
      textColor: "#064E3B",
    },
  ],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function stubFetch(response: () => Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderAt(path: string) {
  const location = memoryLocation({ path, record: true });
  render(
    <Router hook={location.hook}>
      <Route path="/s/:slug" component={SharedScheduleView} />
    </Router>
  );
  return location;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("SharedScheduleView", () => {
  it("共有された当番表を表示する", async () => {
    const fetchMock = stubFetch(async () => Response.json(shared));
    renderAt("/s/AbCdEfGhIj");

    expect(
      await screen.findByRole("heading", { name: "3年2組 掃除当番" })
    ).toBeVisible();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/schedules/AbCdEfGhIj");
    // 手動の「1回目」は受け取った人に意味が伝わらないので、画面には出さない
    expect(screen.queryByText("1回目")).toBeNull();
    const cards = screen.getByRole("list", { name: "当番割り当て一覧" });
    expect(within(cards).getAllByRole("listitem")).toHaveLength(2);
    // 床はきはそら専用のグループなので、何回目でもそらが担当する
    expect(within(cards).getByText("床はき")).toBeInTheDocument();
    expect(within(cards).getByText("黒板")).toBeInTheDocument();
    expect(within(cards).getAllByText("そら").length).toBeGreaterThan(0);
  });

  it("日付で交代する当番表は、いつの当番かを日付で伝える", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 30, 9));
    stubFetch(async () =>
      Response.json({
        ...shared,
        rotationConfig: { mode: "date", startDate: "2026-09-28", cycleDays: 7 },
      })
    );
    renderAt("/s/AbCdEfGhIj");
    expect(await screen.findByText("9/28(月)〜10/4(日)の当番")).toBeVisible();
    vi.useRealTimers();
  });

  it("自分の名前を選ぶと、今と次の当番が分かり、次に開いたときも覚えている", async () => {
    stubFetch(async () => Response.json(shared));
    renderAt("/s/AbCdEfGhIj");
    const select = await screen.findByLabelText(
      "自分の名前を選ぶと、自分の当番が分かります"
    );
    fireEvent.change(select, { target: { value: "m1" } });
    expect(screen.getByRole("heading", { name: "あおいの当番" })).toBeVisible();
    // rotation 1 では、黒板はそら（全員で回す）、床はきはそら専用なので、あおいはお休み
    expect(screen.getByText("今回はお休みです")).toBeVisible();
    expect(screen.getByText("次の順番").nextElementSibling).toHaveTextContent(
      "🧽 黒板"
    );
    expect(localStorage.getItem("toban-shared-me:AbCdEfGhIj")).toBe("m1");

    cleanup();
    stubFetch(async () => Response.json(shared));
    renderAt("/s/AbCdEfGhIj");
    expect(
      await screen.findByRole("heading", { name: "あおいの当番" })
    ).toBeVisible();
  });

  it("日付で交代する表は、このあとの当番も日付で出す", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 30, 9));
    stubFetch(async () =>
      Response.json({
        ...shared,
        rotationConfig: { mode: "date", startDate: "2026-09-28", cycleDays: 7 },
      })
    );
    renderAt("/s/AbCdEfGhIj");
    fireEvent.change(
      await screen.findByLabelText(
        "自分の名前を選ぶと、自分の当番が分かります"
      ),
      { target: { value: "m2" } }
    );
    // 今週（rotation 0）: 黒板はあおい、床はきはそら
    expect(
      screen.getByRole("heading", { name: "そらの当番" }).nextElementSibling
    ).toHaveTextContent("🧹 床はき");
    expect(
      screen.getByText("10/5(月)〜10/11(日)").nextElementSibling
    ).toHaveTextContent("🧽 黒板 🧹 床はき");
    vi.useRealTimers();
  });

  it.each([
    [404, "当番表が見つかりませんでした"],
    [500, "サーバーエラーが発生しました。しばらくしてからお試しください"],
    [400, "データの取得に失敗しました"],
  ])("API が %i を返したら理由を伝える", async (status, message) => {
    stubFetch(async () => Response.json({ error: "x" }, { status }));
    renderAt("/s/AbCdEfGhIj");
    expect(await screen.findByRole("heading", { name: message })).toBeVisible();
    // 見つからないときは読み込み直しても変わらないので、再読み込みは出さない
    expect(!!screen.queryByRole("button", { name: "再読み込み" })).toBe(
      status !== 404
    );
    if (status === 404)
      expect(
        screen.getByText(/1年間使われずに消えた可能性があります/)
      ).toBeVisible();
  });

  it("件数の上限を超える応答は、通信エラーではなく取得失敗として伝える", async () => {
    const member = shared.members[0];
    stubFetch(async () =>
      Response.json({
        ...shared,
        members: Array.from({ length: LIMITS.members + 1 }, (_, index) => ({
          ...member,
          id: `m${index}`,
          name: `人${index}`,
        })),
      })
    );
    renderAt("/s/AbCdEfGhIj");
    expect(
      await screen.findByRole("heading", { name: "データの取得に失敗しました" })
    ).toBeVisible();
    expect(screen.queryByText(/Too big/)).toBeNull();
    expect(screen.queryByText(/Invalid API response/)).toBeNull();
  });

  it("通信できないときはネットワークエラーを伝える", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    renderAt("/s/AbCdEfGhIj");
    expect(
      await screen.findByRole("heading", {
        name: "ネットワークエラーが発生しました。接続を確認してください",
      })
    ).toBeVisible();
  });

  it("自分用にコピーすると新しい ID で保存し、担当者の割り当ても付け替えてホームへ移る", async () => {
    stubFetch(async () => Response.json(shared));
    const location = renderAt("/s/AbCdEfGhIj");

    fireEvent.click(
      await screen.findByRole("button", { name: /この当番表を自分用にコピー/ })
    );

    const state = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as AppState;
    const copy = state.schedules.find(s => s.name === "3年2組 掃除当番")!;
    expect(state.activeScheduleId).toBe(copy.id);
    expect(copy.members.map(m => m.id)).not.toContain("m2");
    const sora = copy.members.find(m => m.name === "そら")!;
    expect(copy.groups[1].memberIds).toEqual([sora.id]);
    expect(location.history?.at(-1)).toBe("/");
  });

  it("コピーの端末保存に失敗したら、共有画面に留まり既存データを保つ", async () => {
    const existing = loadState();
    expect(saveState(existing)).toBe(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    const success = vi.spyOn(toast, "success");
    const error = vi.spyOn(toast, "error");
    const setItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === STORAGE_KEY)
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      setItem(key, value);
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    stubFetch(async () => Response.json(shared));
    const location = renderAt("/s/AbCdEfGhIj");

    fireEvent.click(
      await screen.findByRole("button", { name: /この当番表を自分用にコピー/ })
    );

    expect(error).toHaveBeenCalledWith(
      "端末に保存できませんでした。内容を失わないよう、この画面を閉じずに保存先の空き容量・設定を確認してください。"
    );
    expect(success).not.toHaveBeenCalled();
    expect(location.history?.at(-1)).toBe("/s/AbCdEfGhIj");
    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
    expect(loadState()).toEqual(existing);
  });

  it("日付が変わって復帰すると担当・期間・自分の次の当番を更新する", async () => {
    vi.stubEnv("TZ", "Asia/Tokyo");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 1, 23, 59));
    const fetchMock = stubFetch(async () =>
      Response.json({
        ...shared,
        groups: [shared.groups[0]],
        rotationConfig: { mode: "date", startDate: "2026-10-01", cycleDays: 1 },
      })
    );
    localStorage.setItem("toban-shared-me:AbCdEfGhIj", "m1");
    renderAt("/s/AbCdEfGhIj");
    expect(await screen.findByText("10/1(木)の当番")).toBeVisible();
    const cards = () => screen.getByRole("list", { name: "当番割り当て一覧" });
    expect(within(cards()).getByText("あおい")).toBeInTheDocument();
    expect(screen.getByText("10/2(金)")).toBeInTheDocument();

    act(() => {
      vi.setSystemTime(new Date(2026, 9, 2, 0, 1));
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() =>
      expect(screen.getByText("10/2(金)の当番")).toBeVisible()
    );
    expect(within(cards()).getByText("そら")).toBeInTheDocument();
    expect(screen.queryByText("10/2(金)")).toBeNull();
    expect(screen.getByText("10/5(月)")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
