import { describe, it, expect } from "vitest";
import {
  buildSocialMetaTags,
  renderLandingPageHtml,
  renderTemplateListHtml,
  renderTemplateDetailHtml,
  handleSitemap,
  injectScheduleOgp,
  isBot,
  isKnownAppRoute,
  renderJunbanHtml,
} from "./seo";
import { COMMON_FAQ, TEMPLATE_SEO_DATA } from "../../shared/seo-templates";
import { TEMPLATE_CONTENT } from "../../shared/template-content";

describe("isBot", () => {
  // 生成AI検索のクローラーは JS を実行しない。bot 判定を外すとプリレンダリングが返らず、
  // 本文が届かないまま「JavaScriptを有効にしてください」だけをインデックスされる。
  it.each([
    [
      "GPTBot",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot",
    ],
    [
      "OAI-SearchBot",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
    ],
    [
      "ChatGPT-User",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
    ],
    [
      "PerplexityBot",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
    ],
    [
      "Perplexity-User",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
    ],
    [
      "ClaudeBot",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
    ],
    [
      "Claude-User",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)",
    ],
    [
      "Claude-SearchBot",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +Claude-SearchBot@anthropic.com)",
    ],
    [
      "Amazonbot",
      "Mozilla/5.0 (Linux; like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)",
    ],
    [
      "meta-externalagent",
      "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
    ],
    ["CCBot", "CCBot/2.0 (https://commoncrawl.org/faq/)"],
    [
      "DuckAssistBot",
      "Mozilla/5.0 (compatible; DuckAssistBot/1.0; +https://duckduckgo.com/duckassistbot/)",
    ],
    ["YouBot", "Mozilla/5.0 (compatible; YouBot (+http://www.you.com))"],
    [
      "Bytespider",
      "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)",
    ],
  ])("生成AIクローラー %s を bot と判定する", (_name, ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it("従来の検索エンジン・SNS クローラーを bot と判定する", () => {
    expect(
      isBot(
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      )
    ).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
  });

  it("通常のブラウザを bot と判定しない", () => {
    // AppleWebKit を含むが Applebot ではない、Chrome を含むが Chrome-Lighthouse ではない、を踏む
    expect(
      isBot(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
      )
    ).toBe(false);
    expect(
      isBot(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe(false);
  });
});

describe("buildSocialMetaTags", () => {
  it("includes og:title, og:description, og:url, og:type", () => {
    const html = buildSocialMetaTags({
      title: "テスト記事",
      description: "テスト説明",
      url: "https://toban.app/test",
      origin: "https://toban.app",
      type: "article",
    });
    expect(html).toContain('<meta property="og:title" content="テスト記事"');
    expect(html).toContain(
      '<meta property="og:description" content="テスト説明"'
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://toban.app/test"'
    );
    expect(html).toContain('<meta property="og:type" content="article"');
  });

  it("defaults type to website", () => {
    const html = buildSocialMetaTags({
      title: "x",
      description: "y",
      url: "https://toban.app/",
      origin: "https://toban.app",
    });
    expect(html).toContain('<meta property="og:type" content="website"');
  });

  it("includes og:image with 1200x630 dimensions pointing to /og-image.png", () => {
    const html = buildSocialMetaTags({
      title: "x",
      description: "y",
      url: "https://toban.app/",
      origin: "https://toban.app",
    });
    expect(html).toContain(
      '<meta property="og:image" content="https://toban.app/og-image.png"'
    );
    expect(html).toContain('<meta property="og:image:width" content="1200"');
    expect(html).toContain('<meta property="og:image:height" content="630"');
  });

  it("includes Twitter summary_large_image card with title/description/image", () => {
    const html = buildSocialMetaTags({
      title: "テスト",
      description: "せつめい",
      url: "https://toban.app/",
      origin: "https://toban.app",
    });
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image"'
    );
    expect(html).toContain('<meta name="twitter:title" content="テスト"');
    expect(html).toContain(
      '<meta name="twitter:description" content="せつめい"'
    );
    expect(html).toContain(
      '<meta name="twitter:image" content="https://toban.app/og-image.png"'
    );
  });

  it("escapes HTML special characters in title and description", () => {
    const html = buildSocialMetaTags({
      title: '"危険な" <タグ>',
      description: "A & B",
      url: "https://toban.app/",
      origin: "https://toban.app",
    });
    expect(html).not.toContain('"危険な"');
    expect(html).toContain("&quot;危険な&quot;");
    expect(html).toContain("&lt;タグ&gt;");
    expect(html).toContain("A &amp; B");
  });
});

describe("render functions emit consistent OGP/Twitter tags", () => {
  const origin = "https://toban.app";

  it("renderLandingPageHtml は当番表作成アプリ/エクセル不要の検索語彙を含む", () => {
    // ③当番表アプリ・②エクセル代替クエリの受け皿。文言変更で語彙が落ちないよう固定。
    // 「当番表作成アプリ」は 当番表 / 作成 / アプリ を内包し「当番表 アプリ」「当番表 作成」両クエリを受ける。
    const html = renderLandingPageHtml(origin);
    expect(html).toContain("当番表作成アプリ");
    expect(html).toMatch(/エクセル|Excel/);
  });

  it("renderLandingPageHtml の description がテンプレートに言及する", () => {
    // テンプレート狙いの検索でスニペットに語が出るようにする。
    // 順位は /templates で取りに行くので、ここは title ではなく description だけ。
    const html = renderLandingPageHtml(origin);
    const desc = html.match(/<meta name="description" content="([^"]*)">/)![1];
    expect(desc).toContain("テンプレート");
    expect(html).not.toContain("<title>当番表テンプレート");
  });

  it("renderLandingPageHtml uses /og-image.png and twitter card", () => {
    const html = renderLandingPageHtml(origin);
    expect(html).toContain(
      '<meta property="og:image" content="https://toban.app/og-image.png">'
    );
    expect(html).toContain('<meta property="og:image:width" content="1200">');
    expect(html).toContain('<meta property="og:image:height" content="630">');
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image">'
    );
    expect(html).toContain(
      '<meta name="twitter:image" content="https://toban.app/og-image.png">'
    );
    expect(html).not.toMatch(/property="og:image"[^>]*pwa-512/);
    expect(html).not.toMatch(/name="twitter:image"[^>]*pwa-512/);
  });

  it("renderTemplateListHtml uses /og-image.png and twitter card", () => {
    const html = renderTemplateListHtml(origin);
    expect(html).toContain(
      '<meta property="og:image" content="https://toban.app/og-image.png">'
    );
    expect(html).toContain('<meta property="og:image:width" content="1200">');
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image">'
    );
    expect(html).toContain(
      '<meta name="twitter:image" content="https://toban.app/og-image.png">'
    );
  });

  it("renderTemplateListHtml は人間向け画面にない共通FAQを出さない", () => {
    const html = renderTemplateListHtml(origin);
    expect(html).not.toContain('"@type":"FAQPage"');
    expect(html).not.toContain("<h2>よくある質問</h2>");
  });

  it("renderTemplateDetailHtml uses /og-image.png and twitter card", () => {
    const html = renderTemplateDetailHtml(origin, "office-cleaning");
    expect(html).not.toBeNull();
    expect(html).toContain(
      '<meta property="og:image" content="https://toban.app/og-image.png">'
    );
    expect(html).toContain('<meta property="og:image:width" content="1200">');
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image">'
    );
    expect(html).toContain(
      '<meta name="twitter:image" content="https://toban.app/og-image.png">'
    );
  });
});

