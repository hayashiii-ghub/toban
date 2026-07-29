/**
 * 日本の祝日計算モジュール
 * 国民の祝日に関する法律に基づく（2020/2021 特例対応）
 */

import {
  diffLocalCalendarDays,
  parseIsoDateLocal,
  startOfLocalDay,
} from "./dateUtils";

export interface JapaneseHoliday {
  date: string; // "YYYY-MM-DD"
  name: string;
}

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

/** 指定年のすべての祝日を計算 */
export function getHolidaysForYear(year: number): JapaneseHoliday[] {
  const cached = cache.get(year);
  if (cached) return cached;

  const holidays = new Map<string, string>();
  const add = (m: number, d: number, name: string) => {
    holidays.set(toKey(year, m, d), name);
  };

  // 固定祝日
  add(1, 1, "元日");
  add(2, 11, "建国記念の日");
  add(2, 23, "天皇誕生日");
  add(4, 29, "昭和の日");
  add(5, 3, "憲法記念日");
  add(5, 4, "みどりの日");
  add(5, 5, "こどもの日");
  add(11, 3, "文化の日");
  add(11, 23, "勤労感謝の日");

  // ハッピーマンデー
  add(1, nthMonday(year, 1, 2), "成人の日");
  add(9, nthMonday(year, 9, 3), "敬老の日");

  const specialHolidays = OLYMPIC_HOLIDAY_OVERRIDES[year];
  if (specialHolidays) {
    for (const [month, day, name] of specialHolidays) {
      add(month, day, name);
    }
  } else {
    add(7, nthMonday(year, 7, 3), "海の日");
    add(8, 11, "山の日");
    add(10, nthMonday(year, 10, 2), "スポーツの日");
  }

  // 春分の日・秋分の日
  add(3, vernalEquinoxDay(year), "春分の日");
  add(9, autumnalEquinoxDay(year), "秋分の日");

  // 振替休日: 祝日が日曜なら翌営業日が振替休日
  const baseHolidays = Array.from(holidays.entries()).sort();
  for (const [key] of baseHolidays) {
    const d = parseIsoDateLocal(key);
    if (!d) continue;
    if (d.getDay() === 0) {
      // 翌日から、まだ祝日でない平日を探す
      const next = new Date(d);
      do {
        next.setDate(next.getDate() + 1);
      } while (
        holidays.has(
          toKey(next.getFullYear(), next.getMonth() + 1, next.getDate())
        )
      );
      holidays.set(
        toKey(next.getFullYear(), next.getMonth() + 1, next.getDate()),
        "振替休日"
      );
    }
  }

  // 国民の休日: 祝日に挟まれた平日
  const allKeys = Array.from(holidays.keys()).sort();
  for (let i = 0; i < allKeys.length - 1; i++) {
    const d1 = parseIsoDateLocal(allKeys[i]);
    const d2 = parseIsoDateLocal(allKeys[i + 1]);
    if (!d1 || !d2) continue;
    const diffDays = diffLocalCalendarDays(d1, d2);
    if (diffDays === 2) {
      const between = new Date(d1);
      between.setDate(between.getDate() + 1);
      const betweenKey = toKey(
        between.getFullYear(),
        between.getMonth() + 1,
        between.getDate()
      );
      if (
        !holidays.has(betweenKey) &&
        between.getDay() !== 0 &&
        between.getDay() !== 6
      ) {
        holidays.set(betweenKey, "国民の休日");
      }
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
  month: number
): Map<number, string> {
  const holidays = getHolidaysForYear(year);
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const map = new Map<number, string>();
  for (const h of holidays) {
    if (h.date.startsWith(prefix)) {
      map.set(parseInt(h.date.slice(8), 10), h.name);
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
