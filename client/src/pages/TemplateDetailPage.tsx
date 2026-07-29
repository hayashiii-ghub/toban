import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { ArrowRight, ArrowLeft } from "lucide-react";
import {
  TEMPLATE_SEO_MAP,
  TEMPLATE_SEO_DATA,
  TEMPLATE_SEO_EN,
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORIES_EN,
  type TemplateSEO,
} from "@shared/seo-templates";
import { TEMPLATE_CONTENT } from "@shared/template-content";
import {
  breadcrumbSchema,
  faqPageSchema,
  serializeJsonLd,
} from "@shared/jsonLd";
import { TEMPLATES } from "@/rotation/constants";
import type { ScheduleTemplate } from "@/rotation/types";
import { useT, useLocale } from "@/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";

import NotFound from "./NotFound";

export default function TemplateDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const seo = slug ? TEMPLATE_SEO_MAP.get(slug) : undefined;
  const template = seo ? TEMPLATES[seo.templateIndex] : undefined;

  if (!slug || !seo || !template) return <NotFound />;

  return <TemplateDetailContent slug={slug} seo={seo} template={template} />;
}

function TemplateDetailContent({
  slug,
  seo,
  template,
}: {
  slug: string;
  seo: TemplateSEO;
  template: ScheduleTemplate;
}) {
  const t = useT();
  const { locale } = useLocale();
  const category = TEMPLATE_CATEGORIES.find(c => c.id === seo.categoryId);
  const en = locale === "en" ? TEMPLATE_SEO_EN[seo.slug] : undefined;
  // ブランド名は付けない。SERP の表示幅で末尾が切れ、差別化語のほうが落ちるため
  usePageMeta({
    title: en?.heading ?? seo.title,
    description: en?.intro ?? seo.description,
    path: `/templates/${slug}`,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const heading = en?.heading ?? seo.heading;
  const intro = en?.intro ?? seo.intro;
  // 本文・FAQ は日本語のみ用意しているため、英語表示では出さない
  const content = locale === "ja" ? TEMPLATE_CONTENT[seo.slug] : undefined;
  const catLabel = category
    ? locale === "en"
      ? (TEMPLATE_CATEGORIES_EN[category.id]?.label ?? category.label)
      : category.label
    : "";

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
          <li>
            <Link href="/templates" className="hover:underline text-amber-700">
              {t("templates.breadcrumb")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-700 font-bold">{template.name}</li>
        </ol>
      </nav>

      {/* メインコンテンツ */}
      <article className="px-4 pb-8 max-w-3xl mx-auto">
        {/* カテゴリバッジ */}
        {category && (
          <div className="mb-3">
            <span className="inline-block text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-3 py-1">
              {category.emoji} {catLabel}
            </span>
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
          {heading}
        </h1>

        <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
          {intro}
        </p>
      </article>

      {/* テンプレート内容プレビュー */}
      <section className="px-4 pb-10 max-w-3xl mx-auto">
        <h2
          className={`text-lg font-extrabold text-gray-900 ${locale === "en" ? "mb-1" : "mb-4"}`}
        >
          {t("templatesDetail.contents")}
        </h2>
        {locale === "en" && (
          <p className="text-xs text-gray-400 mb-4">
            {t("templatesDetail.jaNote")}
          </p>
        )}

        {/* グループ/タスク一覧 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {template.groups.map((group, i) => (
            <div
              key={group.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl" aria-hidden="true">
                  {group.emoji}
                </span>
                <h3 className="text-sm font-bold text-gray-800">
                  {template.assignmentMode === "task"
                    ? t("templatesDetail.taskN", { n: i + 1 })
                    : t("templatesDetail.groupN", { n: i + 1 })}
                </h3>
              </div>
              <ul className="flex flex-col gap-1">
                {group.tasks.map(task => (
                  <li
                    key={task}
                    className="text-sm text-gray-600 flex items-start gap-2"
                  >
                    <span className="text-amber-500 mt-0.5">-</span>
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* メンバー例 */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-gray-700 mb-2">
            {t("templatesDetail.memberExample", {
              count: template.members.length,
            })}
          </h3>
          <div className="flex flex-wrap gap-2">
            {template.members.map(member => (
              <span
                key={member.id}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: member.bgColor,
                  color: member.textColor,
                  border: `1.5px solid ${member.color}`,
                }}
              >
                {member.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {t("templatesDetail.editNote")}
          </p>
        </div>
      </section>

      {/* 本文（テンプレート固有の運用解説） */}
      {content && (
        <section className="px-4 pb-10 max-w-3xl mx-auto">
          {content.body.map(section => (
            <div key={section.heading} className="mb-8 last:mb-0">
              <h2 className="text-lg font-extrabold text-gray-900 mb-3">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-sm sm:text-base text-gray-600 leading-relaxed mb-3 last:mb-0"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </section>
      )}

      {/* よくある質問 */}
      {content && content.faq.length > 0 && (
        <section className="px-4 pb-10 max-w-3xl mx-auto">
          <h2 className="text-lg font-extrabold text-gray-900 mb-4">
            {heading}のよくある質問
          </h2>
          <dl>
            {content.faq.map(item => (
              <div
                key={item.question}
                className="rounded-xl border border-gray-200 bg-white p-4 mb-3 last:mb-0"
              >
                <dt className="text-sm font-bold text-gray-800 mb-2">
                  {item.question}
                </dt>
                <dd className="text-sm text-gray-600 leading-relaxed">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* 一覧に戻るリンク */}
      <div className="px-4 pb-6 max-w-3xl mx-auto text-center">
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 text-sm font-bold text-amber-700 hover:underline"
        >
          <ArrowLeft className="size-4" />
          {t("templatesDetail.backToList")}
        </Link>
      </div>

      {/* 他のテンプレートへのリンク（内部リンク強化） */}
      <section className="px-4 pb-24 max-w-3xl mx-auto">
        <h2 className="text-base font-extrabold text-gray-900 mb-3">
          {t("templatesDetail.related")}
        </h2>
        <RelatedTemplates currentSlug={seo.slug} categoryId={seo.categoryId} />
      </section>

      {/* JSON-LD: BreadcrumbList + FAQPage（serializeJsonLd が < をエスケープ） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([
            ...(content && content.faq.length > 0
              ? [faqPageSchema(content.faq)]
              : []),
            breadcrumbSchema([
              {
                name: "toban について",
                item: window.location.origin + "/about",
              },
              {
                name: "テンプレート一覧",
                item: window.location.origin + "/templates",
              },
              { name: template.name },
            ]),
          ]),
        }}
      />

      {/* 固定CTAボタン */}
      <a
        href={`/?template=${seo.templateIndex}`}
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-xl bg-[#2E6B4F] hover:bg-[#245A41] text-white font-bold px-5 py-3 shadow-lg transition-colors print:hidden"
      >
        {t("templatesDetail.createFromThis")}
        <ArrowRight className="size-4" />
      </a>
    </main>
  );
}

/** 同カテゴリの他テンプレート + 別カテゴリも表示 */
function RelatedTemplates({
  currentSlug,
  categoryId,
}: {
  currentSlug: string;
  categoryId: string;
}) {
  const sameCategory = TEMPLATE_SEO_DATA.filter(
    t => t.categoryId === categoryId && t.slug !== currentSlug
  );
  const otherCategory = TEMPLATE_SEO_DATA.filter(
    t => t.categoryId !== categoryId
  );
  const related = [
    ...sameCategory,
    ...otherCategory.slice(0, Math.max(0, 4 - sameCategory.length)),
  ].slice(0, 4);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {related.map(tpl => {
        const t = TEMPLATES[tpl.templateIndex];
        if (!t) return null;
        return (
          <Link
            key={tpl.slug}
            href={`/templates/${tpl.slug}`}
            className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-amber-300 transition-colors"
          >
            <span className="text-lg" aria-hidden="true">
              {t.emoji}
            </span>
            <span className="text-sm font-bold text-gray-700 group-hover:text-amber-700 transition-colors">
              {t.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
