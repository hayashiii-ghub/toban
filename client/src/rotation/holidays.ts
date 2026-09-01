/**
 * 日本の祝日計算モジュール
 * 国民の祝日に関する法律に基づく（2020/2021 特例対応）
 */

import {
  diffLocalCalendarDays,
  parseIsoDateLocal,
  startOfLocalDay,
} from "./dateUtils";

interface JapaneseHoliday {
  date: string; // "YYYY-MM-DD"
  name: string;
}

// Display labels only: the holiday calendar and date calculations stay Japanese.
const HOLIDAY_NAMES_EN: Record<string, string> = {
  元日: "New Year's Day",
  成人の日: "Coming of Age Day",
  建国記念の日: "National Foundation Day",
  天皇誕生日: "Emperor's Birthday",
  春分の日: "Vernal Equinox Day",
  昭和の日: "Showa Day",
  憲法記念日: "Constitution Memorial Day",
  みどりの日: "Greenery Day",
  こどもの日: "Children's Day",
  海の日: "Marine Day",
  山の日: "Mountain Day",
  敬老の日: "Respect for the Aged Day",
  秋分の日: "Autumnal Equinox Day",
  スポーツの日: "Sports Day",
  文化の日: "Culture Day",
  勤労感謝の日: "Labor Thanksgiving Day",
  振替休日: "Substitute Holiday",
  国民の休日: "National Holiday",
  体育の日: "Health and Sports Day",
  大喪の礼: "State Funeral of Emperor Showa",
  即位礼正殿の儀: "Enthronement Ceremony",
  結婚の儀: "Imperial Wedding Ceremony",
  天皇の即位の日: "Emperor's Accession Day",
};

// 年単位キャッシュ
const cache = new Map<number, JapaneseHoliday[]>();

/** n月の第m月曜日 */
function nthMonday(year: number, month: number, n: number): number {
  const first = new Date(year, month - 1, 1).getDay();
  // 第1月曜の日付
  const firstMonday = first <= 1 ? 2 - first : 9 - first;
  return firstMonday + (n - 1) * 7;
}

/** 春分の日（近似式、1980-2099対応） */
function vernalEquinoxDay(year: number): number {
  return Math.floor(
    20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4)
  );
}

/** 秋分の日（近似式、1980-2099対応） */
function autumnalEquinoxDay(year: number): number {
  return Math.floor(
    23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4)
  );
}

function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const OLYMPIC_HOLIDAY_OVERRIDES: Record<
  number,
  Array<[number, number, string]>
> = {
  2020: [
    [7, 23, "海の日"],
    [7, 24, "スポーツの日"],
    [8, 10, "山の日"],
  ],
  2021: [
    [7, 22, "海の日"],
    [7, 23, "スポーツの日"],
    [8, 8, "山の日"],
  ],
};

const IMPERIAL_EVENT_HOLIDAYS: Record<
  number,
  Array<[number, number, string]>
> = {
  1989: [[2, 24, "大喪の礼"]],
  1990: [[11, 12, "即位礼正殿の儀"]],
  1993: [[6, 9, "結婚の儀"]],
  2019: [
    [5, 1, "天皇の即位の日"],
    [10, 22, "即位礼正殿の儀"],
  ],
};

/** 指定年のすべての祝日を計算 */
export function getHolidaysForYear(year: number): JapaneseHoliday[] {
  const cached = cache.get(year);
  if (cached) return cached;

  const holidays = new Map<string, string>();
  const add = (m: number, d: number, name: string) => {
    holidays.set(toKey(year, m, d), name);
  };

  // 固定祝日と制度変更
  add(1, 1, "元日");
  if (year <= 1999) add(1, 15, "成人の日");
  else add(1, nthMonday(year, 1, 2), "成人の日");
  add(2, 11, "建国記念の日");
  if (year >= 2020) add(2, 23, "天皇誕生日");
  if (year <= 1988) add(4, 29, "天皇誕生日");
  else if (year <= 2006) add(4, 29, "みどりの日");
  else add(4, 29, "昭和の日");
  add(5, 3, "憲法記念日");
  if (year >= 2007) add(5, 4, "みどりの日");
  add(5, 5, "こどもの日");
  if (year <= 2002) add(9, 15, "敬老の日");
  else add(9, nthMonday(year, 9, 3), "敬老の日");
  add(11, 3, "文化の日");
  add(11, 23, "勤労感謝の日");
  if (year >= 1989 && year <= 2018) add(12, 23, "天皇誕生日");

  const specialHolidays = OLYMPIC_HOLIDAY_OVERRIDES[year];
  if (specialHolidays) {
    for (const [month, day, name] of specialHolidays) {
      add(month, day, name);
    }
  } else {
    if (year >= 1996)
      add(7, year <= 2002 ? 20 : nthMonday(year, 7, 3), "海の日");
    if (year >= 2016) add(8, 11, "山の日");
    add(
      10,
      year <= 1999 ? 10 : nthMonday(year, 10, 2),
      year <= 2019 ? "体育の日" : "スポーツの日"
    );
  }

  // 春分の日・秋分の日
  add(3, vernalEquinoxDay(year), "春分の日");
  add(9, autumnalEquinoxDay(year), "秋分の日");

  for (const [month, day, name] of IMPERIAL_EVENT_HOLIDAYS[year] ?? []) {
    add(month, day, name);
  }

  // 国民の休日: 1986年以降、祝日に挟まれた平日
  if (year >= 1986) {
    const baseKeys = Array.from(holidays.keys()).sort();
    for (let i = 0; i < baseKeys.length - 1; i++) {
      const d1 = parseIsoDateLocal(baseKeys[i]);
      const d2 = parseIsoDateLocal(baseKeys[i + 1]);
      if (!d1 || !d2 || diffLocalCalendarDays(d1, d2) !== 2) continue;
      const between = new Date(d1);
      between.setDate(between.getDate() + 1);
      const betweenKey = toKey(
        between.getFullYear(),
        between.getMonth() + 1,
        between.getDate()
      );
      if (!holidays.has(betweenKey) && between.getDay() !== 0) {
        holidays.set(betweenKey, "国民の休日");
      }
    }
  }

  // 振替休日: 2007年からは翌日が祝日なら次の非祝日まで繰り越す
  const baseHolidays = Array.from(holidays.entries()).sort();
  for (const [key] of baseHolidays) {
    const d = parseIsoDateLocal(key);
    if (!d) continue;
    if (d.getDay() === 0) {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      let nextKey = toKey(
        next.getFullYear(),
        next.getMonth() + 1,
        next.getDate()
      );
      if (year >= 2007) {
        while (holidays.has(nextKey)) {
          next.setDate(next.getDate() + 1);
          nextKey = toKey(
            next.getFullYear(),
            next.getMonth() + 1,
            next.getDate()
          );
        }
      }
      if (!holidays.has(nextKey)) holidays.set(nextKey, "振替休日");
    }
  }

  const result = Array.from(holidays.entries())
    .map(([date, name]) => ({ date, name }))
    .sort((a, b) => a.date.localeCompare(b.date));

  cache.set(year, result);
  return result;
}