describe("injectScheduleOgp", () => {
  // index.html 相当: トップページ用の OGP/canonical を持つベース HTML
  const baseHtml = `<!doctype html>
<html lang="ja">
  <head>
    <title>当番表作成アプリ toban</title>
    <link rel="canonical" href="https://toban.app/" />
    <meta property="og:title" content="当番表作成アプリ toban" />
    <meta property="og:url" content="https://toban.app/" />
    <meta name="twitter:title" content="当番表作成アプリ toban" />
  </head>
  <body><div id="root"></div></body>
</html>`;

  const args = {
    name: "3年2組の掃除当番",
    url: "https://toban.app/s/abc123",
    origin: "https://toban.app",
  };

  it("title を共有スケジュール名に置き換える", () => {
    const html = injectScheduleOgp(baseHtml, args);
    expect(html).toContain("<title>3年2組の掃除当番 - toban</title>");
    expect(html).not.toContain("<title>当番表作成アプリ toban</title>");
  });

  it("トップページ用の og:/twitter: タグを残さない（スクレイパーの先頭タグ誤読防止）", () => {
    const html = injectScheduleOgp(baseHtml, args);
    expect(html).not.toContain('content="https://toban.app/" property');
    expect(html).not.toMatch(/og:title" content="当番表作成アプリ/);
    expect(html).not.toMatch(/twitter:title" content="当番表作成アプリ/);
    // og:title / og:url / twitter:title は共有ページ用の1つだけになる
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/property="og:url"/g)).toHaveLength(1);
    expect(html.match(/name="twitter:title"/g)).toHaveLength(1);
  });

  it("canonical を共有 URL に張り替える（sitemap 掲載と整合）", () => {
    const html = injectScheduleOgp(baseHtml, args);
    expect(html).toContain(
      '<link rel="canonical" href="https://toban.app/s/abc123">'
    );
    expect(html).not.toContain(
      '<link rel="canonical" href="https://toban.app/" />'
    );
  });

  it("検索結果には共有スケジュールを出さない", () => {
    const html = injectScheduleOgp(baseHtml, args);
    expect(html).toContain('<meta name="robots" content="noindex">');
  });

  it("スケジュール名の HTML 特殊文字をエスケープする", () => {
    const html = injectScheduleOgp(baseHtml, {
      ...args,
      name: '<script>"x"</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("スケジュール名の $ 置換パターン（$` / $&）で head 構造を汚染できない", () => {
    // String.replace の substitution pattern は escapeHtml では無害化されないため、
    // replacer 関数で渡さないとマッチ前方の HTML が title 内に複製注入される。
    const html = injectScheduleOgp(baseHtml, { ...args, name: "$`x$&y" });
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain("<title>$`x$&amp;y - toban</title>");
    expect(html).not.toContain("<title><!doctype");
  });

  it("minify された1行 HTML でも元の og:/twitter:/canonical を除去できる", () => {
    const minified =
      '<!doctype html><html lang="ja"><head><title>当番表作成アプリ toban</title>' +
      '<link rel="canonical" href="https://toban.app/"/>' +
      '<meta property="og:title" content="当番表作成アプリ toban"/>' +
      '<meta name="twitter:title" content="当番表作成アプリ toban"/>' +
      '</head><body><div id="root"></div></body></html>';
    const html = injectScheduleOgp(minified, args);
    expect(html).not.toMatch(/og:title" content="当番表作成アプリ/);
    expect(html).not.toMatch(/twitter:title" content="当番表作成アプリ/);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain(
      '<link rel="canonical" href="https://toban.app/s/abc123">'
    );
  });
});

