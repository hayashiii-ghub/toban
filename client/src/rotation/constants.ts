import type { ScheduleTemplate } from "./types";

export const ANIMATION_DURATION_MS = 500;
export const CARD_STAGGER_DELAY = 0.08;
export const TASK_STAGGER_DELAY = 0.06;

export const STORAGE_KEY = "rotation-schedule-app-state";

export const TEMPLATES: ScheduleTemplate[] = [
  {
    name: "掃除当番",
    emoji: "🧹",
    groups: [
      { id: "g1", tasks: ["クイックルワイパー", "事務所掃除機"], emoji: "🧹" },
      { id: "g2", tasks: ["トイレ", "加湿器", "水回り"], emoji: "🚿" },
      { id: "g3", tasks: ["床（掃除機）", "ゴミ捨て"], emoji: "🗑️" },
    ],
    members: [
      { id: "m1", name: "田中", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "松丸", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "山下", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
    ],
  },
  {
    name: "給食当番",
    emoji: "🍽️",
    groups: [
      { id: "g1", tasks: ["配膳"], emoji: "🍚" },
      { id: "g2", tasks: ["片付け", "台拭き"], emoji: "🧽" },
      { id: "g3", tasks: ["牛乳配り", "ストロー配り"], emoji: "🥛" },
    ],
    members: [
      { id: "m1", name: "1班", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      { id: "m2", name: "2班", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
      { id: "m3", name: "3班", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
    ],
  },
  {
    name: "日直",
    emoji: "📋",
    groups: [
      { id: "g1", tasks: ["朝の会", "帰りの会"], emoji: "🎤" },
      { id: "g2", tasks: ["黒板消し", "日誌記入"], emoji: "📝" },
    ],
    members: [
      { id: "m1", name: "Aさん", color: "#8B5CF6", bgColor: "#EDE9FE", textColor: "#4C1D95" },
      { id: "m2", name: "Bさん", color: "#EC4899", bgColor: "#FCE7F3", textColor: "#831843" },
    ],
  },
  {
    name: "受付当番",
    emoji: "🏢",
    groups: [
      { id: "g1", tasks: ["午前受付", "電話対応"], emoji: "📞" },
      { id: "g2", tasks: ["午後受付", "来客対応"], emoji: "🤝" },
      { id: "g3", tasks: ["郵便物", "備品管理"], emoji: "📦" },
    ],
    members: [
      { id: "m1", name: "佐藤", color: "#14B8A6", bgColor: "#CCFBF1", textColor: "#134E4A" },
      { id: "m2", name: "鈴木", color: "#EAB308", bgColor: "#FEF9C3", textColor: "#713F12" },
      { id: "m3", name: "高橋", color: "#6366F1", bgColor: "#E0E7FF", textColor: "#312E81" },
    ],
  },
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
  { color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
  { color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
  { color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
  { color: "#8B5CF6", bgColor: "#EDE9FE", textColor: "#4C1D95" },
  { color: "#EC4899", bgColor: "#FCE7F3", textColor: "#831843" },
  { color: "#14B8A6", bgColor: "#CCFBF1", textColor: "#134E4A" },
  { color: "#EAB308", bgColor: "#FEF9C3", textColor: "#713F12" },
  { color: "#6366F1", bgColor: "#E0E7FF", textColor: "#312E81" },
];
