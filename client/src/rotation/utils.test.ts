import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_STATE } from "./defaultState";
import { STORAGE_KEY } from "./constants";
import { computeAssignments, loadState, normalizeRotation } from "./utils";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeRotation", () => {
  it("wraps positive and negative values into member bounds", () => {
    expect(normalizeRotation(4, 3)).toBe(1);
    expect(normalizeRotation(-1, 3)).toBe(2);
    expect(normalizeRotation(2.9, 3)).toBe(2);
  });

  it("falls back to zero for invalid input", () => {
    expect(normalizeRotation(Number.NaN, 3)).toBe(0);
    expect(normalizeRotation(1, 0)).toBe(0);
  });
});

describe("computeAssignments", () => {
  it("rotates members across groups", () => {
    const schedule = DEFAULT_APP_STATE.schedules[0];
    const assignments = computeAssignments(schedule.groups, schedule.members, 1);

    expect(assignments.map(({ member }) => member.name)).toEqual(["松丸", "山下", "田中"]);
  });
});

describe("loadState", () => {
  it("drops malformed schedules from localStorage", () => {
    const getItem = vi.fn(() => JSON.stringify({
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
    }));

    vi.stubGlobal("localStorage", {
      getItem,
      setItem: vi.fn(),
    });

    const state = loadState();

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(state).toEqual(DEFAULT_APP_STATE);
  });

  it("normalizes valid stored rotation and active schedule", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => JSON.stringify({
        schedules: [
          {
            ...DEFAULT_APP_STATE.schedules[0],
            rotation: 7,
          },
        ],
        activeScheduleId: "missing",
      })),
      setItem: vi.fn(),
    });

    const state = loadState();

    expect(state.activeScheduleId).toBe(DEFAULT_APP_STATE.schedules[0].id);
    expect(state.schedules[0].rotation).toBe(1);
  });
});
