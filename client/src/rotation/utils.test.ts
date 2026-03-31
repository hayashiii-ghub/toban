import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_STATE } from "./defaultState";
import { STORAGE_KEY } from "./constants";
import { getHolidaysForYear } from "./holidays";
import {
  computeAssignments,
  computeDateRotationForDate,
  loadState,
  normalizeRotation,
  sanitizeAppState,
  sanitizeMember,
  sanitizeSchedule,
  sanitizeTaskGroup,
} from "./utils";

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
    const groups = [
      { id: "g1", tasks: ["掃除"], emoji: "🧹" },
      { id: "g2", tasks: ["給食"], emoji: "🍽" },
      { id: "g3", tasks: ["日直"], emoji: "📋" },
    ];
    const members = [
      { id: "m1", name: "松丸", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "山下", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#7F1D1D" },
      { id: "m3", name: "田中", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
    ];
    const assignments = computeAssignments(groups, members, 1);

    expect(assignments.map(({ member }) => member.name)).toEqual(["山下", "田中", "松丸"]);
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
    const memberCount = DEFAULT_APP_STATE.schedules[0].members.length;
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
    expect(state.schedules[0].rotation).toBe(7 % memberCount);
  });

  it("preserves pinned schedules from localStorage", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => JSON.stringify({
        schedules: [
          {
            ...DEFAULT_APP_STATE.schedules[0],
            pinned: true,
          },
        ],
        activeScheduleId: DEFAULT_APP_STATE.schedules[0].id,
      })),
      setItem: vi.fn(),
    });

    const state = loadState();

    expect(state.schedules[0].pinned).toBe(true);
  });
});

describe("computeDateRotationForDate", () => {
  it("keeps the previous assignment on skipped days", () => {
    expect(
      computeDateRotationForDate(
        {
          mode: "date",
          startDate: "2026-03-02",
          cycleDays: 1,
          skipSaturday: true,
          skipSunday: true,
        },
        3,
        new Date(2026, 2, 7),
      ),
    ).toBe(1);
  });

  it("cycleDays > 1 の場合、サイクル単位でローテーションが進む", () => {
    // 開始3/2(月), cycleDays=3, 対象3/5(木) → 有効日数3 / cycleDays3 = 1サイクル
    expect(
      computeDateRotationForDate(
        { mode: "date", startDate: "2026-03-02", cycleDays: 3 },
        4,
        new Date(2026, 2, 5),
      ),
    ).toBe(1);
  });

  it("開始日が未来の場合は0を返す", () => {
    expect(
      computeDateRotationForDate(
        { mode: "date", startDate: "2026-12-01", cycleDays: 1 },
        3,
        new Date(2026, 2, 27),
      ),
    ).toBe(0);
  });

  it("祝日スキップが有効な場合、祝日をカウントしない", () => {
    // 2026-01-01(木・元日) → 2026-01-02(金): 有効日数0（元日スキップ）
    expect(
      computeDateRotationForDate(
        { mode: "date", startDate: "2026-01-01", cycleDays: 1, skipHolidays: true },
        3,
        new Date(2026, 0, 2),
      ),
    ).toBe(0);
  });

  it("startDate や cycleDays が未設定なら0を返す", () => {
    expect(
      computeDateRotationForDate({ mode: "date" }, 3, new Date(2026, 2, 27)),
    ).toBe(0);
    expect(
      computeDateRotationForDate({ mode: "date", startDate: "2026-03-01" }, 3, new Date(2026, 2, 27)),
    ).toBe(0);
  });

  it("memberCount が0なら0を返す", () => {
    expect(
      computeDateRotationForDate(
        { mode: "date", startDate: "2026-03-01", cycleDays: 1 },
        0,
        new Date(2026, 2, 27),
      ),
    ).toBe(0);
  });
});

