import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, fireEvent } from "@/test/vue";
import { LanguageProvider } from "@/i18n";
import { RotationCalendar } from "./RotationCalendar";
import type { Member, RotationConfig, TaskGroup } from "@shared/types";

afterEach(cleanup);

function makeMember(id: string, name: string): Member {
  return {
    id,
    name,
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    textColor: "#1E3A5F",
  };
}

function makeGroup(id: string, emoji: string, tasks: string[]): TaskGroup {
  return { id, emoji, tasks };
}

const members = [
  makeMember("m1", "田中"),
  makeMember("m2", "山田"),
  makeMember("m3", "佐藤"),
];
const groups = [
  makeGroup("g1", "🧹", ["掃除"]),
  makeGroup("g2", "🍽", ["給食"]),
];

describe("RotationCalendar", () => {
  beforeEach(() => {
    // Fix the "today" date for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15)); // March 15, 2026
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders current month in header", async () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />
    );
    expect(container.textContent).toContain("2026年3月");
  });

  it("renders weekday headers", async () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />
    );
    const text = container.textContent!;
    expect(text).toContain("日");
    expect(text).toContain("月");
    expect(text).toContain("土");
  });

  it("navigates to next and previous months", async () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />
    );

    const getBtn = (label: string) =>
      Array.from(container.querySelectorAll("button")).find(
        b => b.textContent === label
      )!;

    // Go to next month
    await fireEvent.click(getBtn("▶"));
    expect(container.textContent).toContain("2026年4月");

    // Go back two months (re-query after each render)
    await fireEvent.click(getBtn("◀"));
    expect(container.textContent).toContain("2026年3月");
    await fireEvent.click(getBtn("◀"));
    expect(container.textContent).toContain("2026年2月");
  });

  it("shows 今月 button when not on current month and navigates back", async () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />
    );

    // Initially no 今月 button
    let todayBtn = Array.from(container.querySelectorAll("button")).find(
      b => b.textContent === "今月"
    );
    expect(todayBtn).toBeUndefined();

    // Navigate away
    const nextBtn = Array.from(container.querySelectorAll("button")).find(
      b => b.textContent === "▶"
    )!;
    await fireEvent.click(nextBtn);

    // Now 今月 button should appear
    todayBtn = Array.from(container.querySelectorAll("button")).find(
      b => b.textContent === "今月"
    );
    expect(todayBtn).toBeDefined();

    // Click it to go back
    await fireEvent.click(todayBtn!);
    expect(container.textContent).toContain("2026年3月");
  });

  it("shows manual mode badge when not in date mode", async () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />
    );
    expect(container.textContent).toContain("手動切り替え：当番は固定です");
  });

  it("does not show manual mode badge in date mode", async () => {
    const config: RotationConfig = {
      mode: "date",
      startDate: "2026-03-01",
      cycleDays: 1,
    };
    const { container } = render(
      <RotationCalendar
        groups={groups}
        members={members}
        rotation={0}
        rotationConfig={config}
      />
    );
    expect(container.textContent).not.toContain("手動切り替え：当番は固定です");
  });

  it("開始日より前の日には当番を出さない", async () => {
    const config: RotationConfig = {
      mode: "date",
      startDate: "2026-03-10",
      cycleDays: 1,
    };
    const { container } = render(
      <RotationCalendar
        groups={groups}
        members={members}
        rotation={0}
        rotationConfig={config}
      />
    );
    // 押せる（当番の出る）日は 3/10〜3/31 の 22 日だけ
    expect(container.querySelectorAll("[aria-pressed]")).toHaveLength(22);
  });

  it("renders legend with group emojis and task names", async () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />
    );
    expect(container.textContent).toContain("🧹");
    expect(container.textContent).toContain("掃除");
    expect(container.textContent).toContain("🍽");
    expect(container.textContent).toContain("給食");
  });

  it("displays member names in calendar day cells", async () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />
    );
    // In manual mode, all days show the same assignments
    expect(container.textContent).toContain("田中");
  });

  it("shows holiday names (春分の日 on March 20, 2026)", async () => {
    const { container } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />
    );
    // March 20, 2026 is 春分の日
    expect(container.textContent).toContain("春分の日");
  });
});

it("shows English holiday labels while preserving user-entered roster text", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 1));
  localStorage.setItem("toban-lang", "en");
  try {
    const { container } = render(
      <LanguageProvider>
        <RotationCalendar groups={groups} members={members} rotation={0} />
      </LanguageProvider>
    );
    expect(container.textContent).toContain("September 2026");
    expect(container.textContent).toContain("Respect for the Aged Day");
    const holiday = container.querySelector(
      '[title="Respect for the Aged Day"]'
    );
    expect(holiday).toHaveTextContent("Seniors");
    expect(holiday?.querySelector(".sr-only")).toHaveTextContent(
      "Respect for the Aged Day"
    );
    expect(container.textContent).not.toContain("敬老の日");
    expect(container.textContent).toContain("掃除");
    expect(container.textContent).toContain("田中");
  } finally {
    cleanup();
    localStorage.removeItem("toban-lang");
    document.documentElement.lang = "ja";
    vi.useRealTimers();
  }
});
