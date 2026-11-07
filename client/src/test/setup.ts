import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/vue";
afterEach(cleanup);

// jsdom has no layout tree. Keep actual Motion and focus handling able to see
// connected, displayed elements instead of treating every mounted node as hidden.
Object.defineProperty(HTMLElement.prototype, "offsetParent", {
  configurable: true,
  get() {
    if (!this.isConnected || this.closest("[hidden]")) return null;
    if (getComputedStyle(this).display === "none") return null;
    for (
      let element: HTMLElement | null = this.parentElement;
      element;
      element = element.parentElement
    ) {
      if (getComputedStyle(element).display === "none") return null;
    }
    return this.parentElement;
  },
});

// Motion のブラウザ設定を既存のテスト条件にそろえる。
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// window.print stub
window.print = vi.fn();

// jsdom は scrollIntoView を実装していない
Element.prototype.scrollIntoView = vi.fn();

// この構成の jsdom には localStorage が無く、safeGetItem が常に null を返すため、
// アプリの主データストアである保存→読込の往復がテストで一度も通らなかった。
// 実物と同じ挙動のものを置いて、その経路を検証できるようにする。
// （個別に差し替えたいテストは vi.stubGlobal("localStorage", ...) で上書きできる）
const localStorageStore = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: {
    getItem: (key: string) => localStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) =>
      void localStorageStore.set(key, String(value)),
    removeItem: (key: string) => void localStorageStore.delete(key),
    clear: () => localStorageStore.clear(),
    key: (i: number) => [...localStorageStore.keys()][i] ?? null,
    get length() {
      return localStorageStore.size;
    },
  },
});

// テスト間で保存内容が漏れないようにする
beforeEach(() => localStorageStore.clear());
