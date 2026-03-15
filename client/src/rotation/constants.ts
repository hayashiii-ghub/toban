import type { ScheduleTemplate } from "./types";

export const APP_TITLE = "当番表メーカー｜無料で当番表を作成・印刷・共有";

export const ANIMATION_DURATION_MS = 500;
export const CARD_STAGGER_DELAY = 0.08;
export const TASK_STAGGER_DELAY = 0.06;

export const STORAGE_KEY = "rotation-schedule-app-state";
export const ONBOARDING_STORAGE_KEY = "toban-onboarding-complete";

export const TEMPLATES: ScheduleTemplate[] = [
  // ── 事務室・オフィス向け ──
  {
    name: "事務室の掃除当番",
    emoji: "🏢",
    groups: [
      { id: "g1", tasks: ["掃除機・モップ"], emoji: "🧹" },
      { id: "g2", tasks: ["トイレ・洗面台"], emoji: "🚿" },
      { id: "g3", tasks: ["ゴミ回収・ゴミ出し"], emoji: "🗑️" },
      { id: "g4", tasks: ["給湯室・流し台"], emoji: "🍵" },
    ],
    members: [
      { id: "m1", name: "佐藤", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "鈴木", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "高橋", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
      { id: "m4", name: "田中", color: "#8B5CF6", bgColor: "#EDE9FE", textColor: "#4C1D95" },
    ],
  },
  {
    name: "電話・来客当番",
    emoji: "📞",
    groups: [
      { id: "g1", tasks: ["午前の電話・来客対応"], emoji: "📞" },
      { id: "g2", tasks: ["午後の電話・来客対応"], emoji: "🤝" },
      { id: "g3", tasks: ["郵便物の仕分け・配布"], emoji: "📦" },
    ],
    members: [
      { id: "m1", name: "佐藤", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
      { id: "m2", name: "鈴木", color: "#EAB308", bgColor: "#FEF9C3", textColor: "#713F12" },
      { id: "m3", name: "高橋", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#7F1D1D" },
    ],
  },
  // ── 幼稚園・保育園向け ──
  {
    name: "園内おそうじ当番",
    emoji: "🌷",
    groups: [
      { id: "g1", tasks: ["保育室の掃除・消毒"], emoji: "🧹" },
      { id: "g2", tasks: ["トイレ掃除・補充"], emoji: "🚿" },
      { id: "g3", tasks: ["園庭・遊具の点検・片付け"], emoji: "🏞️" },
      { id: "g4", tasks: ["玄関・廊下"], emoji: "🚪" },
    ],
    members: [
      { id: "m1", name: "さくら組", color: "#EC4899", bgColor: "#FCE7F3", textColor: "#831843" },
      { id: "m2", name: "ひまわり組", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "たんぽぽ組", color: "#EAB308", bgColor: "#FEF9C3", textColor: "#713F12" },
      { id: "m4", name: "すみれ組", color: "#8B5CF6", bgColor: "#EDE9FE", textColor: "#4C1D95" },
    ],
  },
  {
    name: "バス添乗・お迎え当番",
    emoji: "🚌",
    groups: [
      { id: "g1", tasks: ["朝バス添乗"], emoji: "🚌" },
      { id: "g2", tasks: ["帰りバス添乗"], emoji: "🚌" },
      { id: "g3", tasks: ["お迎え対応・門番"], emoji: "🚪" },
    ],
    members: [
      { id: "m1", name: "山田先生", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "中村先生", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
      { id: "m3", name: "小林先生", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
    ],
  },
  {
    name: "預かり保育当番",
    emoji: "🕐",
    groups: [
      { id: "g1", tasks: ["早朝保育（7:30〜）"], emoji: "🌅" },
      { id: "g2", tasks: ["延長保育（〜18:00）"], emoji: "🌇" },
      { id: "g3", tasks: ["おやつ準備・片付け"], emoji: "🍪" },
    ],
    members: [
      { id: "m1", name: "吉田先生", color: "#EAB308", bgColor: "#FEF9C3", textColor: "#713F12" },
      { id: "m2", name: "伊藤先生", color: "#EC4899", bgColor: "#FCE7F3", textColor: "#831843" },
      { id: "m3", name: "渡辺先生", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#7F1D1D" },
    ],
  },
  // ── 小中学校向け（クラス用） ──
  {
    name: "教室そうじ当番",
    emoji: "🏫",
    groups: [
      { id: "g1", tasks: ["教室（ほうき・ちりとり）"], emoji: "🧹" },
      { id: "g2", tasks: ["教室（ぞうきんがけ）"], emoji: "💧" },
      { id: "g3", tasks: ["ろうか・階段"], emoji: "🚶" },
      { id: "g4", tasks: ["トイレそうじ"], emoji: "🚿" },
      { id: "g5", tasks: ["黒板・黒板消しクリーナー"], emoji: "📝" },
    ],
    members: [
      { id: "m1", name: "1班", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "2班", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "3班", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
      { id: "m4", name: "4班", color: "#8B5CF6", bgColor: "#EDE9FE", textColor: "#4C1D95" },
      { id: "m5", name: "5班", color: "#EC4899", bgColor: "#FCE7F3", textColor: "#831843" },
    ],
  },
  {
    name: "給食当番",
    emoji: "🍽️",
    groups: [
      { id: "g1", tasks: ["配膳（おかず）"], emoji: "🍚" },
      { id: "g2", tasks: ["配膳（汁物）", "配膳（ごはん）"], emoji: "🥢" },
      { id: "g3", tasks: ["牛乳・ストロー配り"], emoji: "🥛" },
      { id: "g4", tasks: ["片付け", "台拭き"], emoji: "🧽" },
    ],
    members: [
      { id: "m1", name: "1班", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "2班", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "3班", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
      { id: "m4", name: "4班", color: "#EAB308", bgColor: "#FEF9C3", textColor: "#713F12" },
    ],
  },
  {
    name: "日直",
    emoji: "📋",
    groups: [
      { id: "g1", tasks: ["朝の会・帰りの会の司会"], emoji: "🎤" },
      { id: "g2", tasks: ["黒板消し・日誌記入"], emoji: "📝" },
      { id: "g3", tasks: ["号令・あいさつ"], emoji: "🙋" },
    ],
    members: [
      { id: "m1", name: "Aペア", color: "#8B5CF6", bgColor: "#EDE9FE", textColor: "#4C1D95" },
      { id: "m2", name: "Bペア", color: "#EC4899", bgColor: "#FCE7F3", textColor: "#831843" },
      { id: "m3", name: "Cペア", color: "#EAB308", bgColor: "#FEF9C3", textColor: "#713F12" },
    ],
  },
  // ── 職員室向け（先生用） ──
  {
    name: "校内巡回・施錠当番",
    emoji: "🔑",
    groups: [
      { id: "g1", tasks: ["朝の校門立ち当番"], emoji: "🚸" },
      { id: "g2", tasks: ["昼休み巡回"], emoji: "👀" },
      { id: "g3", tasks: ["放課後の施錠・戸締り"], emoji: "🔒" },
    ],
    members: [
      { id: "m1", name: "山田先生", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "中村先生", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "小林先生", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
    ],
  },
  // ── PTA・保護者会向け ──
  {
    name: "旗振り（登下校見守り）当番",
    emoji: "🚩",
    groups: [
      { id: "g1", tasks: ["東門の旗振り"], emoji: "🚩" },
      { id: "g2", tasks: ["西門の旗振り"], emoji: "🚩" },
      { id: "g3", tasks: ["交差点の旗振り"], emoji: "🚩" },
    ],
    members: [
      { id: "m1", name: "山田", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "佐藤", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "中村", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
    ],
  },
  {
    name: "PTA行事準備当番",
    emoji: "🎪",
    groups: [
      { id: "g1", tasks: ["会場設営"], emoji: "🪑" },
      { id: "g2", tasks: ["受付・案内"], emoji: "📋" },
      { id: "g3", tasks: ["片付け"], emoji: "🧹" },
    ],
    members: [
      { id: "m1", name: "山田", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "鈴木", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "高橋", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
    ],
  },
  {
    name: "プール監視当番",
    emoji: "🏊",
    groups: [
      { id: "g1", tasks: ["午前の部"], emoji: "👀" },
      { id: "g2", tasks: ["午後の部"], emoji: "👀" },
      { id: "g3", tasks: ["救護・記録"], emoji: "🩹" },
    ],
    members: [
      { id: "m1", name: "田中", color: "#8B5CF6", bgColor: "#EDE9FE", textColor: "#4C1D95" },
      { id: "m2", name: "伊藤", color: "#EC4899", bgColor: "#FCE7F3", textColor: "#831843" },
      { id: "m3", name: "渡辺", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#7F1D1D" },
    ],
  },
  // ── カスタム ──
  {
    name: "カスタム（空白）",
    emoji: "✨",
    groups: [
      { id: "g1", tasks: ["タスク1"], emoji: "📌" },
    ],
    members: [
      { id: "m1", name: "メンバー1", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
    ],
  },
];

export const MEMBER_PRESETS = [
  { color: "#EF4444", bgColor: "#FEE2E2", textColor: "#7F1D1D" },  // 赤
  { color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },  // オレンジ
  { color: "#EAB308", bgColor: "#FEF9C3", textColor: "#713F12" },  // 黄
  { color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },  // 緑
  { color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },  // 青
  { color: "#8B5CF6", bgColor: "#EDE9FE", textColor: "#4C1D95" },  // 紫
  { color: "#EC4899", bgColor: "#FCE7F3", textColor: "#831843" },  // ピンク
];

/** カスタムカラーから bgColor/textColor を自動生成 */
export function colorPresetFromHex(hex: string): { color: string; bgColor: string; textColor: string } {
  // hex → RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // bgColor: 元色を白と90%ブレンド
  const bg = (c: number) => Math.round(c + (255 - c) * 0.85).toString(16).padStart(2, "0");
  const bgColor = `#${bg(r)}${bg(g)}${bg(b)}`;
  // textColor: 元色を暗くする
  const dk = (c: number) => Math.round(c * 0.3).toString(16).padStart(2, "0");
  const textColor = `#${dk(r)}${dk(g)}${dk(b)}`;
  return { color: hex, bgColor, textColor };
}
