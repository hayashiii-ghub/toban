import { describe, it, expect } from "vitest";
import {
  VIEW_TABS,
  VIEW_VALUES,
  isViewTab,
  viewOrientation,
  viewMcpLabel,
} from "./viewTabsConfig";

describe("VIEW_TABS / VIEW_VALUES", () => {
  it("4つの view を順に持つ（cards/table/calendar/disc）", () => {
    expect(VIEW_VALUES).toEqual(["cards", "table", "calendar", "disc"]);
    expect(VIEW_TABS.map(v => v.value)).toEqual(VIEW_VALUES);
  });
});

describe("isViewTab", () => {
  it("既知の view は true（disc 含む）", () => {
    expect(isViewTab("cards")).toBe(true);
    expect(isViewTab("disc")).toBe(true);
  });
  it("未知の値・非文字列は false", () => {
    expect(isViewTab("timeline")).toBe(false);
    expect(isViewTab(null)).toBe(false);
    expect(isViewTab(123)).toBe(false);
  });
});

describe("viewOrientation", () => {
  it("calendar / disc は portrait", () => {
    expect(viewOrientation("calendar")).toBe("portrait");
    expect(viewOrientation("disc")).toBe("portrait");
  });
  it("cards / table は landscape", () => {
    expect(viewOrientation("cards")).toBe("landscape");
    expect(viewOrientation("table")).toBe("landscape");
  });
  it("未知の値は landscape にフォールバック", () => {
    expect(viewOrientation("bogus")).toBe("landscape");
  });
});

describe("viewMcpLabel", () => {
  it("各 view の WebMCP 用 JP ラベルを返す（disc=円盤）", () => {
    expect(viewMcpLabel("cards")).toBe("カード");
    expect(viewMcpLabel("disc")).toBe("円盤");
  });
  it("未知の値はそのまま返す", () => {
    expect(viewMcpLabel("bogus")).toBe("bogus");
  });
});
