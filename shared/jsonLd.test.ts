import { describe, it, expect } from "vitest";
import {
  faqPageSchema,
  breadcrumbSchema,
  itemListSchema,
  serializeJsonLd,
} from "./jsonLd";

describe("faqPageSchema", () => {
  it("FAQPage に Question/acceptedAnswer をマップする", () => {
    const s = faqPageSchema([{ question: "Q1", answer: "A1" }]) as Record<
      string,
      unknown
    >;
    expect(s["@type"]).toBe("FAQPage");
    expect(s.mainEntity).toEqual([
      {
        "@type": "Question",
        name: "Q1",
        acceptedAnswer: { "@type": "Answer", text: "A1" },
      },
    ]);
  });
});

describe("breadcrumbSchema", () => {
  it("position を 1 始まりで自動採番し、item 省略時は item を持たない", () => {
    const s = breadcrumbSchema([
      { name: "toban について", item: "https://toban.app/about" },
      { name: "現在ページ" },
    ]) as Record<string, unknown>;
    expect(s["@type"]).toBe("BreadcrumbList");
    expect(s.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "toban について",
        item: "https://toban.app/about",
      },
      { "@type": "ListItem", position: 2, name: "現在ページ" },
    ]);
  });
});

describe("itemListSchema", () => {
  it("渡された順序のまま position を 1 始まりで採番し、numberOfItems を件数に合わせる", () => {
    const s = itemListSchema([
      { name: "二番目に出すもの", url: "https://toban.app/templates/b" },
      { name: "一番目に出すもの", url: "https://toban.app/templates/a" },
    ]) as Record<string, unknown>;
    expect(s["@type"]).toBe("ItemList");
    expect(s.numberOfItems).toBe(2);
    // 並べ替えず、呼び出し側が渡した順（＝本文の表示順）を保つ
    expect(s.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: "二番目に出すもの",
        url: "https://toban.app/templates/b",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "一番目に出すもの",
        url: "https://toban.app/templates/a",
      },
    ]);
  });

  it("空配列でも numberOfItems 0 の ItemList を返す", () => {
    const s = itemListSchema([]) as Record<string, unknown>;
    expect(s.numberOfItems).toBe(0);
    expect(s.itemListElement).toEqual([]);
  });
});

describe("serializeJsonLd", () => {
  it("< を < に置換して </script> ブレイクを防ぐ", () => {
    const out = serializeJsonLd({ x: "</script><b>" });
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script>"); // < だけ置換、> はそのまま
  });

  it("通常の JSON はそのまま直列化する", () => {
    expect(serializeJsonLd({ a: 1 })).toBe('{"a":1}');
  });
});
