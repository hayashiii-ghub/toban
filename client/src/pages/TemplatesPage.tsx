import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowLeft } from "lucide-react";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORIES_EN,
  TEMPLATE_SEO_DATA,
  type TemplateSEO,
} from "@shared/seo-templates";
import { TEMPLATES } from "@/rotation/constants";
import {
  breadcrumbSchema,
  itemListSchema,
  serializeJsonLd,
} from "@shared/jsonLd";
import { useT, useLocale } from "@/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";

const byCategory = new Map<string, TemplateSEO[]>();
for (const cat of TEMPLATE_CATEGORIES) byCategory.set(cat.id, []);
for (const t of TEMPLATE_SEO_DATA) byCategory.get(t.categoryId)?.push(t);

export default function TemplatesPage() {
  const t = useT();
  const { locale } = useLocale();
  const description = `${t("templates.subA")}${t("templates.subFree")}${t("templates.subB", { count: TEMPLATE_SEO_DATA.length })}`;
  usePageMeta({
    title: t("templates.docTitle"),
    description,
    path: "/templates",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ItemList は画面に出ているカードと同じ順序・同じ件数・同じ表示名で作る。
  // 下のカード描画と同じ条件（template が引けないものは出さない）を使う。
  const listedTemplates = TEMPLATE_CATEGORIES.flatMap(cat =>
    (byCategory.get(cat.id) ?? []).flatMap(tpl => {
      const template = TEMPLATES[tpl.templateIndex];
      return template ? [{ slug: tpl.slug, name: template.name }] : [];
    })
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FFF8E7" }}>
      {/* パンくず */}
      <nav
        className="px-4 pt-6 pb-2 max-w-3xl mx-auto"
        aria-label={t("templates.breadcrumbAria")}
      >
        <ol className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
          <li>
            <Link href="/about" className="hover:underline text-amber-700">
              {t("footer.about")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-700 font-bold">
            {t("templates.breadcrumb")}
          </li>
        </ol>
      </nav>

      {/* ヘッダー */}
      <div className="px-4 pb-6 max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
          {t("templates.heading")}
        </h1>
        <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
          {t("templates.subA")}
          <strong>{t("templates.subFree")}</strong>
          {t("templates.subB", { count: TEMPLATE_SEO_DATA.length })}
        </p>
      </div>

      {/* カテゴリ別テンプレート */}
      <div className="px-4 pb-10">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          {TEMPLATE_CATEGORIES.map(cat => {
            const templates = byCategory.get(cat.id);
            if (!templates || templates.length === 0) return null;
            const catEn =
              locale === "en" ? TEMPLATE_CATEGORIES_EN[cat.id] : undefined;
            return (
              <section key={cat.id} id={cat.id}>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-1">
                  <span className="mr-2">{cat.emoji}</span>
                  {catEn?.label ?? cat.label}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  {catEn?.description ?? cat.description}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map(tpl => {
                    const template = TEMPLATES[tpl.templateIndex];
                    if (!template) return null;
                    return (
                      <Link
                        key={tpl.slug}
                        href={`/templates/${tpl.slug}`}
                        className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-150"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className="text-2xl flex-shrink-0"
                            aria-hidden="true"
                          >
                            {template.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-extrabold text-gray-900 group-hover:text-amber-700 transition-colors">
                              {template.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {template.groups
                                .map(g => g.tasks.join("、"))
                                .join(" / ")}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {template.groups.length}
                              {template.assignmentMode === "task"
                                ? "タスク"
                                : "グループ"}
                              ・{template.members.length}名
                            </div>
                          </div>
                          <ArrowRight className="size-4 text-gray-300 group-hover:text-amber-500 flex-shrink-0 mt-1 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* toban についてに戻るリンク */}
      <div className="px-4 pb-24 max-w-3xl mx-auto text-center">
        <Link
          href="/about"
          className="inline-flex items-center gap-2 text-sm font-bold text-amber-700 hover:underline"
        >
          <ArrowLeft className="size-4" />
          {t("footer.about")}
        </Link>
      </div>

      {/* JSON-LD: BreadcrumbList + ItemList（serializeJsonLd が < をエスケープ） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([
            breadcrumbSchema([
              {
                name: "toban について",
                item: window.location.origin + "/about",
              },
              { name: "テンプレート一覧" },
            ]),
            itemListSchema(
              listedTemplates.map(tpl => ({
                name: tpl.name,
                url: `${window.location.origin}/templates/${tpl.slug}`,
              }))
            ),
          ]),
        }}
      />

      {/* 固定CTAボタン */}
      <a
        href="/"
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-xl bg-[#2E6B4F] hover:bg-[#245A41] text-white font-bold px-5 py-3 shadow-lg transition-colors print:hidden"
      >
        {t("lp.createSchedule")}
        <ArrowRight className="size-4" />
      </a>
    </main>
  );
}
