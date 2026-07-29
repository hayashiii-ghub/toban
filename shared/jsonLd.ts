/**
 * JSON-LD（schema.org 構造化データ）の共通ビルダー。
 * bot プリレンダ（server/handlers/seo.ts）と React ページの双方から使い、
 * スキーマ形状の二重定義による drift（例: パンくず name の食い違い）を防ぐ。
 * 出力は必ず serializeJsonLd を通して <script> に埋め、`<` を < 化する
 * （</script> ブレイク・XSS の defense-in-depth）。
 */

export type JsonLdObject = Record<string, unknown>;

export function faqPageSchema(
  faq: { question: string; answer: string }[]
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/** items は表示順。position は 1 始まりで自動採番。item（URL）は省略可（末尾要素など）。 */
export function breadcrumbSchema(
  items: { name: string; item?: string }[]
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.item ? { item: it.item } : {}),
    })),
  };
}

/** JSON-LD を <script> 用文字列に直列化。`<` を < 化して script ブレイク/XSS を防ぐ。 */
export function serializeJsonLd(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