describe("handleSitemap", () => {
  // DB なし（ensureSchedulesSchema が throw）でも静的ルート分の sitemap は返る設計。
  const envWithoutDb = {} as never;

  it("DB が無くても / と /templates を含む sitemap を返す", async () => {
    const res = await handleSitemap("https://toban.app", envWithoutDb);
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const xml = await res.text();
    expect(xml).toContain("<loc>https://toban.app/</loc>");
    expect(xml).toContain("<loc>https://toban.app/templates</loc>");
  });

  it("全テンプレート詳細 URL を含む", async () => {
    const res = await handleSitemap("https://toban.app", envWithoutDb);
    const xml = await res.text();
    expect(xml).toContain(
      "<loc>https://toban.app/templates/office-cleaning</loc>"
    );
    expect(xml).toContain(
      "<loc>https://toban.app/templates/school-lunch</loc>"
    );
  });

  it("順番決めページ /junban を含む", async () => {
    const res = await handleSitemap("https://toban.app", envWithoutDb);
    const xml = await res.text();
    expect(xml).toContain("<loc>https://toban.app/junban</loc>");
  });

  it("正規URLだけを掲載し、共有URLや疑似更新情報を含めない", async () => {
    const res = await handleSitemap("https://toban.app", envWithoutDb);
    const xml = await res.text();

    expect(xml).not.toContain("<loc>https://toban.app/about</loc>");
    expect(xml).not.toContain("<loc>https://toban.app/s/");
    expect(xml).not.toContain("<lastmod>");
    expect(xml).not.toContain("<changefreq>");
    expect(xml).not.toContain("<priority>");
  });
});

