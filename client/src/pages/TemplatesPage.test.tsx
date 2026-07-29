import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TemplatesPage from "./TemplatesPage";
import { renderTemplateListHtml } from "../../../server/handlers/seo";

afterEach(cleanup);

/** ページが埋め込んだ JSON-LD から、指定 @type のオブジェクトを取り出す */
function readSchema(html: string, type: string) {
  const raw = html.match(
    /<script type="application\/ld\+json">(.*?)<\/script>/
  )![1];
  return JSON.parse(raw).find((s: { "@type": string }) => s["@type"] === type);
}

describe("TemplatesPage の構造化データ", () => {
  it("ItemList をカードと同じ順序・件数・表示名で出す", () => {
    const { container } = render(<TemplatesPage />);

    const script = container.querySelector(
      'script[type="application/ld+json"]'
    )!;
    const itemList = JSON.parse(script.innerHTML).find(
      (s: { "@type": string }) => s["@type"] === "ItemList"
    );

    // 画面に出ているカードのリンク先（固定CTAの "/" は除く）
    const cardSlugs = [...container.querySelectorAll('a[href^="/templates/"]')]
      .map(a => a.getAttribute("href")!.replace("/templates/", ""))
      .filter(Boolean);

    expect(itemList.numberOfItems).toBe(cardSlugs.length);
    expect(
      itemList.itemListElement.map(
        (el: { url: string }) => el.url.split("/templates/")[1]
      )
    ).toEqual(cardSlugs);
  });

  it("bot 向けプリレンダと同じテンプレートを同じ順序で列挙する", () => {
    // React と bot で別々に組み立てているため、片方だけ並び替えると
    // クローラーと利用者に違う一覧を見せることになる。
    const { container } = render(<TemplatesPage />);
    const reactList = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.innerHTML
    ).find((s: { "@type": string }) => s["@type"] === "ItemList");

    const botList = readSchema(
      renderTemplateListHtml("https://toban.app"),
      "ItemList"
    );

    const slugs = (list: { itemListElement: { url: string }[] }) =>
      list.itemListElement.map(el => el.url.split("/templates/")[1]);

    expect(slugs(reactList)).toEqual(slugs(botList));
  });
});
