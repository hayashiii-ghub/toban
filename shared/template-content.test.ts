import { describe, it, expect } from "vitest";
import { TEMPLATE_CONTENT } from "./template-content";
import { TEMPLATE_SEO_DATA, COMMON_FAQ } from "./seo-templates";

/**
 * 2026-07 に Google がテンプレLP をまとめて
 * 「クロール済み - インデックス未登録」「重複」と判定した。
 * 原因はページ固有の本文がほぼ無かったこと。以下はその再発を防ぐための検査。
 */

/** 1ページあたりの固有本文の下限。これを割ると薄いページとみなされる */
const MIN_UNIQUE_CHARS = 700;

function contentText(slug: string): string {
  const c = TEMPLATE_CONTENT[slug];
  if (!c) return "";
  return (
    c.body.map(s => s.heading + s.paragraphs.join("")).join("") +
    c.faq.map(f => f.question + f.answer).join("")
  );
}

describe("TEMPLATE_CONTENT", () => {
  it("すべてのテンプレLPが本文とFAQを持つ", () => {
    const missing = TEMPLATE_SEO_DATA.filter(seo => {
      const c = TEMPLATE_CONTENT[seo.slug];
      return !c || c.body.length === 0 || c.faq.length === 0;
    }).map(seo => seo.slug);

    expect(missing, `本文かFAQが無いLP: ${missing.join(", ")}`).toEqual([]);
  });

  it("LP を持たない slug のデータを残さない", () => {
    const known = new Set(TEMPLATE_SEO_DATA.map(t => t.slug));
    const orphans = Object.keys(TEMPLATE_CONTENT).filter(s => !known.has(s));
    expect(orphans, `対応するLPが無い: ${orphans.join(", ")}`).toEqual([]);
  });

  it("各ページが薄さの下限を超える", () => {
    const thin = TEMPLATE_SEO_DATA.map(seo => ({
      slug: seo.slug,
      chars: contentText(seo.slug).length,
    }))
      .filter(({ chars }) => chars < MIN_UNIQUE_CHARS)
      .map(({ slug, chars }) => `${slug}(${chars}字)`);

    expect(thin, `本文が薄いLP: ${thin.join(", ")}`).toEqual([]);
  });

  it("段落を他のテンプレートと使い回さない", () => {
    const seen = new Map<string, string>();
    const duplicated: string[] = [];

    for (const seo of TEMPLATE_SEO_DATA) {
      const c = TEMPLATE_CONTENT[seo.slug];
      if (!c) continue;
      for (const paragraph of c.body.flatMap(s => s.paragraphs)) {
        const owner = seen.get(paragraph);
        if (owner) duplicated.push(`${owner} と ${seo.slug}`);
        else seen.set(paragraph, seo.slug);
      }
    }

    expect(duplicated, `段落が重複: ${duplicated.join(", ")}`).toEqual([]);
  });

  it("FAQ の質問を他のテンプレートと使い回さない", () => {
    const seen = new Map<string, string>();
    const duplicated: string[] = [];

    for (const seo of TEMPLATE_SEO_DATA) {
      const c = TEMPLATE_CONTENT[seo.slug];
      if (!c) continue;
      for (const { question } of c.faq) {
        const owner = seen.get(question);
        if (owner) duplicated.push(`${owner} と ${seo.slug}: ${question}`);
        else seen.set(question, seo.slug);
      }
    }

    expect(duplicated, `FAQ が重複: ${duplicated.join(", ")}`).toEqual([]);
  });

  it("トップページの共通FAQをテンプレLPに複製しない", () => {
    const common = new Set(COMMON_FAQ.map(f => f.question));
    const copied: string[] = [];

    for (const seo of TEMPLATE_SEO_DATA) {
      const c = TEMPLATE_CONTENT[seo.slug];
      if (!c) continue;
      for (const { question } of c.faq) {
        if (common.has(question)) copied.push(`${seo.slug}: ${question}`);
      }
    }

    expect(copied, `共通FAQの複製: ${copied.join(", ")}`).toEqual([]);
  });

  it("見出しと本文が空でない", () => {
    const empty: string[] = [];

    for (const seo of TEMPLATE_SEO_DATA) {
      const c = TEMPLATE_CONTENT[seo.slug];
      if (!c) continue;
      for (const section of c.body) {
        if (!section.heading.trim() || section.paragraphs.length === 0) {
          empty.push(`${seo.slug}: ${section.heading}`);
        }
        if (section.paragraphs.some(p => !p.trim())) {
          empty.push(`${seo.slug}: ${section.heading} に空段落`);
        }
      }
      for (const f of c.faq) {
        if (!f.question.trim() || !f.answer.trim()) {
          empty.push(`${seo.slug}: FAQ が空`);
        }
      }
    }

    expect(empty).toEqual([]);
  });
});
