import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@/test/vue";
import type { RotationConfig } from "@/rotation/types";
import { RotationConfigEditor } from "./RotationConfigEditor";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe("RotationConfigEditor", () => {
  it("日付モードの開始日は端末の日付で入る（日本時間の早朝でも前日にならない）", async () => {
    vi.stubEnv("TZ", "Asia/Tokyo");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-28T22:30:00Z")); // 日本時間 9/29 7:30
    const onUpdate =
      vi.fn<(updater: (prev: RotationConfig) => RotationConfig) => void>();
    render(
      <RotationConfigEditor config={{ mode: "manual" }} onUpdate={onUpdate} />
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "日付で自動切り替え" })
    );
    const updater = onUpdate.mock.calls[0][0];
    expect(updater({ mode: "manual" }).startDate).toBe("2026-09-29");
  });
});
