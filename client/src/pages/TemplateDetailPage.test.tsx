import { cleanup } from "@/test/vue";
import { afterEach, describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { renderAt } from "@/test/router";
import { LanguageProvider } from "@/i18n";
import { TEMPLATE_CONTENT } from "@shared/template-content";
import { TEMPLATE_SEO_DATA } from "@shared/seo-templates";
import { renderTemplateDetailHtml } from "../../../server/handlers/seo";
import { readFileSync } from "node:fs";
import TemplateDetailPage from "./TemplateDetailPage";

afterEach(cleanup);

describe("TemplateDetailPage", () => {
  it("未知slugの404画面で、そのURLをcanonicalにしない", async () => {
    window.history.pushState({}, "", "/templates/not-a-real-template");
    document.head.innerHTML =
      '<link rel="canonical" href="https://toban.app/">';

    await renderAt("/templates/not-a-real-template", [
      { path: "/templates/:slug", component: TemplateDetailPage },
    ]);

    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href")
    ).toBe("https://toban.app/");
  });

  it("別の記事へ移動すると本文・作成リンク・メタ情報を新しいテンプレートに更新する", async () => {
    localStorage.setItem("toban-lang", "ja");
    const first = TEMPLATE_SEO_DATA[0];
    const next = TEMPLATE_SEO_DATA[1];
    const view = await renderAt(
      `/templates/${first.slug}`,
      [{ path: "/templates/:slug", component: TemplateDetailPage }],
      { wrapper: LanguageProvider }
    );
    expect(view.getByRole("heading", { level: 1 })).toHaveTextContent(
      first.heading
    );

    await view.navigate(`/templates/${next.slug}`);

    expect(view.getByRole("heading", { level: 1 })).toHaveTextContent(
      next.heading
    );
    expect(
      view.getByRole("link", { name: "このテンプレートで作る" })
    ).toHaveAttribute("href", `/?template=${next.templateIndex}`);
    expect(document.title).toBe(next.title);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${window.location.origin}/templates/${next.slug}`
    );
  });
});

describe("記事本文の言語とクローラーの一致", () => {
  it("直接アクセス・PWA が使う共通シェルには広告を置かない", () => {
    expect(readFileSync("client/index.html", "utf8")).not.toContain(
      "adsbygoogle"
    );
  });

  it.each(["ja", "en"])(
    "%s でも全記事の本文・FAQ がクローラーと一致する",
    async locale => {
      localStorage.setItem("toban-lang", locale);
      for (const seo of TEMPLATE_SEO_DATA) {
        const router = createRouter({
          history: createMemoryHistory(),
          routes: [
            { path: "/templates/:slug", component: TemplateDetailPage },
            { path: "/:pathMatch(.*)*", component: { render: () => null } },
          ],
        });
        const app = createSSRApp(() => (
          <LanguageProvider>
            <RouterView />
          </LanguageProvider>
        ));
        app.use(router);
        await router.push(`/templates/${seo.slug}`);
        await router.isReady();
        const html = await renderToString(app);
        const human = new DOMParser().parseFromString(html, "text/html");
        const bot = new DOMParser().parseFromString(
          renderTemplateDetailHtml("https://toban.app", seo.slug)!,
          "text/html"
        );
        const content = TEMPLATE_CONTENT[seo.slug];
        const texts = [
          ...content.body.flatMap(section => [
            section.heading,
            ...section.paragraphs,
          ]),
          ...content.faq.flatMap(item => [item.question, item.answer]),
        ];
        for (const text of texts) {
          expect(human.body.textContent).toContain(text);
          expect(bot.body.textContent).toContain(text);
        }
        expect(human.querySelectorAll('section[lang="ja"]')).toHaveLength(2);
      }
      localStorage.removeItem("toban-lang");
    }
  );
});
