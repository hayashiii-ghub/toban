import { defineView } from "@/lib/vue";
import { render } from "@/test/vue";
import { describe, expect, it } from "vitest";
import { usePageMeta } from "./usePageMeta";

const MetaFixture = defineView<object>([], () => {
  usePageMeta({
    title: "ページタイトル",
    description: "ページの説明",
    path: "/templates/example",
  });
  return () => null;
});

describe("usePageMeta", () => {
  it("現在ページの title・description・canonical・OGP を同期する", () => {
    document.head.innerHTML = `
      <title>トップ</title>
      <meta name="description" content="トップの説明">
      <link rel="canonical" href="https://toban.app/">
      <meta property="og:title" content="トップ">
      <meta property="og:description" content="トップの説明">
      <meta property="og:url" content="https://toban.app/">
    `;

    render(<MetaFixture />);

    expect(document.title).toBe("ページタイトル");
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
    ).toBe("ページの説明");
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href")
    ).toBe(`${window.location.origin}/templates/example`);
    expect(
      document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content")
    ).toBe("ページタイトル");
    expect(
      document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute("content")
    ).toBe("ページの説明");
    expect(
      document.querySelector('meta[property="og:url"]')?.getAttribute("content")
    ).toBe(`${window.location.origin}/templates/example`);
  });
});
