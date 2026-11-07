import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, waitFor } from "@/test/vue";
import { defineComponent, h } from "vue";
import { createRouter, createWebHistory, RouterView } from "vue-router";
import { useHomeState } from "./useHomeState";
import { STORAGE_KEY, TEMPLATES } from "@/rotation/constants";
import {
  DEFAULT_APP_STATE,
  DEFAULT_APP_STATE_EN,
} from "@/rotation/defaultState";
import { LanguageProvider } from "@/i18n";
afterEach(cleanup);
// 自動バックアップ・引き直しがテスト中に走らないよう、解決しない Promise を返す
vi.mock("@/lib/api", () => ({
  createSchedule: vi.fn(() => new Promise(() => {})),
  updateSchedule: vi.fn(() => new Promise(() => {})),
  deleteSchedule: vi.fn(() => Promise.resolve()),
  getScheduleForEdit: vi.fn(() => new Promise(() => {})),
  publishSchedule: vi.fn(() => new Promise(() => {})),
  toScheduleData: (s: unknown) => s,
  ApiError: class extends Error {},
}));
/** 保存データが無い＝初回訪問。日本語の default が seed される状態にする */
function asFirstVisitInJapanese() {
  localStorage.setItem("toban-lang", "ja");
  window.history.replaceState({}, "", "/");
}
describe("初回訪問（保存データなし）", () => {
  it("「はじめてガイド」が seed され、モーダルは開かない", () => {
    asFirstVisitInJapanese();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    const { result } = renderHook(() => useHomeState());
    expect(result.current.activeSchedule?.name).toBe(
      DEFAULT_APP_STATE.schedules[0].name
    );
    // ガイドを読ませたいので、テンプレート選択モーダルは出さない
    // （出すと useOnboarding のツアーが isModalOpen で抑制される）
    expect(result.current.modal.type).toBeNull();
  });
  it("seed した内容が localStorage へ保存される", () => {
    asFirstVisitInJapanese();
    const { result } = renderHook(() => useHomeState());
    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!)).toEqual(result.current.state);
  });
});
describe("?template=N での着地", () => {
  it("クエリを使った後もルーターの履歴を保ち、再読込・戻る・進むを壊さない", async () => {
    const previousState = window.history.state;
    const previousUrl = window.location.href;
    const histories = new Set<ReturnType<typeof createWebHistory>>();
    let home!: ReturnType<typeof useHomeState>;
    const HomeProbe = defineComponent(() => {
      home = useHomeState();
      return () => h("output", home.activeSchedule?.name);
    });
    const routes = [
      { path: "/", component: HomeProbe },
      { path: "/next", component: defineComponent(() => () => null) },
    ];
    const mountRouter = async () => {
      const history = createWebHistory();
      histories.add(history);
      const router = createRouter({ history, routes });
      await router.push(window.location.pathname + window.location.search);
      await router.isReady();
      render(h(RouterView), { global: { plugins: [router] } });
      return { history, router };
    };
    try {
      localStorage.setItem("toban-lang", "ja");
      window.history.replaceState(null, "", "/?template=0&view=disc");
      const first = await mountRouter();
      const position = window.history.state.position;
      expect(Number.isFinite(position)).toBe(true);
      await waitFor(() =>
        expect(first.router.currentRoute.value.fullPath).toBe("/")
      );
      expect(window.location.search).toBe("");
      expect(window.history.state.position).toBe(position);
      expect(home.activeSchedule?.name).toBe(TEMPLATES[0].name);
      expect(home.viewTab).toBe("disc");
      const count = home.state.schedules.length;
      await act(() => home.changeTab("table"));

      cleanup();
      first.history.destroy();
      const reloaded = await mountRouter();
      expect(window.history.state.position).toBe(position);
      expect(home.state.schedules).toHaveLength(count);
      expect(home.viewTab).toBe("table");
      await reloaded.router.push("/next");
      expect(window.history.state.position).toBe(position + 1);
      reloaded.router.back();
      await waitFor(() =>
        expect(reloaded.router.currentRoute.value.path).toBe("/")
      );
      expect(window.history.state.position).toBe(position);
      expect(home.state.schedules).toHaveLength(count);
      reloaded.router.forward();
      await waitFor(() =>
        expect(reloaded.router.currentRoute.value.path).toBe("/next")
      );
      expect(window.history.state.position).toBe(position + 1);
    } finally {
      cleanup();
      histories.forEach(history => history.destroy());
      window.history.replaceState(previousState, "", previousUrl);
    }
  });

  it("指定されたテンプレートから当番表を作り、それを表示する", () => {
    localStorage.setItem("toban-lang", "ja");
    window.history.replaceState({}, "", "/?template=0");
    const { result } = renderHook(() => useHomeState());
    expect(result.current.activeSchedule?.name).toBe(TEMPLATES[0].name);
    expect(result.current.modal.type).toBeNull();
    // クエリは履歴から消す（リロードで作り直さないため）
    expect(window.location.search).toBe("");
  });
  it("English template links create English content without changing saved Japanese rosters", () => {
    localStorage.setItem("toban-lang", "en");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_APP_STATE));
    window.history.replaceState({}, "", "/?template=0");
    const { result } = renderHook(() => useHomeState(), {
      wrapper: LanguageProvider,
    });
    expect(result.current.activeSchedule?.name).toBe("Office cleaning");
    expect(result.current.activeSchedule?.groups[0].tasks).toEqual([
      "Vacuuming & mopping",
    ]);
    expect(result.current.activeSchedule?.members[0].name).toBe("Alex");
    expect(result.current.state.schedules[0]).toEqual(
      DEFAULT_APP_STATE_EN.schedules[0]
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).schedules[0]).toEqual(
      DEFAULT_APP_STATE.schedules[0]
    );
    expect(window.location.search).toBe("");
  });
  it("範囲外の番号は無視して、通常の初回訪問と同じ状態にする", () => {
    localStorage.setItem("toban-lang", "ja");
    window.history.replaceState({}, "", "/?template=999");
    const { result } = renderHook(() => useHomeState());
    expect(result.current.activeSchedule?.name).toBe(
      DEFAULT_APP_STATE.schedules[0].name
    );
    expect(result.current.state.schedules).toHaveLength(1);
  });
});
describe("WebMCPと手編集の境界", () => {
  it("設定画面を開いた直後の書き込みを拒否し、編集画面を閉じない", async () => {
    asFirstVisitInJapanese();
    const { result } = renderHook(() => useHomeState());
    const before = result.current.state;
    const updater = vi.fn(state => ({ ...state, schedules: [] }));
    await act(async () => {
      result.current.openSettings();
      expect(await result.current.commitToolState(updater)).toMatchObject({
        applied: false,
        code: "EDIT_IN_PROGRESS",
      });
    });
    expect(updater).not.toHaveBeenCalled();
    expect(result.current.modal.type).toBe("settings");
    expect(result.current.state).toBe(before);
  });
  it("共有画面を保護し、閉じた後に書き込みを再開する", async () => {
    asFirstVisitInJapanese();
    const { result } = renderHook(() => useHomeState());
    const before = result.current.state;
    await act(async () => {
      result.current.setShowShare(true);
      expect(
        await result.current.commitToolState(state => state)
      ).toMatchObject({
        applied: false,
        code: "EDIT_IN_PROGRESS",
      });
    });
    expect(result.current.showShare).toBe(true);
    expect(result.current.state).toBe(before);
    await act(() => result.current.setShowShare(false));
    await act(async () => {
      expect(
        await result.current.commitToolState(state => state)
      ).toMatchObject({
        applied: true,
        local: "saved",
      });
    });
    expect(result.current.showShare).toBe(false);
  });
});
