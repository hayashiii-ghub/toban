import { describe, expect, it } from "vitest";
import {
  getHolidaysForYear,
  getHolidaysForMonth,
  isSkippedDate,
  countSkipDays,
} from "./holidays";

function holidayMap(year: number): Map<string, string> {
  return new Map(getHolidaysForYear(year).map(h => [h.date, h.name]));
}

describe("getHolidaysForYear", () => {
  describe("固定祝日", () => {
    it("2026年の固定祝日が正しい", () => {
      const h = holidayMap(2026);
      expect(h.get("2026-01-01")).toBe("元日");
      expect(h.get("2026-02-11")).toBe("建国記念の日");
      expect(h.get("2026-02-23")).toBe("天皇誕生日");
      expect(h.get("2026-04-29")).toBe("昭和の日");
      expect(h.get("2026-05-03")).toBe("憲法記念日");
      expect(h.get("2026-05-04")).toBe("みどりの日");
      expect(h.get("2026-05-05")).toBe("こどもの日");
      expect(h.get("2026-11-03")).toBe("文化の日");
      expect(h.get("2026-11-23")).toBe("勤労感謝の日");
    });
  });

  describe("制度変更の境界", () => {
    it("天皇誕生日と4月29日の名称を在位期間に合わせる", () => {
      expect(holidayMap(1988).get("1988-04-29")).toBe("天皇誕生日");
      expect(holidayMap(1989).get("1989-04-29")).toBe("みどりの日");
      expect(holidayMap(1989).get("1989-12-23")).toBe("天皇誕生日");
      expect(holidayMap(2018).get("2018-12-23")).toBe("天皇誕生日");
      expect(holidayMap(2019).has("2019-02-23")).toBe(false);
      expect(holidayMap(2019).has("2019-12-23")).toBe(false);
      expect(holidayMap(2020).get("2020-02-23")).toBe("天皇誕生日");
    });

    it("成人・海・敬老・体育の日の移動年を反映する", () => {
      expect(holidayMap(1999).get("1999-01-15")).toBe("成人の日");
      expect(holidayMap(2000).get("2000-01-10")).toBe("成人の日");
      expect(holidayMap(2002).get("2002-07-20")).toBe("海の日");
      expect(holidayMap(2003).get("2003-07-21")).toBe("海の日");
      expect(holidayMap(2002).get("2002-09-15")).toBe("敬老の日");
      expect(holidayMap(2004).get("2004-09-20")).toBe("敬老の日");
      expect(holidayMap(1999).get("1999-10-10")).toBe("体育の日");
      expect(holidayMap(2000).get("2000-10-09")).toBe("体育の日");
      expect(holidayMap(2019).get("2019-10-14")).toBe("体育の日");
      expect(holidayMap(2022).get("2022-10-10")).toBe("スポーツの日");
    });

    it("みどりの日・昭和の日と追加祝日の施行年を反映する", () => {
      expect(holidayMap(2006).get("2006-04-29")).toBe("みどりの日");
      expect(holidayMap(2006).get("2006-05-04")).toBe("国民の休日");
      expect(holidayMap(2007).get("2007-04-29")).toBe("昭和の日");
      expect(holidayMap(2007).get("2007-05-04")).toBe("みどりの日");
      expect(holidayMap(1995).has("1995-07-20")).toBe(false);
      expect(holidayMap(1996).get("1996-07-20")).toBe("海の日");
      expect(holidayMap(2015).has("2015-08-11")).toBe(false);
      expect(holidayMap(2016).get("2016-08-11")).toBe("山の日");
    });

    it("国民の休日と振替休日を当時の規則で計算する", () => {
      expect(holidayMap(1982).has("1982-05-04")).toBe(false);
      expect(holidayMap(1986).has("1986-05-04")).toBe(false);
      expect(holidayMap(1987).get("1987-05-04")).toBe("国民の休日");
      expect(holidayMap(1991).get("1991-05-04")).toBe("国民の休日");
      expect(holidayMap(1998).has("1998-05-06")).toBe(false);
      expect(holidayMap(2008).get("2008-05-06")).toBe("振替休日");
    });

    it("範囲内の皇室行事による特例休日を含める", () => {
      expect(holidayMap(1989).get("1989-02-24")).toBe("大喪の礼");
      expect(holidayMap(1990).get("1990-11-12")).toBe("即位礼正殿の儀");
      expect(holidayMap(1993).get("1993-06-09")).toBe("結婚の儀");
      expect(holidayMap(2019).get("2019-05-01")).toBe("天皇の即位の日");
      expect(holidayMap(2019).get("2019-04-30")).toBe("国民の休日");
      expect(holidayMap(2019).get("2019-05-02")).toBe("国民の休日");
      expect(holidayMap(2019).get("2019-10-22")).toBe("即位礼正殿の儀");
    });
  });

  describe("ハッピーマンデー", () => {
    it("2026年の成人の日は1月第2月曜（1/12）", () => {
      expect(holidayMap(2026).get("2026-01-12")).toBe("成人の日");
    });

    it("2026年の海の日は7月第3月曜（7/20）", () => {
      expect(holidayMap(2026).get("2026-07-20")).toBe("海の日");
    });

    it("2026年の敬老の日は9月第3月曜（9/21）", () => {
      expect(holidayMap(2026).get("2026-09-21")).toBe("敬老の日");
    });

    it("2026年のスポーツの日は10月第2月曜（10/12）", () => {
      expect(holidayMap(2026).get("2026-10-12")).toBe("スポーツの日");
    });
  });

  describe("春分の日・秋分の日", () => {
    it("2026年の春分の日は3/20", () => {
      expect(holidayMap(2026).get("2026-03-20")).toBe("春分の日");
    });

    it("2026年の秋分の日は9/23", () => {
      expect(holidayMap(2026).get("2026-09-23")).toBe("秋分の日");
    });

    it("対応範囲の両端でも春分・秋分を計算する", () => {
      expect(holidayMap(1980).get("1980-03-20")).toBe("春分の日");
      expect(holidayMap(1980).get("1980-09-23")).toBe("秋分の日");
      expect(holidayMap(2099).get("2099-03-20")).toBe("春分の日");
      expect(holidayMap(2099).get("2099-09-23")).toBe("秋分の日");
    });
  });

  describe("振替休日", () => {
    // 2025-02-23(日) → 2025-02-24(月) が振替休日
    it("日曜の祝日の翌月曜が振替休日になる", () => {
      const h = holidayMap(2025);
      expect(h.get("2025-02-23")).toBe("天皇誕生日");
      expect(h.get("2025-02-24")).toBe("振替休日");
    });

    // 2025-11-03(月) は文化の日 → 振替なし
    it("月曜の祝日には振替休日が発生しない", () => {
      const h = holidayMap(2025);
      expect(h.get("2025-11-03")).toBe("文化の日");
      expect(h.has("2025-11-04")).toBe(false);
    });

    // 2025-05-04(日)みどりの日, 05-05(月)こどもの日 → 05-06 振替休日
    it("連続する日曜祝日の振替は翌営業日になる", () => {
      const h = holidayMap(2025);
      expect(h.get("2025-05-06")).toBe("振替休日");
    });
  });

  describe("国民の休日", () => {
    // 2026-09-21(月)敬老の日, 2026-09-23(水)秋分の日 → 9/22 は国民の休日
    it("2つの祝日に挟まれた平日が国民の休日になる", () => {
      expect(holidayMap(2026).get("2026-09-22")).toBe("国民の休日");
    });
  });

  describe("キャッシュ", () => {
    it("同じ年を複数回呼んでも同じ結果を返す", () => {
      const first = getHolidaysForYear(2026);
      const second = getHolidaysForYear(2026);
      expect(first).toBe(second); // 参照同一
    });
  });
});

