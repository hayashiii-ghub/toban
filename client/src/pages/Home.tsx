/*
 * 掃除当番ローテーション表 — 円形ホイール版
 * Design: Neo-Brutalism with warm cream background
 * 外側の固定円: 掃除タスク3グループ（120°ずつ）— グレー系
 * 内側の回転円: 担当者3名（120°ずつ）— 鮮やかなカラー
 * 内側の円を回転させてローテーションを切り替える
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, RotateCcw } from "lucide-react";

// 掃除グループ（外側の固定円 — 3等分、各120°）
// startAngle: 各セクターの開始角度（0° = 上）
const TASK_GROUPS = [
  {
    id: "group1",
    lines: ["クイックル", "ワイパー", "─", "事務所掃除機"],
    tasks: ["クイックルワイパー", "事務所掃除機"],
    bgColor: "#EBEBEB",
    startAngle: 0,
  },
  {
    id: "group2",
    lines: ["トイレ", "加湿器", "水回り"],
    tasks: ["トイレ", "加湿器", "水回り"],
    bgColor: "#DCDCDC",
    startAngle: 120,
  },
  {
    id: "group3",
    lines: ["床（掃除機）", "─", "ゴミ捨て"],
    tasks: ["床（掃除機）", "ゴミ捨て"],
    bgColor: "#EBEBEB",
    startAngle: 240,
  },
];

// 担当者（内側の回転円 — 3等分、各120°）
const MEMBERS = [
  { id: "tanaka", name: "田中", sectorColor: "#5B9BD5", textColor: "#fff" },
  { id: "matsumaru", name: "松丸", sectorColor: "#F4A940", textColor: "#fff" },
  { id: "yamashita", name: "山下", sectorColor: "#6BBF6B", textColor: "#fff" },
];

// ドーナツ型の円弧パスを生成
function describeDonutArc(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    `Z`,
  ].join(" ");
}

// 内側の円用のパイ型パス
function describeArc(
  cx: number, cy: number, r: number,
  startAngle: number, endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

export default function Home() {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const innerRotationDeg = rotation * 120;

  const handleRotate = (dir: "forward" | "backward") => {
    if (isAnimating) return;
    setIsAnimating(true);
    setRotation((prev) => dir === "forward" ? prev + 1 : prev - 1);
    setTimeout(() => setIsAnimating(false), 700);
  };

  // 現在の割り当てを計算
  const currentAssignments = useMemo(() => {
    const normalizedRot = ((rotation % 3) + 3) % 3;
    return TASK_GROUPS.map((group, i) => {
      const memberIdx = (i + normalizedRot) % 3;
      return { group, member: MEMBERS[memberIdx] };
    });
  }, [rotation]);

  const cx = 250;
  const cy = 250;
  const outerR = 245;
  const innerR = 130;
  const gapR = innerR + 4;

  // テキスト配置用の半径（ドーナツリングの中央）
  const textR = (outerR + gapR) / 2;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFF8E7" }}>
      {/* ヘッダー */}
      <header className="pt-6 pb-2 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1
            className="text-3xl md:text-4xl font-extrabold tracking-tight"
            style={{ color: "#1a1a1a", fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
          >
            掃除当番表
          </h1>
          <p className="mt-1 text-sm font-medium" style={{ color: "#888" }}>
            内側の円を回して担当をローテーション
          </p>
        </div>
      </header>

      {/* 円形ホイール */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="relative" style={{ paddingBottom: "100%" }}>
            <svg
              viewBox="0 0 500 500"
              className="absolute inset-0 w-full h-full"
              style={{ filter: "drop-shadow(3px 3px 0px rgba(0,0,0,0.12))" }}
            >
              {/* === 外側の円 — 掃除タスク（固定、ドーナツ型、グレー系） === */}
              {TASK_GROUPS.map((group, i) => {
                const startAngle = group.startAngle;
                const endAngle = startAngle + 120;
                const midAngle = startAngle + 60;
                const textPos = polarToCartesian(cx, cy, textR, midAngle);

                return (
                  <g key={group.id}>
                    <path
                      d={describeDonutArc(cx, cy, outerR, gapR, startAngle, endAngle)}
                      fill={group.bgColor}
                      stroke="#aaa"
                      strokeWidth="1.5"
                    />
                    {/* テキスト — 水平に配置（回転なし） */}
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#444"
                      fontWeight="700"
                      fontFamily="'M PLUS Rounded 1c', sans-serif"
                    >
                      {group.lines.map((line, lIdx) => {
                        const isDeco = line === "─";
                        const fontSize = isDeco ? 7 : 11;
                        const lineH = isDeco ? 8 : 14;
                        const heights = group.lines.map((l) => l === "─" ? 8 : 14);
                        const totalHeight = heights.reduce((a, b) => a + b, 0);
                        let cumOffset = 0;
                        for (let j = 0; j < lIdx; j++) cumOffset += heights[j];
                        const offsetY = -totalHeight / 2 + cumOffset + lineH / 2;

                        return (
                          <tspan
                            key={lIdx}
                            x={textPos.x}
                            dy={lIdx === 0 ? `${offsetY}px` : `${heights[lIdx - 1]}px`}
                            fontSize={fontSize}
                            fill={isDeco ? "#bbb" : "#444"}
                          >
                            {line}
                          </tspan>
                        );
                      })}
                    </text>
                  </g>
                );
              })}

              {/* 外側セクターの境界線 */}
              {[0, 120, 240].map((angle, i) => {
                const edgePoint = polarToCartesian(cx, cy, outerR, angle);
                const innerPoint = polarToCartesian(cx, cy, gapR, angle);
                return (
                  <line
                    key={`divider-${i}`}
                    x1={innerPoint.x} y1={innerPoint.y}
                    x2={edgePoint.x} y2={edgePoint.y}
                    stroke="#aaa" strokeWidth="1.5"
                  />
                );
              })}

              <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#aaa" strokeWidth="2" />
              <circle cx={cx} cy={cy} r={gapR} fill="none" stroke="#aaa" strokeWidth="1.5" />
            </svg>

            {/* === 内側の回転する円 === */}
            <div
              className="absolute"
              style={{
                top: `${((cy - innerR) / 500) * 100}%`,
                left: `${((cx - innerR) / 500) * 100}%`,
                width: `${((innerR * 2) / 500) * 100}%`,
                height: `${((innerR * 2) / 500) * 100}%`,
              }}
            >
              <motion.div
                className="w-full h-full"
                animate={{ rotate: innerRotationDeg }}
                transition={{
                  type: "spring",
                  stiffness: 80,
                  damping: 20,
                  duration: 0.6,
                }}
              >
                <svg viewBox="0 0 260 260" className="w-full h-full">
                  {MEMBERS.map((member, i) => {
                    const startAngle = i * 120;
                    const endAngle = (i + 1) * 120;
                    const midAngle = startAngle + 60;
                    const textPos = polarToCartesian(130, 130, 70, midAngle);
                    const counterRotation = -innerRotationDeg;

                    return (
                      <g key={member.id}>
                        <path
                          d={describeArc(130, 130, 128, startAngle, endAngle)}
                          fill={member.sectorColor}
                          stroke="#555"
                          strokeWidth="2.5"
                        />
                        <g transform={`translate(${textPos.x}, ${textPos.y})`}>
                          <motion.g
                            animate={{ rotate: counterRotation }}
                            transition={{
                              type: "spring",
                              stiffness: 80,
                              damping: 20,
                              duration: 0.6,
                            }}
                          >
                            <text
                              x={0} y={0}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill={member.textColor}
                              fontSize="30"
                              fontWeight="800"
                              fontFamily="'M PLUS Rounded 1c', sans-serif"
                              stroke="rgba(0,0,0,0.2)"
                              strokeWidth="0.5"
                              paintOrder="stroke"
                            >
                              {member.name}
                            </text>
                          </motion.g>
                        </g>
                      </g>
                    );
                  })}

                  <circle cx={130} cy={130} r={24} fill="#FFF8E7" stroke="#555" strokeWidth="2.5" />

                  {[0, 1, 2].map((i) => {
                    const angle = i * 120;
                    const edgePoint = polarToCartesian(130, 130, 128, angle);
                    const innerPoint = polarToCartesian(130, 130, 24, angle);
                    return (
                      <line
                        key={`inner-divider-${i}`}
                        x1={innerPoint.x} y1={innerPoint.y}
                        x2={edgePoint.x} y2={edgePoint.y}
                        stroke="#555" strokeWidth="2.5"
                      />
                    );
                  })}

                  <circle cx={130} cy={130} r={128} fill="none" stroke="#555" strokeWidth="2.5" />
                </svg>
              </motion.div>
            </div>

            {/* 中心の回転アイコン */}
            <div
              className="absolute"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: `${(32 / 500) * 100}%`,
                height: `${(32 / 500) * 100}%`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <RotateCw className="w-full h-full" style={{ color: "#999" }} strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* ローテーション制御ボタン */}
      <div className="px-4 py-2">
        <div className="max-w-md mx-auto">
          <div
            className="p-4 flex items-center justify-between gap-3"
            style={{
              backgroundColor: "#FBBF24",
              borderRadius: "12px",
              border: "3px solid #1a1a1a",
              boxShadow: "4px 4px 0px #1a1a1a",
            }}
          >
            <button
              onClick={() => handleRotate("backward")}
              disabled={isAnimating}
              className="flex items-center gap-2 px-4 py-2.5 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
              style={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                border: "3px solid #1a1a1a",
                boxShadow: "3px 3px 0px #1a1a1a",
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
              }}
            >
              <RotateCcw className="w-5 h-5" />
              戻す
            </button>

            <div className="text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={((rotation % 3) + 3) % 3}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-10 h-10 flex items-center justify-center font-extrabold text-lg mx-auto"
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: "50%",
                    border: "3px solid #1a1a1a",
                    fontFamily: "'M PLUS Rounded 1c', sans-serif",
                  }}
                >
                  {((rotation % 3) + 3) % 3}
                </motion.div>
              </AnimatePresence>
              <div
                className="text-xs font-bold mt-1"
                style={{ color: "#7C5E00", fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
              >
                ローテーション
              </div>
            </div>

            <button
              onClick={() => handleRotate("forward")}
              disabled={isAnimating}
              className="flex items-center gap-2 px-4 py-2.5 font-bold text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50"
              style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "8px",
                border: "3px solid #1a1a1a",
                boxShadow: "3px 3px 0px #1a1a1a",
                fontFamily: "'M PLUS Rounded 1c', sans-serif",
              }}
            >
              次へ回す
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 現在の割り当て一覧 */}
      <div className="px-4 py-4 pb-10">
        <div className="max-w-md mx-auto">
          <div
            className="p-4"
            style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              border: "3px solid #1a1a1a",
              boxShadow: "3px 3px 0px #1a1a1a",
            }}
          >
            <h2
              className="text-xs font-extrabold mb-3 tracking-wider uppercase"
              style={{ color: "#999", fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
            >
              現在の担当
            </h2>
            <div className="flex flex-col gap-2.5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={((rotation % 3) + 3) % 3}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-2.5"
                >
                  {currentAssignments.map(({ group, member }) => (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                      style={{
                        borderRadius: "8px",
                        backgroundColor: `${member.sectorColor}18`,
                        border: `2px solid ${member.sectorColor}88`,
                      }}
                    >
                      <div
                        className="w-9 h-9 flex items-center justify-center font-extrabold text-sm shrink-0"
                        style={{
                          borderRadius: "50%",
                          backgroundColor: member.sectorColor,
                          color: member.textColor,
                          border: "2px solid #555",
                          fontFamily: "'M PLUS Rounded 1c', sans-serif",
                        }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="font-extrabold text-sm"
                          style={{ color: "#1a1a1a", fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
                        >
                          {member.name}
                        </div>
                        <div
                          className="text-xs font-bold"
                          style={{ color: "#666", fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
                        >
                          {group.tasks.join("・")}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
