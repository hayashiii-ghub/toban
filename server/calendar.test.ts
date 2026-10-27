import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { buildCalendar, escapeText, foldLine } from "./calendar";
import type { CalendarSchedule } from "./calendar";
import { LIMITS } from "../shared/limits";

const colors = { color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" };

function schedule(overrides: Partial<CalendarSchedule> = {}): CalendarSchedule {
  return {
    slug: "abcdefghij",
    name: "掃除当番",
    groups: [
      { id: "g1", tasks: ["床", "窓"], emoji: "🧹" },
      { id: "g2", tasks: ["ゴミ出し"], emoji: "🗑️" },
    ],
    members: [
      { id: "m1", name: "佐藤", ...colors },
      { id: "m2", name: "鈴木", ...colors },
    ],
    // 2026-10-05 は月曜。7 日ごとに交代
    rotationConfig: { mode: "date", startDate: "2026-10-05", cycleDays: 7 },
    ...overrides,
  };
}

/** 折り返しを戻して、予定ごとの行の組にする */
function events(ics: string) {
  const lines = ics.replace(/\r\n /g, "").split("\r\n");
  const result: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT" && current) {
      result.push(current);
      current = null;
    } else if (current) {
      const i = line.indexOf(":");
      current[line.slice(0, i)] = line.slice(i + 1);
    }
  }
  return result;
}

const origin = "https://toban.app";
const now = new Date(2026, 9, 6, 9, 0); // 2026-10-06 9:00（日本時間）

