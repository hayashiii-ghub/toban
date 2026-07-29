import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, within } from "@testing-library/react";
import { TodayBanner } from "./TodayBanner";
import type { Member, TaskGroup } from "@shared/types";

afterEach(cleanup);

const members: Member[] = [
  {
    id: "m1",
    name: "田中太郎",
    color: "#4F46E5",
    bgColor: "#EEF2FF",
    textColor: "#312E81",
  },
  {
    id: "m2",
    name: "鈴木花子",
    color: "#4F46E5",
    bgColor: "#EEF2FF",
    textColor: "#312E81",
  },
];
const groups: TaskGroup[] = [{ id: "g1", tasks: ["掃除"], emoji: "🧹" }];

describe("TodayBanner", () => {
  it("手動モードでは「いまの当番」ラベルと現在の周回が表示される", () => {
    const { container } = render(
      <TodayBanner
        groups={groups}
        members={members}
        rotation={2}
        isDateMode={false}
        rotationLabel="2回目"
        assignmentMode="member"
      />
    );
    expect(
      within(container).getByText("いまの当番（2回目）")
    ).toBeInTheDocument();
  });

  it("自動モードでは「きょうの当番」ラベルが表示される", () => {
    const { container } = render(
      <TodayBanner
        groups={groups}
        members={members}
        rotation={0}
        isDateMode={true}
        rotationLabel="初期"
        assignmentMode="member"
      />
    );
    expect(within(container).getByText(/きょうの当番/)).toBeInTheDocument();
  });

  it("アクティブメンバーがいない時は表示されない", () => {
    const { container } = render(
      <TodayBanner
        groups={groups}
        members={[]}
        rotation={0}
        isDateMode={false}
        rotationLabel="初期"
        assignmentMode="member"
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
