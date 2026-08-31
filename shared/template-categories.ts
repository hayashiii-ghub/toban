/** Category choices shared by the app and template pages, without the SEO corpus. */
interface TemplateCategory {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: "office",
    label: "事務室・オフィス",
    emoji: "🏢",
    description:
      "オフィスの掃除当番や電話・来客対応など、事務室の日常業務をローテーション管理。",
  },
  {
    id: "kindergarten",
    label: "幼稚園・保育園",
    emoji: "🌷",
    description:
      "園内おそうじ・バス添乗・預かり保育など、幼稚園・保育園の先生向け当番表テンプレート。",
  },
  {
    id: "school",
    label: "小中学校（クラス用）",
    emoji: "🏫",
    description:
      "教室そうじ・給食当番・日直など、クラスで使える当番表テンプレート。班やペアで回せます。",
  },
  {
    id: "faculty",
    label: "職員室（先生用）",
    emoji: "🔑",
    description: "校内巡回・施錠など、先生どうしで分担する校務の当番表。",
  },
  {
    id: "pta",
    label: "PTA・保護者会",
    emoji: "🚩",
    description:
      "旗振り・PTA行事・プール監視など、保護者のローテーション管理に便利なテンプレート。",
  },
  {
    id: "care",
    label: "介護施設",
    emoji: "🏥",
    description:
      "フロア担当・入浴介助・夜勤など、介護施設のシフト・当番管理テンプレート。",
  },
  {
    id: "community",
    label: "自治会・マンション",
    emoji: "🏘️",
    description:
      "町内会の清掃・パトロールやマンション共用部の管理当番テンプレート。",
  },
  {
    id: "restaurant",
    label: "飲食店・店舗",
    emoji: "🍴",
    description:
      "開店・閉店作業やトイレ清掃など、飲食店・店舗のタスクローテーション。",
  },
  {
    id: "home",
    label: "家庭・暮らし",
    emoji: "🏠",
    description: "お風呂掃除・ゴミ出しなどの家事を家族で公平にローテーション。",
  },
  {
    id: "other",
    label: "その他の団体",
    emoji: "🤝",
    description:
      "シェアハウス・部活動・宗教施設など、さまざまな団体向けテンプレート。",
  },
  {
    id: "checklist",
    label: "チェックリスト・TODO",
    emoji: "✅",
    description:
      "イベント準備や新学期の準備など、やることリストとしても使えるテンプレート。",
  },
];

/** カテゴリの英語訳（id キー） */
export const TEMPLATE_CATEGORIES_EN: Record<
  string,
  { label: string; description: string }
> = {
  office: {
    label: "Office",
    description:
      "Rotate everyday office tasks such as cleaning duty and phone/reception coverage.",
  },
  kindergarten: {
    label: "Kindergarten & Preschool",
    description:
      "Templates for preschool teachers—facility cleaning, bus escort, extended care, and more.",
  },
  school: {
    label: "Classroom",
    description:
      "Classroom duty templates—cleaning, school lunch, daily duty. Works by group or pair.",
  },
  faculty: {
    label: "School Staff",
    description:
      "Rosters for school tasks teachers share, like patrols and locking up.",
  },
  pta: {
    label: "PTA & Parents",
    description:
      "Handy templates for parent rotations—crossing guard, PTA events, pool watch.",
  },
  care: {
    label: "Care Homes",
    description:
      "Shift and duty management for care facilities—floor assignments, bathing assistance, night shifts.",
  },
  community: {
    label: "Community",
    description:
      "Templates for neighborhood cleaning/patrol and apartment common-area management.",
  },
  restaurant: {
    label: "Restaurants & Shops",
    description:
      "Task rotations for restaurants and shops—opening/closing work, restroom cleaning.",
  },
  home: {
    label: "Home",
    description:
      "Rotate household chores like bath cleaning and taking out the trash fairly among family.",
  },
  other: {
    label: "Other Groups",
    description:
      "Templates for various groups—share houses, clubs, places of worship.",
  },
  checklist: {
    label: "Checklists",
    description:
      "Templates usable as to-do lists, like event prep and new-term preparation.",
  },
};