describe("getHolidaysForMonth", () => {
  it("指定月の祝日のみを返す", () => {
    // 2026年5月: 3日 憲法記念日, 4日 みどりの日, 5日 こどもの日, 6日 振替休日
    const may = getHolidaysForMonth(2026, 4); // 0-indexed month
    expect(may.get(3)).toBe("憲法記念日");
    expect(may.get(4)).toBe("みどりの日");
    expect(may.get(5)).toBe("こどもの日");
    expect(may.has(1)).toBe(false);
  });
});

describe("isSkippedDate", () => {
  it("土曜スキップが有効なら土曜をスキップする", () => {
    // 2026-03-28 は土曜日
    expect(isSkippedDate(new Date(2026, 2, 28), { skipSaturday: true })).toBe(
      true
    );
    expect(isSkippedDate(new Date(2026, 2, 28), { skipSaturday: false })).toBe(
      false
    );
  });

  it("日曜スキップが有効なら日曜をスキップする", () => {
    // 2026-03-29 は日曜日
    expect(isSkippedDate(new Date(2026, 2, 29), { skipSunday: true })).toBe(
      true
    );
  });

  it("祝日スキップが有効なら祝日をスキップする", () => {
    // 2026-01-01 は元日
    expect(isSkippedDate(new Date(2026, 0, 1), { skipHolidays: true })).toBe(
      true
    );
    expect(isSkippedDate(new Date(2026, 0, 2), { skipHolidays: true })).toBe(
      false
    );
  });

  it("平日で祝日でない日はスキップしない", () => {
    // 2026-03-27 は金曜日、祝日でない
    expect(
      isSkippedDate(new Date(2026, 2, 27), {
        skipSaturday: true,
        skipSunday: true,
        skipHolidays: true,
      })
    ).toBe(false);
  });
});