describe("renderJunbanHtml", () => {
  const origin = "https://toban.app";

  it("title/description/canonical と検索語彙（順番・ルーレット）を含む", () => {
    const html = renderJunbanHtml(origin);
    expect(html).toContain("<title>当番の順番をルーレット感覚で決める");
    expect(html).toContain(
      '<link rel="canonical" href="https://toban.app/junban">'
    );
    expect(html).toMatch(/順番/);
    expect(html).toMatch(/ルーレット/);
  });

  it("OGP/Twitter Card と FAQ 構造化データを含む", () => {
    const html = renderJunbanHtml(origin);
    expect(html).toContain(
      '<meta property="og:image" content="https://toban.app/og-image.png">'
    );
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image">'
    );
    expect(html).toContain('"@type":"FAQPage"');
  });

  it("円盤ビューへ着地する CTA（/?view=disc）を含む", () => {
    const html = renderJunbanHtml(origin);
    expect(html).toContain(`${origin}/?view=disc`);
  });

  it("ランダム抽選を約束せず、抽選ではない旨を明記する（intent ミスマッチ回避）", () => {
    const html = renderJunbanHtml(origin);
    expect(html).toMatch(/抽選とは異な|ランダムに当たりを引く抽選とは/);
  });

  it("JSON-LD ブロックに生の < を出さない（</script> ブレイク防止・defense-in-depth）", () => {
    const html = renderJunbanHtml(origin);
    const ld = html.slice(
      html.indexOf('application/ld+json">') + 21,
      html.indexOf("</script>")
    );
    expect(ld).not.toContain("<");
  });

  it("パンくず position1 は React 側と同じ「toban について」（bot/UI の構造化データ整合）", () => {
    const html = renderJunbanHtml(origin);
    expect(html).toContain('"name":"toban について"');
  });
});

describe("isKnownAppRoute", () => {
  it.each([
    "/",
    "/about",
    "/templates",
    "/templates/office-cleaning",
    "/s/abc_123-X",
    "/transfer",
    "/junban",
  ])("既知ルート %s は true", path => {
    expect(isKnownAppRoute(path)).toBe(true);
  });

  it.each([
    "/templates/not-a-real-template", // 実在しない slug は soft-404 にしない
    "/foobar",
    "/about/extra",
    "/s/",
    "/404", // 404 ページ自体を bot に 200 で返すと自己矛盾するため未知扱い
  ])("未知ルート %s は false（bot へ 404 status を返す根拠）", path => {
    expect(isKnownAppRoute(path)).toBe(false);
  });
});

