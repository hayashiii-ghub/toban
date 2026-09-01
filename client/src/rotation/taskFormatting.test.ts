import { describe, expect, it } from "vitest";
import { formatTaskNames } from "./taskFormatting";

describe("formatTaskNames", () => {
  it("keeps the existing Japanese separator", () => {
    expect(formatTaskNames(["掃除", "ゴミ捨て"], "ja")).toBe("掃除・ゴミ捨て");
  });

  it("uses natural punctuation for English task names", () => {
    expect(formatTaskNames(["Restock supplies", "Check inventory"], "en")).toBe(
      "Restock supplies, Check inventory"
    );
  });
});