describe("countSkipDays", () => {
  it("オプションがすべて無効なら0を返す", () => {
    const start = new Date(2026, 2, 23); // 月曜
    const end = new Date(2026, 2, 30); // 翌月曜
    expect(countSkipDays(start, end, {})).toBe(0);
  });

  it("1週間の土日をカウントする", () => {
    const start = new Date(2026, 2, 23); // 月曜
    const end = new Date(2026, 2, 30); // 翌月曜
    expect(
      countSkipDays(start, end, { skipSaturday: true, skipSunday: true })
    ).toBe(2);
  });

  it("土曜のみスキップの場合は1を返す", () => {
    const start = new Date(2026, 2, 23); // 月曜
    const end = new Date(2026, 2, 30); // 翌月曜
    expect(countSkipDays(start, end, { skipSaturday: true })).toBe(1);
  });

  it("祝日と土日が重複する場合は二重カウントしない", () => {
    // 2026-01-01 は木曜 (元日)、1/1-1/8 の1週間
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 0, 8);
    const skipAll = {
      skipSaturday: true,
      skipSunday: true,
      skipHolidays: true,
    };
    // 1/1(木・祝), 1/3(土), 1/4(日) → 3日スキップ
    expect(countSkipDays(start, end, skipAll)).toBe(3);
  });

  it("start === end なら0を返す", () => {
    const d = new Date(2026, 2, 28); // 土曜
    expect(countSkipDays(d, d, { skipSaturday: true })).toBe(0);
  });
});

describe("localized holiday labels", () => {
  it("translates labels without changing dates or contaminating the Japanese cache", () => {
    const jaBefore = getHolidaysForMonth(2026, 8);
    const en = getHolidaysForMonth(2026, 8, "en");
    expect(en.get(21)).toBe("Respect for the Aged Day");
    expect(en.get(22)).toBe("National Holiday");
    expect(en.get(23)).toBe("Autumnal Equinox Day");
    expect([...en.keys()]).toEqual([...jaBefore.keys()]);
    expect(getHolidaysForMonth(2026, 8)).toEqual(jaBefore);
    expect(getHolidaysForMonth(2026, 8).get(21)).toBe("敬老の日");
  });

  it("translates substitute holidays too", () => {
    expect(getHolidaysForMonth(2026, 4, "en").get(6)).toBe(
      "Substitute Holiday"
    );
  });

  it("translates historical and one-off holiday names", () => {
    expect(getHolidaysForMonth(2000, 9, "en").get(9)).toBe(
      "Health and Sports Day"
    );
    expect(getHolidaysForMonth(2019, 4, "en").get(1)).toBe(
      "Emperor's Accession Day"
    );
  });
});
