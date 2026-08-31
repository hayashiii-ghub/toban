import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_APP_STATE,
  DEFAULT_APP_STATE_EN,
} from "@/rotation/defaultState";
import { STORAGE_KEY } from "@/rotation/constants";
import { loadState, saveState } from "./appState";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadState", () => {
  it("drops malformed schedules from localStorage", () => {
    const getItem = vi.fn(() =>
      JSON.stringify({
        schedules: [
          {
            id: "broken",
            name: "壊れたデータ",
            rotation: 999,
            groups: [{ id: "g1", emoji: "🧹", tasks: [123, ""] }],
            members: [{ id: "m1", name: "A", color: "#000" }],
          },
        ],
        activeScheduleId: "broken",
      })
    );

    vi.stubGlobal("localStorage", {
      getItem,
      setItem: vi.fn(),
    });
    vi.stubGlobal("navigator", { language: "ja" });

    const state = loadState();

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(state).toEqual(DEFAULT_APP_STATE);
  });

  it("seeds the English default when the locale resolves to en", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });
    vi.stubGlobal("navigator", { language: "en-US" });

    const state = loadState();

    expect(state).toEqual(DEFAULT_APP_STATE_EN);
  });

  it("normalizes valid stored rotation and active schedule", () => {
    const memberCount = DEFAULT_APP_STATE.schedules[0].members.length;
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          schedules: [
            {
              ...DEFAULT_APP_STATE.schedules[0],
              rotation: 7,
            },
          ],
          activeScheduleId: "missing",
        })
      ),
      setItem: vi.fn(),
    });

    const state = loadState();

    expect(state.activeScheduleId).toBe(DEFAULT_APP_STATE.schedules[0].id);
    expect(state.schedules[0].rotation).toBe(7 % memberCount);
  });

  it("preserves pinned schedules from localStorage", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          schedules: [
            {
              ...DEFAULT_APP_STATE.schedules[0],
              pinned: true,
            },
          ],
          activeScheduleId: DEFAULT_APP_STATE.schedules[0].id,
        })
      ),
      setItem: vi.fn(),
    });

    const state = loadState();

    expect(state.schedules[0].pinned).toBe(true);
  });
});

describe("saveState", () => {
  it("returns true only when localStorage accepted the serialized state", () => {
    expect(saveState(DEFAULT_APP_STATE)).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(
      DEFAULT_APP_STATE
    );
  });

  it("returns false instead of claiming success when storage is unavailable", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error("Storage blocked");
      }),
    });
    try {
      expect(saveState(DEFAULT_APP_STATE)).toBe(false);
    } finally {
      warning.mockRestore();
    }
  });
});
