// 円盤型当番表の幾何計算（純関数）。
// 角度は度数法・時計回り・0° = 真上（12時方向）で統一する。

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** 中心 (cx,cy)・半径 r・角度 deg（時計回り, 0°=真上）の点を直交座標で返す。 */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  deg: number
): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** N 等分した index 番目の扇形の開始/終了角度（度）。隙間なく連続し、最後は 360° で閉じる。 */
export function sectorAngles(
  n: number,
  index: number
): { startDeg: number; endDeg: number } {
  const step = 360 / n;
  return { startDeg: step * index, endDeg: step * (index + 1) };
}

/** 扇形の角度中央・半径 r の点（ラベル配置用）。 */
export function sectorMidpoint(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): { x: number; y: number } {
  return polarToCartesian(cx, cy, r, (startDeg + endDeg) / 2);
}

/** 内半径 rInner〜外半径 rOuter の環状扇形を表す SVG path 文字列。 */
export function sectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const o1 = polarToCartesian(cx, cy, rOuter, startDeg);
  const o2 = polarToCartesian(cx, cy, rOuter, endDeg);
  const i2 = polarToCartesian(cx, cy, rInner, endDeg);
  const i1 = polarToCartesian(cx, cy, rInner, startDeg);
  return [
    `M ${round(o1.x)} ${round(o1.y)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${round(o2.x)} ${round(o2.y)}`,
    `L ${round(i2.x)} ${round(i2.y)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${round(i1.x)} ${round(i1.y)}`,
    "Z",
  ].join(" ");
}
