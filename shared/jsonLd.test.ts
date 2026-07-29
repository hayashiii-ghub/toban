import { describe, it, expect } from "vitest";
import { faqPageSchema, breadcrumbSchema, serializeJsonLd } from "./jsonLd";

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
