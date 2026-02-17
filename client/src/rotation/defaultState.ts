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
      name: "掃除当番",
      rotation: 0,
      groups: [
        { id: "g1", tasks: ["クイックルワイパー", "事務所掃除機"], emoji: "🧹" },
        { id: "g2", tasks: ["トイレ", "加湿器"], emoji: "🚿" },
        { id: "g3", tasks: ["床（掃除機）", "ゴミ捨て"], emoji: "🗑️" },
      ],
      members: [
        { id: "m1", name: "田中", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
        { id: "m2", name: "松丸", color: "#F97316", bgColor: "#FED7AA", textColor: "#7C2D12" },
        { id: "m3", name: "山下", color: "#10B981", bgColor: "#D1FAE5", textColor: "#064E3B" },
      ],
    },
    {
      id: "s_default_2",
      name: "カスタム（空白）",
      rotation: 0,
      groups: [{ id: "g1", tasks: ["タスク1"], emoji: "📌" }],
      members: [
        { id: "m1", name: "メンバー1", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      ],
    },
  ],
  activeScheduleId: "s_default_1",
};