describe("renderTemplateDetailHtml related templates", () => {
  const origin = "https://toban.app";

  it("includes a section with related template links", () => {
    const html = renderTemplateDetailHtml(origin, "office-cleaning");
    expect(html).not.toBeNull();
    expect(html).toContain("関連するテンプレート");
    expect(html).not.toMatch(
      /<a href="https:\/\/toban\.app\/templates\/office-cleaning"/
    );
  });

  it("emits up to 4 related template anchor tags inside the related section", () => {
    const html = renderTemplateDetailHtml(origin, "office-cleaning");
    expect(html).not.toBeNull();
    const sectionMatch = html!.match(
      /<section>\s*<h2>関連するテンプレート<\/h2>[\s\S]*?<\/section>/
    );
    expect(sectionMatch).not.toBeNull();
    const anchorCount = (
      sectionMatch![0].match(/<a href="https:\/\/toban\.app\/templates\//g) ||
      []
    ).length;
    expect(anchorCount).toBeGreaterThan(0);
    expect(anchorCount).toBeLessThanOrEqual(4);
  });

  it("人間向け画面と同じテンプレート内容を出し、bot専用の共通FAQを出さない", () => {
    const html = renderTemplateDetailHtml(origin, "office-cleaning");
    expect(html).not.toBeNull();
    expect(html).toContain("掃除機・モップ");
    expect(html).toContain("メンバー例（4名）");
    // トップページ用の共通FAQはテンプレLPに出さない（ページ間で本文が重複するため）
    expect(html).not.toContain(COMMON_FAQ[0].question);
  });

  it("テンプレート固有の本文とFAQを出す", () => {
    const html = renderTemplateDetailHtml(origin, "office-cleaning");
    const content = TEMPLATE_CONTENT["office-cleaning"];
    expect(html).not.toBeNull();

    for (const section of content.body) {
      expect(html).toContain(`<h2>${section.heading}</h2>`);
      for (const paragraph of section.paragraphs) {
        expect(html).toContain(paragraph);
      }
    }
    for (const item of content.faq) {
      expect(html).toContain(`<dt>${item.question}</dt>`);
      expect(html).toContain(`<dd>${item.answer}</dd>`);
    }
  });

  it("固有FAQを持つページは FAQPage 構造化データを出す", () => {
    const html = renderTemplateDetailHtml(origin, "office-cleaning");
    expect(html).not.toBeNull();
    expect(html).toContain('"@type":"FAQPage"');
    // 構造化データの質問が本文にも存在する（マークアップと本文の不一致を防ぐ）
    for (const item of TEMPLATE_CONTENT["office-cleaning"].faq) {
      expect(html).toContain(`<dt>${item.question}</dt>`);
    }
  });

  it("title を加工せずそのまま出す", () => {
    // ブランドサフィックスを付けない。SERP の表示幅で末尾が切れ、
    // 差別化語のほうが落ちるため。サイト名は og:site_name が伝える。
    // エスケープを挟まず比較できるのは、seo-templates.test.ts の
    // 「title に HTML 特殊文字を使わない」が前提を守っているため。
    for (const seo of TEMPLATE_SEO_DATA) {
      const html = renderTemplateDetailHtml(origin, seo.slug);
      expect(html).toContain(`<title>${seo.title}</title>`);
    }
  });

  it("すべてのテンプレLPが固有本文を含む", () => {
    const thin = TEMPLATE_SEO_DATA.filter(seo => {
      const html = renderTemplateDetailHtml(origin, seo.slug);
      const content = TEMPLATE_CONTENT[seo.slug];
      return !html || !content || !html.includes(content.body[0].paragraphs[0]);
    }).map(seo => seo.slug);

    expect(thin, `本文が出ていないLP: ${thin.join(", ")}`).toEqual([]);
  });
});

describe("renderTemplateListHtml", () => {
  const origin = "https://toban.app";

  it("h1 にタイトルタグを流用しない", () => {
    // h1 は見出しであってタイトルタグではない。React 側 (templates.heading) と揃える。
    const html = renderTemplateListHtml(origin);
    expect(html).toContain("<h1>当番表テンプレート一覧</h1>");
    expect(html).not.toContain("<h1>当番表テンプレート一覧｜無料で使えるtoban");
  });

  it("title にはブランド名を残す", () => {
    // 一覧ページはブランド想起の受け皿として残す（個別LPとは扱いが違う）
    const html = renderTemplateListHtml(origin);
    expect(html).toContain(
      "<title>当番表テンプレート一覧｜無料で使えるtoban</title>"
    );
  });

  it("BreadcrumbList と ItemList を出す", () => {
    const html = renderTemplateListHtml(origin);
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain(`"numberOfItems":${TEMPLATE_SEO_DATA.length}`);
  });

  it("ItemList の position が本文のリンク順と一致する", () => {
    // 構造化データだけカテゴリ順から外れると、Google に本文と違う並びを伝えてしまう。
    const html = renderTemplateListHtml(origin);

    const bodyOrder = [
      ...html
        .slice(html.indexOf("<body>"))
        .matchAll(/\/templates\/([a-z0-9-]+)"/g),
    ].map(m => m[1]);

    const schema = html.match(
      /<script type="application\/ld\+json">(.*?)<\/script>/
    )![1];
    const itemList = JSON.parse(schema).find(
      (s: { "@type": string }) => s["@type"] === "ItemList"
    );
    const schemaOrder = itemList.itemListElement.map(
      (el: { url: string }) => el.url.split("/templates/")[1]
    );

    expect(schemaOrder).toEqual(bodyOrder);
    expect(
      itemList.itemListElement.map((el: { position: number }) => el.position)
    ).toEqual(bodyOrder.map((_, i) => i + 1));
  });

  it("フッターからトップへ戻れる", () => {
    // 一覧に入ってきた訪問者を本体へ渡す導線。以前は /about にしか繋がっていなかった。
    const html = renderTemplateListHtml(origin);
    const footer = html.slice(html.indexOf("<footer>"));
    expect(footer).toContain(`<a href="${origin}/">当番表を作る</a>`);
  });
});
