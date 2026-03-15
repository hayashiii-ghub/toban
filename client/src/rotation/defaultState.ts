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
      name: "カスタム（空白）",
      rotation: 0,
      groups: [
        { id: "g1", tasks: ["タスク1"], emoji: "📌" },
      ],
      members: [
        { id: "m1", name: "メンバー1", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" },
      ],
    },
  ],
  activeScheduleId: "s_default_1",
};
