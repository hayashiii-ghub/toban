import type { AppState } from "./types";

/**
 * ローカルストレージが空のときに使うデフォルト状態。
 * 「現在の状態をデフォルトに設定」でコピーしたJSONをここに反映すると、
 * 次回からの初回表示がその状態になります。
 */
export const DEFAULT_APP_STATE: AppState = {
  schedules: [
    {
      id: "s_default_1",
      name: "教室そうじ当番",
      rotation: 0,
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
      id: "s_default_2",
      name: "給食当番",
      rotation: 0,
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
  ],
  activeScheduleId: "s_default_1",
};
