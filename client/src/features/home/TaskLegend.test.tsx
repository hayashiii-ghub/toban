import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { TaskLegend } from "./TaskLegend";
import { RotationCalendar } from "./RotationCalendar";
import { RotationDisc } from "./RotationDisc";
import type { Member, TaskGroup } from "@shared/types";

afterEach(cleanup);

const mk = (id: string, name: string): Member => ({
  id,
  name,
  color: "#4F46E5",
  bgColor: "#EEF2FF",
  textColor: "#312E81",
});
const grp = (id: string, tasks: string[], emoji = "🧹"): TaskGroup => ({
  id,
  tasks,
  emoji,
});

const members = [mk("m1", "田中"), mk("m2", "鈴木"), mk("m3", "佐藤")];
const groups = [grp("g1", ["掃除"]), grp("g2", ["配膳"], "🍽")];

/** 凡例のチップ（li）を取り出す。凡例はどちらのビューでも唯一の ul。 */
function chips(container: HTMLElement) {
  return [...container.querySelectorAll("ul > li")];
}

describe("TaskLegend", () => {
  it("チップに theme-border を付ける", () => {
    // テーマの pageBg と cardBg はほぼ同色（しろばんは両方 #ffffff）で、
    // 塗りだけに頼るとチップの枠が消えて文字の羅列になる。
    const { container } = render(<TaskLegend groups={groups} />);
    for (const chip of chips(container)) {
      expect(chip.className).toContain("theme-border");
    }
  });

  it("当番名と絵文字を出し、絵文字は読み上げ対象にしない", () => {
    const { container } = render(<TaskLegend groups={groups} />);
    expect(container.textContent).toContain("掃除");
    expect(container.textContent).toContain("配膳");
    expect(container.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(
      2
    );
  });

  it("showOffDuty のときだけ「おやすみ」を足す", () => {
    const { container: without } = render(<TaskLegend groups={groups} />);
    expect(without.textContent).not.toContain("おやすみ");
    cleanup();
    const { container: withOff } = render(
      <TaskLegend groups={groups} showOffDuty />
    );
    expect(withOff.textContent).toContain("おやすみ");
    expect(chips(withOff)).toHaveLength(groups.length + 1);
  });

  it("align=center で中央寄せ、既定は左寄せ", () => {
    const { container: centered } = render(
      <TaskLegend groups={groups} align="center" />
    );
    expect(centered.querySelector("ul")!.className).toContain("justify-center");
    cleanup();
    const { container: start } = render(<TaskLegend groups={groups} />);
    expect(start.querySelector("ul")!.className).not.toContain(
      "justify-center"
    );
  });
});

describe("カレンダーと円盤の凡例", () => {
  it("同じチップの見た目を共有する", () => {
    // 以前は各ビューが個別に凡例を持ち、枠線・角丸・背景がずれていた。
    // 片方だけ手で書き換えると同じ情報が別物に見えるため、ここで固定する。
    const { container: cal } = render(
      <RotationCalendar groups={groups} members={members} rotation={0} />
    );
    const calChip = chips(cal)[0].className;
    cleanup();
    const { container: disc } = render(
      <RotationDisc groups={groups} members={members} rotation={0} />
    );
    const discChip = chips(disc)[0].className;

    expect(calChip).toBe(discChip);
  });
});