describe("buildCalendar", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Asia/Tokyo");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("その人の当番の回だけを、終日の予定にする（終わりは最終日の翌日）", () => {
    const ics = buildCalendar(schedule(), {
      memberId: "m1",
      lang: "ja",
      origin,
      now,
    });
    const list = events(ics);
    // 2 人で 2 つの仕事なので、佐藤さんは毎回どちらかの当番
    expect(list[0]).toMatchObject({
      "DTSTART;VALUE=DATE": "20261005",
      "DTEND;VALUE=DATE": "20261012",
      SUMMARY: "掃除当番：床・窓",
      URL: "https://toban.app/s/abcdefghij",
      UID: "abcdefghij-m1-20261005@toban.app",
    });
    expect(list[1]).toMatchObject({
      "DTSTART;VALUE=DATE": "20261012",
      SUMMARY: "掃除当番：ゴミ出し",
    });
    expect(ics).toContain("X-WR-CALNAME:掃除当番（佐藤）");
  });

  it("全員分は、回ごとに誰が何をするかを 1 件にまとめる", () => {
    const list = events(buildCalendar(schedule(), { lang: "ja", origin, now }));
    expect(list[0].SUMMARY).toBe("掃除当番：佐藤（床・窓）、鈴木（ゴミ出し）");
    expect(list[0].UID).toBe("abcdefghij-all-20261005@toban.app");
  });

  it("前 1 か月から先 6 か月までを入れる", () => {
    const list = events(
      buildCalendar(
        schedule({
          rotationConfig: {
            mode: "date",
            startDate: "2026-01-05",
            cycleDays: 7,
          },
        }),
        { lang: "ja", origin, now }
      )
    );
    const starts = list.map(e => e["DTSTART;VALUE=DATE"]);
    // 9/5（31 日前）を含む回から、4/7（183 日後）より前に始まる回まで
    expect(starts[0]).toBe("20260831");
    expect(starts.at(-1)! <= "20270407").toBe(true);
    expect(starts.at(-1)! > "20270329").toBe(true);
  });

  it("休みの日を飛ばす表は、休みの前で回を終える", () => {
    const list = events(
      buildCalendar(
        schedule({
          rotationConfig: {
            mode: "date",
            startDate: "2026-10-05",
            cycleDays: 5,
            skipSaturday: true,
            skipSunday: true,
          },
        }),
        { memberId: "m2", lang: "ja", origin, now }
      )
    );
    expect(list[0]["DTSTART;VALUE=DATE"]).toBe("20261005");
    // 金曜まで（翌日の土曜を終わりに書く）
    expect(list[0]["DTEND;VALUE=DATE"]).toBe("20261010");
    expect(list[1]["DTSTART;VALUE=DATE"]).toBe("20261012");
  });

  it("英語では区切りと名前の付け方を変える", () => {
    const ics = buildCalendar(schedule({ name: "Cleaning" }), {
      lang: "en",
      origin,
      now,
    });
    expect(events(ics)[0].SUMMARY).toBe(
      "Cleaning: 佐藤 (床\\, 窓)\\, 鈴木 (ゴミ出し)"
    );
    expect(ics).toContain("X-WR-CALNAME:Cleaning (everyone)");
  });

  it("手で交代する表には予定を入れない", () => {
    const ics = buildCalendar(
      schedule({ rotationConfig: { mode: "manual" } }),
      { lang: "ja", origin, now }
    );
    expect(events(ics)).toEqual([]);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it.each(["\r\n", "\n", "\r", "%000D", "\ud800"])(
    "メンバー ID に %j があっても予定の行を挿入せず、一意の UID にする",
    separator => {
      const id = `m${separator}X-INJECTED:yes`;
      const ics = buildCalendar(
        schedule({ members: [{ id, name: "佐藤", ...colors }] }),
        { memberId: id, lang: "ja", origin, now }
      );
      const unfolded = ics.replace(/\r\n /g, "");
      expect(unfolded).not.toMatch(/(?:^|[\r\n])X-INJECTED:/);
      expect(events(ics)[0].UID).not.toContain("\ufffd");
      expect(events(ics)[0].SUMMARY).toBe("掃除当番：床・窓、ゴミ出し");
      const other = buildCalendar(
        schedule({
          members: [{ id: "mX-INJECTED:yes", name: "佐藤", ...colors }],
        }),
        { memberId: "mX-INJECTED:yes", lang: "ja", origin, now }
      );
      expect(events(ics)[0].UID).not.toBe(events(other)[0].UID);
    }
  );

  it("異なる改行とその文字表記を含む ID の UID が重ならない", () => {
    const ids = ["m\r\n1", "m\n1", "m\r1", "m%000D1", "m\ud8001", "m\ufffd1"];
    const uids = ids.map(
      id =>
        events(
          buildCalendar(
            schedule({ members: [{ id, name: "佐藤", ...colors }] }),
            {
              memberId: id,
              lang: "ja",
              origin,
              now,
            }
          )
        )[0].UID
    );
    expect(new Set(uids).size).toBe(ids.length);
  });

  it.each(["\\", "当", "😀"])(
    "保存可能な最大の仕事量（%s）でも、日次フィードと各件名の出力を制限する",
    task => {
      const ics = buildCalendar(
        schedule({
          groups: Array.from({ length: LIMITS.groups }, (_, i) => ({
            id: `g${i}`,
            tasks: Array.from({ length: LIMITS.tasksPerGroup }, () =>
              task.repeat(Math.floor(LIMITS.task / task.length))
            ),
            emoji: "🧹",
          })),
          rotationConfig: {
            mode: "date",
            startDate: "2026-01-01",
            cycleDays: 1,
          },
        }),
        { lang: "en", origin, now }
      );
      const list = events(ics);
      const encoder = new TextEncoder();
      expect(list).toHaveLength(215);
      expect(encoder.encode(ics).length).toBeLessThan(350 * 1024);
      for (const event of list) {
        expect(encoder.encode(event.SUMMARY).length).toBeLessThanOrEqual(1024);
        expect(event.SUMMARY).toMatch(/…$/);
        expect(event.URL).toBe("https://toban.app/s/abcdefghij");
      }
      for (const line of ics.split("\r\n")) {
        expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
      }
    }
  );
});

describe("escapeText", () => {
  it("\\ ; , と改行を逃がす", () => {
    expect(escapeText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
    expect(escapeText("a\rb\r\nc")).toBe("a\\nb\\nc");
  });
});

describe("foldLine", () => {
  it("75 バイトを超える行を、文字の途中で切らずに折り返す", () => {
    const line = "SUMMARY:" + "当番".repeat(40);
    const folded = foldLine(line);
    const encoder = new TextEncoder();
    for (const part of folded.split("\r\n")) {
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });

  it("短い行はそのまま", () => {
    expect(foldLine("VERSION:2.0")).toBe("VERSION:2.0");
  });
});
