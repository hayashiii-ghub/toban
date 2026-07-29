import { describe, it, expect } from "vitest";
import {
  polarToCartesian,
  sectorMidpoint,
  sectorPath,
  sectorAngles,
} from "./discGeometry";

describe("polarToCartesian", () => {
  it("0°は真上（12時方向）", () => {
    const p = polarToCartesian(100, 100, 50, 0);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });

  it("90°は時計回りで真右（3時方向）", () => {
    const p = polarToCartesian(100, 100, 50, 90);
    expect(p.x).toBeCloseTo(150, 5);
    expect(p.y).toBeCloseTo(100, 5);
  });
});

describe("sectorAngles", () => {
  it("N等分の各扇形は 360/N 度ずつで隙間なく連続する", () => {
    const a0 = sectorAngles(4, 0);
    const a1 = sectorAngles(4, 1);
    expect(a0).toEqual({ startDeg: 0, endDeg: 90 });
    expect(a1.startDeg).toBe(a0.endDeg);
    expect(sectorAngles(4, 3).endDeg).toBe(360);
  });
});

describe("sectorMidpoint", () => {
  it("0°〜90°扇形の中点は45°方向", () => {
    const m = sectorMidpoint(100, 100, 50, 0, 90);
    // 45° clockwise from top: x=100+50*sin45, y=100-50*cos45
    expect(m.x).toBeCloseTo(100 + 50 * Math.SQRT1_2, 4);
    expect(m.y).toBeCloseTo(100 - 50 * Math.SQRT1_2, 4);
  });
});

describe("sectorPath", () => {
  it("M で始まり Z で閉じ、円弧2つ(A)を含む環状扇形を返す", () => {
    const d = sectorPath(100, 100, 30, 60, 0, 90);
    expect(d.startsWith("M")).toBe(true);
    expect(d.trimEnd().endsWith("Z")).toBe(true);
    expect((d.match(/A /g) ?? []).length).toBe(2);
  });

  it("扇形が180°超なら large-arc-flag=1、以下なら0", () => {
    const big = sectorPath(100, 100, 30, 60, 0, 270);
    const small = sectorPath(100, 100, 30, 60, 0, 90);
    // 外周アーク "A rOuter rOuter 0 <flag> 1 ..." の flag を見る
    expect(big).toMatch(/A 60 60 0 1 1 /);
    expect(small).toMatch(/A 60 60 0 0 1 /);
  });
});
