import { TEMPLATES } from "./templates";
import type { ScheduleTemplate } from "./types";

interface TemplateText {
  name: string;
  tasks: string[][];
  members: string[];
}

/** Text only: IDs, assignment pools, colors and themes stay in the Japanese source. */
const TEMPLATE_TEXT_EN: Record<string, TemplateText> = {
  事務室の掃除当番: {
    name: "Office cleaning",
    tasks: [
      ["Vacuuming & mopping"],
      ["Restrooms & sinks"],
      ["Collecting & taking out trash"],
      ["Kitchenette & sink"],
    ],
    members: ["Alex", "Sam", "Riley", "Jordan"],
  },
  "電話・来客当番": {
    name: "Phone & reception",
    tasks: [
      ["Morning phone & reception"],
      ["Afternoon phone & reception"],
      ["Sorting & delivering mail"],
    ],
    members: ["Alex", "Sam", "Riley"],
  },
  園内おそうじ当番: {
    name: "Preschool cleaning",
    tasks: [
      ["Clean & disinfect classrooms"],
      ["Clean restrooms & restock supplies"],
      ["Check & tidy the playground"],
      ["Sweep the entrance", "Mop the hallway"],
    ],
    members: [
      "Cherry class",
      "Sunflower class",
      "Dandelion class",
      "Violet class",
    ],
  },
  "バス添乗・お迎え当番": {
    name: "School bus & pickup",
    tasks: [
      ["Morning bus escort", "Check passenger count"],
      ["Afternoon bus escort", "Check everyone has left the bus"],
      ["Pickup & gate supervision"],
    ],
    members: ["Alex", "Sam", "Riley"],
  },
  預かり保育当番: {
    name: "Before & after school care",
    tasks: [
      ["Early care (from 7:30 AM)"],
      ["After school care (until 6 PM)"],
      ["Prepare snacks & clean up"],
    ],
    members: ["Alex", "Sam", "Riley"],
  },
  午睡チェック当番: {
    name: "Nap checks",
    tasks: [
      ["Breathing checks (infants)", "Check sleeping position"],
      ["Breathing checks (1-year-olds)", "Check sleeping position"],
      ["Breathing checks (2-year-olds)", "Record room temperature & humidity"],
    ],
    members: ["Alex", "Sam", "Riley", "Jordan"],
  },
  アレルギー対応確認: {
    name: "Food allergy checks",
    tasks: [
      [
        "Check special dietary meals",
        "Double-check meal service",
        "Supervise mealtimes",
      ],
      [
        "Check snack ingredients",
        "Check snack service",
        "Supervise snack time",
      ],
    ],
    members: ["Alex", "Sam", "Riley", "Jordan"],
  },
  教室そうじ当番: {
    name: "Classroom cleaning",
    tasks: [
      ["Sweep the classroom"],
      ["Wipe classroom floors"],
      ["Hallways & stairs"],
      ["Clean restrooms"],
      ["Clean the board & erasers"],
    ],
    members: ["Group 1", "Group 2", "Group 3", "Group 4", "Group 5"],
  },
  給食当番: {
    name: "School lunch duty",
    tasks: [
      ["Serve side dishes"],
      ["Serve soup", "Serve rice"],
      ["Hand out milk & straws"],
      ["Clean up", "Wipe tables"],
    ],
    members: ["Group 1", "Group 2", "Group 3", "Group 4"],
  },
  日直: {
    name: "Classroom helpers",
    tasks: [
      ["Lead morning meeting", "Lead afternoon meeting"],
      ["Erase the board", "Fill in the class log"],
      ["Lead class routines", "Lead greetings"],
    ],
    members: ["Pair A", "Pair B", "Pair C"],
  },
  "配布物・プリント係": {
    name: "Handouts & homework",
    tasks: [
      ["Hand out worksheets"],
      ["Collect & check homework"],
      ["Hand out communication notebooks"],
      ["Save handouts for absent students"],
    ],
    members: ["Group 1", "Group 2", "Group 3", "Group 4"],
  },
  "水やり・生き物係": {
    name: "Plants & classroom pets",
    tasks: [
      ["Water flower beds & planters"],
      ["Feed fish & classroom pets"],
      ["Clean tanks & enclosures"],
      ["Keep an observation journal"],
    ],
    members: ["Group 1", "Group 2", "Group 3", "Group 4"],
  },
  "換気・教室環境当番": {
    name: "Classroom ventilation",
    tasks: [
      ["Open windows in the morning"],
      ["Check ventilation during breaks"],
      ["Close & lock windows after school"],
      ["Refill & maintain the humidifier"],
    ],
    members: ["Group 1", "Group 2", "Group 3", "Group 4"],
  },
  "校内巡回・施錠当番": {
    name: "School supervision & lockup",
    tasks: [
      ["Morning gate duty"],
      ["Lunchtime rounds"],
      ["Lock up after school"],
    ],
    members: ["Alex", "Sam", "Riley"],
  },
  "旗振り（登下校見守り）当番": {
    name: "School crossing duty",
    tasks: [
      ["East gate crossing duty", "Help children cross"],
      ["West gate crossing duty", "Help children cross"],
      ["Intersection crossing duty", "Check vehicles have stopped"],
    ],
    members: ["Alex", "Sam", "Riley"],
  },
  PTA行事準備当番: {
    name: "PTA event setup",
    tasks: [
      ["Set up tables & chairs", "Put up signs & decorations"],
      ["Check in attendees", "Guide visitors"],
      [
        "Collect & sort trash",
        "Put away tables & chairs",
        "Check for lost items",
      ],
    ],
    members: ["Alex", "Sam", "Riley"],
  },
  プール監視当番: {
    name: "Pool supervision",
    tasks: [
      ["Morning pool supervision", "Count swimmers"],
      ["Afternoon pool supervision", "Count swimmers"],
      ["Prepare first aid supplies & AED", "Record water & air temperatures"],
    ],
    members: ["Alex", "Sam", "Riley"],
  },
  読み聞かせボランティア: {
    name: "Read-aloud volunteers",
    tasks: [
      ["Grade 1 classroom"],
      ["Grade 2 classroom"],
      ["Grade 3 classroom"],
      ["Grade 4 classroom"],
      ["Grade 5 classroom"],
      ["Grade 6 classroom"],
    ],
    members: ["Alex", "Sam", "Riley", "Jordan", "Casey", "Morgan"],
  },
  フロア担当: {
    name: "Care home floor duty",
    tasks: [
      ["Day shift lead", "Day shift support"],
      ["Day shift lead", "Day shift support"],
      ["Day shift lead", "Day shift support"],
    ],
    members: ["Alex", "Sam", "Riley", "Jordan", "Casey", "Morgan"],
  },
  入浴介助当番: {
    name: "Bathing assistance",
    tasks: [
      [
        "Morning bathing assistance",
        "Help with dressing",
        "Escort & supervise residents",
      ],
      [
        "Afternoon bathing assistance",
        "Help with dressing",
        "Escort & supervise residents",
      ],
    ],
    members: ["Alex", "Sam", "Riley", "Jordan", "Casey"],
  },
  夜勤当番: {
    name: "Night shift duty",
    tasks: [
      [
        "Rounds every 2 hours",
        "Respond to call bells",
        "Prepare notes & handover",
      ],
      ["Help residents get up", "Help prepare breakfast"],
    ],
    members: ["Alex", "Sam", "Riley", "Jordan", "Casey"],
  },
  "町内会 清掃・管理当番": {
    name: "Neighborhood upkeep",
    tasks: [
      ["Clean the trash collection area", "Check for illegal dumping"],
      ["Clean the park", "Inspect playground equipment"],
      ["Evening neighborhood patrol", "Check streetlights"],
    ],
    members: [
      "East team",
      "West team",
      "South team",
      "North team",
      "Central team",
    ],
  },
  マンション共用部管理: {
    name: "Apartment common areas",
    tasks: [
      ["Clean the entrance", "Tidy the mailbox area"],
      ["Clean the trash area", "Check waste sorting"],
      ["Check shared hallways", "Tidy bicycle parking"],
      ["Water plants", "Weed the grounds"],
    ],
    members: [
      "Floor 1 (101–105)",
      "Floor 2 (201–205)",
      "Floor 3 (301–305)",
      "Floor 4 (401–405)",
      "Floor 5 (501–505)",
    ],
  },
  "飲食店 開店・閉店作業": {
    name: "Restaurant opening & closing",
    tasks: [
      [
        "Prepare ingredients",
        "Set tables",
        "Put out signs & menus",
        "Open the register",
      ],
      [
        "Clean the dining area",
        "Clean the kitchen",
        "Check doors are locked",
        "Close the register & report sales",
      ],
      [
        "Clean restrooms (morning)",
        "Clean restrooms (afternoon)",
        "Restock supplies",
      ],
    ],
    members: ["Alex (manager)", "Sam", "Riley", "Jordan", "Casey", "Morgan"],
  },
  家事ローテーション: {
    name: "Household chores",
    tasks: [["Clean the bathroom"], ["Take out the trash"]],
    members: ["Alex", "Sam", "Riley"],
  },
  "シェアハウス 共用部管理": {
    name: "Shared house chores",
    tasks: [
      ["Clean the kitchen", "Clean the sink & drain"],
      ["Clean the bathroom", "Clean the washbasin", "Remove hair from drains"],
      ["Take out general waste", "Sort & take out recycling"],
      [
        "Vacuum the living room",
        "Clean the entrance",
        "Clean the shared toilet",
      ],
    ],
    members: ["Alex", "Sam", "Riley", "Jordan", "Casey"],
  },
  "スポーツチーム・部活動": {
    name: "Sports team duties",
    tasks: [
      [
        "Prepare the field before practice",
        "Mark field lines",
        "Tidy the field after practice",
      ],
      ["Set out equipment", "Put away & check equipment"],
      ["Prepare drinks", "Refill ice & water", "Wash water jugs"],
      ["Clean the club room", "Record attendance"],
    ],
    members: [
      "Year 1, team A",
      "Year 1, team B",
      "Year 2, team A",
      "Year 2, team B",
      "Year 3 team",
    ],
  },
  "教会・寺院 奉仕当番": {
    name: "Place of worship volunteers",
    tasks: [
      ["Clean the main hall", "Clean the grounds & sweep leaves"],
      ["Welcome & guide visitors", "Serve tea"],
      ["Tend floral arrangements", "Change vase water"],
      ["Prepare services & events", "Set out chairs & cushions", "Clean up"],
    ],
    members: ["Plum team", "Pine team", "Bamboo team", "Cherry team"],
  },
  イベント準備チェックリスト: {
    name: "Event planning checklist",
    tasks: [
      ["Book & visit the venue"],
      [
        "Prepare supplies & equipment",
        "Check microphones, projectors & extension cords",
      ],
      ["Create announcements & invitations", "Manage the attendee list"],
      ["Welcome & direct attendees", "Keep the event on schedule"],
      ["Pack up & clean the venue", "Check for lost items"],
    ],
    members: [
      "Admin team",
      "Communications team",
      "Finance team",
      "Operations team",
      "Setup team",
    ],
  },
  新学期やることリスト: {
    name: "New term checklist",
    tasks: [
      ["Prepare class lists & seating plans"],
      ["Set up classroom displays & layout"],
      ["Print & sort handouts"],
      ["Contact families & prepare newsletters"],
      ["Prepare duty rosters & classroom roles"],
    ],
    members: [
      "Class teacher",
      "Assistant teacher",
      "Year lead",
      "Academic coordinator",
      "Office staff",
    ],
  },
  引っ越しやることリスト: {
    name: "Moving checklist",
    tasks: [
      ["Update address registration", "Arrange electricity, gas & water"],
      ["Pack & clear out unwanted items"],
      ["Clean & arrange the new home"],
      ["Clean the old home & attend checkout"],
    ],
    members: ["Me", "Partner", "Family", "Movers"],
  },
  "カスタム（空白）": {
    name: "Untitled roster",
    tasks: [["Task 1"]],
    members: ["Member 1"],
  },
};

const TEMPLATES_EN: ScheduleTemplate[] = TEMPLATES.map(template => {
  const text = TEMPLATE_TEXT_EN[template.name];
  if (!text) return template;
  return {
    ...template,
    name: text.name,
    groups: template.groups.map((group, index) => ({
      ...group,
      tasks: text.tasks[index] ?? group.tasks,
    })),
    members: template.members.map((member, index) => ({
      ...member,
      name: text.members[index] ?? member.name,
    })),
  };
});

/** Only use for built-in choices and new rosters, never to translate saved content. */
export function getTemplates(locale: "ja" | "en"): ScheduleTemplate[] {
  return locale === "en" ? TEMPLATES_EN : TEMPLATES;
}

/** Keep legacy Japanese tool names valid alongside the displayed English names. */
export function findTemplate(
  name: string,
  locale: "ja" | "en"
): ScheduleTemplate | undefined {
  const index = TEMPLATES.findIndex(
    (template, index) =>
      template.name === name || TEMPLATES_EN[index].name === name
  );
  return getTemplates(locale)[index];
}
