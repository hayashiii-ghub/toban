/*
 * 掃除当番ローテーション表 — 円形ホイール版
 * Design: Neo-Brutalism with warm cream background
 * 外側の固定円: 掃除タスク3グループ（120°ずつ）
 * 内側の回転円: 担当者3名（120°ずつ）— テキストは常に正位置
 * 内側の円を回転させてローテーションを切り替える
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCw, RotateCcw } from "lucide-react";

// 掃除グループ（外側の固定円 — 3等分、各120°）
const TASK_GROUPS = [
  {
    id: "group1",
    label: "クイックルワイパー\n事務所掃除機",
    tasks: ["クイックルワイパー", "事務所掃除機"],
    color: "#3B82F6",
    bgColor: "#DBEAFE",
  },
  {
    id: "group2",
    label: "トイレ・加湿器\n水回り",
    tasks: ["トイレ", "加湿器", "水回り"],
    color: "#10B981",
    bgColor: "#D1FAE5",
  },
  {
    id: "group3",
    label: "床（掃除機）\nゴミ捨て",
    tasks: ["床（掃除機）", "ゴミ捨て"],
    color: "#F97316",
    bgColor: "#FED7AA",
  },
];

// 担当者（内側の回転円 — 3等分、各120°）
const MEMBERS = [
  { id: "tanaka", name: "田中", color: "#3B82F6", sectorColor: "#93BBFD" },
  { id: "matsumaru", name: "松丸", color: "#F97316", sectorColor: "#FDB882" },
  { id: "yamashita", name: "山下", color: "#10B981", sectorColor: "#7EDCB5" },
];

// SVGで円弧のパスを生成
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
  const outerR = 230;
  const innerR = 130;

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
              style={{ filter: "drop-shadow(4px 4px 0px #1a1a1a)" }}
            >
              {/* === 外側の円 — 掃除タスク（固定） === */}
              {TASK_GROUPS.map((group, i) => {
                const startAngle = i * 120;
                const endAngle = (i + 1) * 120;
                const midAngle = startAngle + 60;
                const textR = (outerR + innerR) / 2 + 8;
                const textPos = polarToCartesian(cx, cy, textR, midAngle);

                const lines = group.label.split("\n");

                return (
                  <g key={group.id}>
                    <path
                      d={describeArc(cx, cy, outerR, startAngle, endAngle)}
                      fill={group.bgColor}
                      stroke="#1a1a1a"
                      strokeWidth="3"
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#1a1a1a"
                      fontSize="16"
                      fontWeight="700"
                      fontFamily="'M PLUS Rounded 1c', sans-serif"
                    >
                      {lines.map((line, lIdx) => (
                        <tspan
                          key={lIdx}
                          x={textPos.x}
                          dy={lIdx === 0 ? `${-(lines.length - 1) * 0.55}em` : "1.2em"}
                        >
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}

              {/* 外側セクターの境界線 */}
              {[0, 1, 2].map((i) => {
                const angle = i * 120;
                const edgePoint = polarToCartesian(cx, cy, outerR, angle);
                const innerPoint = polarToCartesian(cx, cy, innerR + 3, angle);
                return (
                  <line
                    key={`divider-${i}`}
                    x1={innerPoint.x} y1={innerPoint.y}
                    x2={edgePoint.x} y2={edgePoint.y}
                    stroke="#1a1a1a" strokeWidth="3"
                  />
                );
              })}

              {/* 外側の円枠 */}
              <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#1a1a1a" strokeWidth="3" />

              {/* 内側の円枠（固定） */}
              <circle cx={cx} cy={cy} r={innerR + 3} fill="none" stroke="#1a1a1a" strokeWidth="3" />
            </svg>

            {/* === 内側の回転する円（HTMLオーバーレイ） === */}
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
                  {/* 担当者セクター */}
                  {MEMBERS.map((member, i) => {
                    const startAngle = i * 120;
                    const endAngle = (i + 1) * 120;
                    const midAngle = startAngle + 60;
                    const textPos = polarToCartesian(130, 130, 70, midAngle);

                    // テキストを常に正位置にするための逆回転角度
                    const counterRotation = -innerRotationDeg;

                    return (
                      <g key={member.id}>
                        <path
                          d={describeArc(130, 130, 128, startAngle, endAngle)}
                          fill={member.sectorColor}
                          stroke="#1a1a1a"
                          strokeWidth="3"
                        />
                        {/* テキストを逆回転で正位置に保つ */}
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
                              x={0}
                              y={0}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="#1a1a1a"
                              fontSize="30"
                              fontWeight="800"
                              fontFamily="'M PLUS Rounded 1c', sans-serif"
                            >
                              {member.name}
                            </text>
                          </motion.g>
                        </g>
                      </g>
                    );
                  })}

                  {/* 中心の小さい円 */}
                  <circle cx={130} cy={130} r={22} fill="#FFF8E7" stroke="#1a1a1a" strokeWidth="3" />

                  {/* 内側の仕切り線 */}
                  {[0, 1, 2].map((i) => {
                    const angle = i * 120;
                    const edgePoint = polarToCartesian(130, 130, 128, angle);
                    const innerPoint = polarToCartesian(130, 130, 22, angle);
                    return (
                      <line
                        key={`inner-divider-${i}`}
                        x1={innerPoint.x} y1={innerPoint.y}
                        x2={edgePoint.x} y2={edgePoint.y}
                        stroke="#1a1a1a" strokeWidth="3"
                      />
                    );
                  })}
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
                width: `${(36 / 500) * 100}%`,
                height: `${(36 / 500) * 100}%`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <RotateCw
                className="w-full h-full"
                style={{ color: "#999" }}
                strokeWidth={2.5}
              />
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
                        backgroundColor: group.bgColor,
                        border: "2px solid #1a1a1a",
                      }}
                    >
                      <div
                        className="w-9 h-9 flex items-center justify-center font-extrabold text-sm shrink-0"
                        style={{
                          borderRadius: "50%",
                          backgroundColor: member.color,
                          color: "#fff",
                          border: "2px solid #1a1a1a",
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