describe("computeAssignments - 専用メンバー", () => {
  const members = [
    { id: "m1", name: "Aさん", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
    { id: "m2", name: "Bさん", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#7F1D1D" },
    { id: "m3", name: "Cさん", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
  ];

  it("memberIds 指定のグループは専用プールからメンバーを割り当てる", () => {
    const groups = [
      { id: "g1", tasks: ["掃除"], emoji: "🧹", memberIds: ["m1", "m2"] },
      { id: "g2", tasks: ["給食"], emoji: "🍽" },
    ];
    const assignments = computeAssignments(groups, members, 0);

    // g1 は m1, m2 のプール → rotation=0 → m1
    expect(assignments[0].member.name).toBe("Aさん");
    // g2 は全メンバー → rotation=0 + groupIndex=1 → m2
    expect(assignments[1].member.name).toBe("Bさん");
  });

  it("skipped メンバーは割り当てから除外される", () => {
    const membersWithSkip = [
      ...members,
      { id: "m4", name: "Dさん", color: "#000", bgColor: "#fff", textColor: "#000", skipped: true },
    ];
    const groups = [{ id: "g1", tasks: ["掃除"], emoji: "🧹" }];
    const assignments = computeAssignments(groups, membersWithSkip, 0);

    expect(assignments[0].member.name).toBe("Aさん");
    expect(assignments.every(a => a.member.name !== "Dさん")).toBe(true);
  });
});

// ─── Phase 1: サニタイズ関数テスト ───

describe("sanitizeTaskGroup", () => {
  it("returns null for non-object input", () => {
    expect(sanitizeTaskGroup(null)).toBeNull();
    expect(sanitizeTaskGroup("string")).toBeNull();
    expect(sanitizeTaskGroup(42)).toBeNull();
  });

  it("returns null when id is missing or empty", () => {
    expect(sanitizeTaskGroup({ emoji: "🧹", tasks: ["掃除"] })).toBeNull();
    expect(sanitizeTaskGroup({ id: "  ", emoji: "🧹", tasks: ["掃除"] })).toBeNull();
  });

  it("returns null when emoji is missing or empty", () => {
    expect(sanitizeTaskGroup({ id: "g1", tasks: ["掃除"] })).toBeNull();
    expect(sanitizeTaskGroup({ id: "g1", emoji: "", tasks: ["掃除"] })).toBeNull();
  });

  it("returns null when all tasks are invalid (empty/non-string)", () => {
    expect(sanitizeTaskGroup({ id: "g1", emoji: "🧹", tasks: [123, "", "  "] })).toBeNull();
  });

  it("filters out invalid tasks and trims valid ones", () => {
    const result = sanitizeTaskGroup({ id: "g1", emoji: "🧹", tasks: [" 掃除 ", 123, "", "給食"] });
    expect(result).toEqual({ id: "g1", emoji: "🧹", tasks: ["掃除", "給食"] });
  });

  it("preserves valid memberIds and ignores invalid ones", () => {
    const result = sanitizeTaskGroup({ id: "g1", emoji: "🧹", tasks: ["掃除"], memberIds: ["m1", 123, "", "m2"] });
    expect(result?.memberIds).toEqual(["m1", "m2"]);
  });

  it("omits memberIds when all are invalid", () => {
    const result = sanitizeTaskGroup({ id: "g1", emoji: "🧹", tasks: ["掃除"], memberIds: [123, null] });
    expect(result?.memberIds).toBeUndefined();
  });
});

describe("sanitizeMember", () => {
  const validMember = { id: "m1", name: "田中", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" };

  it("returns null for non-object input", () => {
    expect(sanitizeMember(null)).toBeNull();
    expect(sanitizeMember("string")).toBeNull();
  });

  it("returns null when required color fields are missing", () => {
    expect(sanitizeMember({ id: "m1", name: "田中", color: "#000" })).toBeNull();
    expect(sanitizeMember({ id: "m1", name: "田中", color: "#000", bgColor: "#fff" })).toBeNull();
  });

  it("returns null when name is empty or whitespace", () => {
    expect(sanitizeMember({ ...validMember, name: "" })).toBeNull();
    expect(sanitizeMember({ ...validMember, name: "  " })).toBeNull();
  });

  it("trims name and preserves all fields", () => {
    const result = sanitizeMember({ ...validMember, name: " 田中 " });
    expect(result?.name).toBe("田中");
    expect(result?.color).toBe("#3B82F6");
  });

  it("preserves skipped boolean, ignores non-boolean", () => {
    expect(sanitizeMember({ ...validMember, skipped: true })?.skipped).toBe(true);
    expect(sanitizeMember({ ...validMember, skipped: "yes" })?.skipped).toBeUndefined();
  });
});

describe("sanitizeSchedule", () => {
  const validGroup = { id: "g1", emoji: "🧹", tasks: ["掃除"] };
  const validMember = { id: "m1", name: "田中", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" };
  const validSchedule = { id: "s1", name: "テスト", rotation: 0, groups: [validGroup], members: [validMember] };

  it("returns null for non-object input", () => {
    expect(sanitizeSchedule(null)).toBeNull();
  });

  it("returns null when id or name is missing", () => {
    expect(sanitizeSchedule({ ...validSchedule, id: "" })).toBeNull();
    expect(sanitizeSchedule({ ...validSchedule, name: "  " })).toBeNull();
  });

  it("returns null when rotation is NaN or Infinity", () => {
    expect(sanitizeSchedule({ ...validSchedule, rotation: NaN })).toBeNull();
    expect(sanitizeSchedule({ ...validSchedule, rotation: Infinity })).toBeNull();
  });

  it("returns null when all groups are invalid", () => {
    expect(sanitizeSchedule({ ...validSchedule, groups: [{ id: "g1" }] })).toBeNull();
  });

  it("returns null when all members are invalid", () => {
    expect(sanitizeSchedule({ ...validSchedule, members: [{ id: "m1" }] })).toBeNull();
  });

  it("preserves valid assignmentMode, ignores invalid", () => {
    expect(sanitizeSchedule({ ...validSchedule, assignmentMode: "task" })?.assignmentMode).toBe("task");
    expect(sanitizeSchedule({ ...validSchedule, assignmentMode: "member" })?.assignmentMode).toBe("member");
    expect(sanitizeSchedule({ ...validSchedule, assignmentMode: "invalid" })?.assignmentMode).toBeUndefined();
  });

  it("preserves slug, editToken, designThemeId, pinned", () => {
    const result = sanitizeSchedule({
      ...validSchedule, slug: "abc", editToken: "tok123", designThemeId: "sakura", pinned: true,
    });
    expect(result?.slug).toBe("abc");
    expect(result?.editToken).toBe("tok123");
    expect(result?.designThemeId).toBe("sakura");
    expect(result?.pinned).toBe(true);
  });

  it("sanitizes rotationConfig and strips invalid cycleDays", () => {
    const result = sanitizeSchedule({
      ...validSchedule,
      rotationConfig: { mode: "date", startDate: "2026-03-01", cycleDays: 0, skipSaturday: true },
    });
    expect(result?.rotationConfig?.mode).toBe("date");
    expect(result?.rotationConfig?.cycleDays).toBeUndefined();
    expect(result?.rotationConfig?.skipSaturday).toBe(true);
  });

  it("migrates weekdaysOnly to skipSaturday+skipSunday", () => {
    const result = sanitizeSchedule({
      ...validSchedule,
      rotationConfig: { mode: "manual", weekdaysOnly: true },
    });
    expect(result?.rotationConfig?.skipSaturday).toBe(true);
    expect(result?.rotationConfig?.skipSunday).toBe(true);
  });
});

describe("sanitizeAppState", () => {
  const validGroup = { id: "g1", emoji: "🧹", tasks: ["掃除"] };
  const validMember = { id: "m1", name: "田中", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" };
  const validSchedule = { id: "s1", name: "テスト", rotation: 0, groups: [validGroup], members: [validMember] };

  it("returns null for non-object or missing schedules array", () => {
    expect(sanitizeAppState(null)).toBeNull();
    expect(sanitizeAppState({ schedules: "not array" })).toBeNull();
  });

  it("returns null when all schedules are invalid", () => {
    expect(sanitizeAppState({ schedules: [{ id: "broken" }], activeScheduleId: "broken" })).toBeNull();
  });

  it("drops invalid schedules and keeps valid ones", () => {
    const result = sanitizeAppState({
      schedules: [{ id: "broken" }, validSchedule],
      activeScheduleId: "s1",
    });
    expect(result?.schedules).toHaveLength(1);
    expect(result?.schedules[0].id).toBe("s1");
  });

  it("falls back activeScheduleId to first schedule when invalid", () => {
    const result = sanitizeAppState({
      schedules: [validSchedule],
      activeScheduleId: "nonexistent",
    });
    expect(result?.activeScheduleId).toBe("s1");
  });

  it("falls back activeScheduleId when it is not a string", () => {
    const result = sanitizeAppState({
      schedules: [validSchedule],
      activeScheduleId: 123,
    });
    expect(result?.activeScheduleId).toBe("s1");
  });
});

// ─── Phase 2: computeDateRotationForDate エッジケース ───

describe("computeDateRotationForDate - edge cases", () => {
  it("combined skip: Saturday + Sunday + holiday does not double-count", () => {
    // 2026-01-01 (Thu) → 2026-01-04 (Sun=祝日振替? No, just regular Sun)
    // Use 2026-03-02 (Mon) start → 2026-03-21 (Sat, 春分の日=祝日) → skip both as Saturday and holiday
    const result = computeDateRotationForDate(
      { mode: "date", startDate: "2026-03-02", cycleDays: 1, skipSaturday: true, skipSunday: true, skipHolidays: true },
      3,
      new Date(2026, 2, 23), // Mon after the weekend with holiday
    );
    // 3/2(Mon)=day0, 3/3=1, 3/4=2, 3/5=3, 3/6=4, (3/7sat skip, 3/8sun skip)
    // 3/9=5, 3/10=6, 3/11=7, 3/12=8, 3/13=9, (3/14sat skip, 3/15sun skip)
    // 3/16=10, 3/17=11, 3/18=12, 3/19=13, 3/20(春分の日=fri, skip)
    // (3/21sat skip, 3/22sun skip), 3/23=14
    // 14 effective days / cycleDays=1 = 14 cycles → 14 % 3 = 2
    expect(result).toBe(2);
  });

  it("cycleDays=0 returns 0", () => {
    expect(
      computeDateRotationForDate(
        { mode: "date", startDate: "2026-03-01", cycleDays: 0 },
        3,
        new Date(2026, 2, 10),
      ),
    ).toBe(0);
  });

  it("negative cycleDays returns 0", () => {
    expect(
      computeDateRotationForDate(
        { mode: "date", startDate: "2026-03-01", cycleDays: -5 },
        3,
        new Date(2026, 2, 10),
      ),
    ).toBe(0);
  });

  it("handles leap year correctly (2028-02-28 → 2028-03-01)", () => {
    // 2028 is a leap year: Feb 28 → Feb 29 → Mar 1 = 2 days
    const result = computeDateRotationForDate(
      { mode: "date", startDate: "2028-02-28", cycleDays: 1 },
      3,
      new Date(2028, 2, 1), // Mar 1
    );
    // 2 effective days / 1 = 2 cycles → 2 % 3 = 2
    expect(result).toBe(2);
  });

  it("large rotation wraps correctly with modular arithmetic", () => {
    // 100 weekdays: 2026-03-02 (Mon) + 100 weekdays
    // With no skip, just 100 calendar days from 3/2 → 6/10
    const result = computeDateRotationForDate(
      { mode: "date", startDate: "2026-03-02", cycleDays: 1 },
      3,
      new Date(2026, 5, 10), // June 10 = 100 days later
    );
    // 100 cycles % 3 = 1
    expect(result).toBe(1);
  });

  it("startDate on a skipped Sunday: target on next Monday", () => {
    // 2026-03-01 is a Sunday
    const result = computeDateRotationForDate(
      { mode: "date", startDate: "2026-03-01", cycleDays: 1, skipSunday: true },
      3,
      new Date(2026, 2, 2), // Monday March 2
    );
    // diffDays = 1, skipDays: 3/1 (Sun) is in range and skipped → 1 skip
    // effectiveDays = 1 - 1 = 0 → 0 cycles → 0
    expect(result).toBe(0);
  });

  it("memberCount=1 always returns 0", () => {
    expect(
      computeDateRotationForDate(
        { mode: "date", startDate: "2026-03-01", cycleDays: 1 },
        1,
        new Date(2026, 5, 15),
      ),
    ).toBe(0);
  });
});

describe("getHolidaysForYear", () => {
  it("includes the 2020 olympic holiday overrides", () => {
    const holidays2020 = getHolidaysForYear(2020);
    const holidayMap2020 = new Map(holidays2020.map((holiday) => [holiday.date, holiday.name]));

    expect(holidayMap2020.get("2020-07-23")).toBe("海の日");
    expect(holidayMap2020.get("2020-07-24")).toBe("スポーツの日");
    expect(holidayMap2020.get("2020-08-10")).toBe("山の日");
    expect(holidayMap2020.has("2020-10-12")).toBe(false);
  });

  it("includes the 2021 olympic holiday overrides", () => {
    const holidays2021 = getHolidaysForYear(2021);
    const holidayMap2021 = new Map(holidays2021.map((holiday) => [holiday.date, holiday.name]));

    expect(holidayMap2021.get("2021-07-22")).toBe("海の日");
    expect(holidayMap2021.get("2021-07-23")).toBe("スポーツの日");
    expect(holidayMap2021.get("2021-08-08")).toBe("山の日");
    expect(holidayMap2021.get("2021-08-09")).toBe("振替休日");
    expect(holidayMap2021.has("2021-10-11")).toBe(false);
  });
});
