import { describe, it, expect } from "vitest";
import {
  TEMPLATE_SEO_DATA,
  TEMPLATE_CATEGORIES,
  COMMON_FAQ,
  COMMON_FAQ_EN,
} from "./seo-templates";
import { TEMPLATES } from "./templates";

// 紹介ページを持たない唯一のテンプレート。空白から作り始めるためのもので、
// 書く内容が無いため SEO ページを作らない（中身の無い LP を増やさない）。
const CUSTOM_TEMPLATE_NAME = "カスタム（空白）";

describe("TEMPLATE_SEO_DATA", () => {
  it("カスタム以外のすべてのテンプレートが紹介ページを持つ", () => {
    const covered = new Set(TEMPLATE_SEO_DATA.map(t => t.templateIndex));
    const missing = TEMPLATES.map((t, i) => ({ name: t.name, i }))
      .filter(({ name, i }) => name !== CUSTOM_TEMPLATE_NAME && !covered.has(i))
      .map(({ name, i }) => `${i}: ${name}`);

    expect(missing, `LP が無いテンプレート: ${missing.join(", ")}`).toEqual([]);
  });

  it("カスタムテンプレートには紹介ページを作らない", () => {
    const customIndex = TEMPLATES.findIndex(
      t => t.name === CUSTOM_TEMPLATE_NAME
    );
    expect(customIndex).toBeGreaterThanOrEqual(0);
    expect(TEMPLATE_SEO_DATA.some(t => t.templateIndex === customIndex)).toBe(
      false
    );
  });

  it("slug と templateIndex が重複しない", () => {
    const slugs = TEMPLATE_SEO_DATA.map(t => t.slug);
    const indices = TEMPLATE_SEO_DATA.map(t => t.templateIndex);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(indices).size).toBe(indices.length);
  });

  it("categoryId が定義済みカテゴリを指す", () => {
    const known = new Set(TEMPLATE_CATEGORIES.map(c => c.id));
    const unknown = TEMPLATE_SEO_DATA.filter(t => !known.has(t.categoryId)).map(
      t => `${t.slug} -> ${t.categoryId}`
    );
    expect(unknown).toEqual([]);
  });

  // 検索結果での表示幅。これを超えると差別化語が末尾で切れる。
  // ブランド名を付けない前提の値なので、title へサフィックスを戻すなら見直すこと。
  it("title が SERP の表示幅に収まる", () => {
    const over = TEMPLATE_SEO_DATA.filter(t => t.title.length > 30).map(
      t => `${t.slug}(${t.title.length}字)`
    );
    expect(over, `title が長すぎる: ${over.join(", ")}`).toEqual([]);
  });

  it("title が重複しない", () => {
    const titles = TEMPLATE_SEO_DATA.map(t => t.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  // エスケープを挟まず title を比較できるようにするための制約。
  // 解除するなら seo.test.ts の <title> 比較も合わせて見直すこと。
  it("title に HTML 特殊文字を使わない", () => {
    const bad = TEMPLATE_SEO_DATA.filter(t => /[&<>"]/.test(t.title)).map(
      t => `${t.slug}: ${t.title}`
    );
    expect(bad, `HTML 特殊文字を含む title: ${bad.join(", ")}`).toEqual([]);
  });

  it("title に「テンプレート」が入る", () => {
    const missing = TEMPLATE_SEO_DATA.filter(
      t => !t.title.includes("テンプレート")
    ).map(t => t.slug);
    expect(missing).toEqual([]);
  });

  // 「日直 当番表」のような複合クエリの受け皿。
  // チェックリスト系は当番表ではないため、入れると内容と食い違う。
  it("チェックリスト以外の title に「当番表」が入る", () => {
    const missing = TEMPLATE_SEO_DATA.filter(
      t => t.categoryId !== "checklist" && !t.title.includes("当番表")
    ).map(t => `${t.slug}: ${t.title}`);
    expect(missing, `「当番表」が無い: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("COMMON_FAQ", () => {
  it("日本語と英語が同じ件数・同じ並びで対応する", () => {
    expect(COMMON_FAQ_EN).toHaveLength(COMMON_FAQ.length);
    expect(
      COMMON_FAQ_EN.every(f => f.question.length > 0 && f.answer.length > 0)
    ).toBe(true);
  });
});