/** 指定月の祝日マップ（日 → 祝日名） */
export function getHolidaysForMonth(
  year: number,
  month: number,
  locale: "ja" | "en" = "ja"
): Map<number, string> {
  const holidays = getHolidaysForYear(year);
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const map = new Map<number, string>();
  for (const h of holidays) {
    if (h.date.startsWith(prefix)) {
      map.set(
        parseInt(h.date.slice(8), 10),
        locale === "en" ? (HOLIDAY_NAMES_EN[h.name] ?? h.name) : h.name
      );
    }
  }
  return map;
}

/** 2つの日付間でスキップすべき日数をカウント（start含む、end含まない） */
export function countSkipDays(
  startDate: Date,
  endDate: Date,
  options: {
    skipSaturday?: boolean;
    skipSunday?: boolean;
    skipHolidays?: boolean;
  }
): number {
  const { skipSaturday, skipSunday, skipHolidays } = options;
  if (!skipSaturday && !skipSunday && !skipHolidays) return 0;

  const start = startOfLocalDay(startDate);
  const end = startOfLocalDay(endDate);

  const totalDays = diffLocalCalendarDays(start, end);
  if (totalDays <= 0) return 0;

  let skipCount = 0;

  // 土日のカウント（高速計算）
  if (skipSaturday || skipSunday) {
    const startDow = start.getDay();
    const fullWeeks = Math.floor(totalDays / 7);
    const remainder = totalDays % 7;

    if (skipSaturday) {
      skipCount += fullWeeks;
      for (let i = 0; i < remainder; i++) {
        if ((startDow + i) % 7 === 6) skipCount++;
      }
    }
    if (skipSunday) {
      skipCount += fullWeeks;
      for (let i = 0; i < remainder; i++) {
        if ((startDow + i) % 7 === 0) skipCount++;
      }
    }
  }

  // 祝日のカウント（土日と重複する場合は二重カウントしない）
  if (skipHolidays) {
    const startKey = toKey(
      start.getFullYear(),
      start.getMonth() + 1,
      start.getDate()
    );
    const endKey = toKey(end.getFullYear(), end.getMonth() + 1, end.getDate());

    // 期間にまたがる年をすべて取得
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      const holidays = getHolidaysForYear(y);
      for (const h of holidays) {
        if (h.date >= startKey && h.date < endKey) {
          const hDate = parseIsoDateLocal(h.date);
          if (!hDate) continue;
          const dow = hDate.getDay();
          // 土日スキップ済みならカウントしない
          const alreadySkipped =
            (skipSaturday && dow === 6) || (skipSunday && dow === 0);
          if (!alreadySkipped) {
            skipCount++;
          }
        }
      }
    }
  }

  return skipCount;
}

export function isSkippedDate(
  date: Date,
  options: {
    skipSaturday?: boolean;
    skipSunday?: boolean;
    skipHolidays?: boolean;
  }
): boolean {
  const normalized = startOfLocalDay(date);
  const dow = normalized.getDay();

  if (options.skipSaturday && dow === 6) return true;
  if (options.skipSunday && dow === 0) return true;
  if (!options.skipHolidays) return false;

  return getHolidaysForMonth(
    normalized.getFullYear(),
    normalized.getMonth()
  ).has(normalized.getDate());
}
