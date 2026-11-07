import { computed, onMounted, watch } from "vue";
import { defineView } from "@/lib/vue";
import { useParams, Link } from "@/lib/router";
import { ArrowLeft } from "@lucide/vue";
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
import { getTemplates } from "@shared/template-localization";
import { LpStickyCta } from "@/features/landing/LpStickyCta";
import type { ScheduleTemplate } from "@/rotation/types";
import { useT, useLocale } from "@/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";

import NotFound from "./NotFound";
import { loadArticleAds } from "@/lib/articleAds";

const TemplateDetailPage = defineView<object>([], () => {
  const { locale } = useLocale();
  const params = useParams<{ slug: string }>();
  return () => {
    const slug = params.slug;
    const seo = slug ? TEMPLATE_SEO_MAP.get(slug) : undefined;
    const template = seo
      ? getTemplates(locale.value)[seo.templateIndex]
      : undefined;
    return !slug || !seo || !template ? (
      <NotFound />
    ) : (
      <TemplateDetailContent slug={slug} seo={seo} template={template} />
    );
  };
});
export default TemplateDetailPage;

interface TemplateDetailContentProps {
  slug: string;
  seo: TemplateSEO;
  template: ScheduleTemplate;
}
const TemplateDetailContent = defineView<TemplateDetailContentProps>(
  ["slug", "seo", "template"],
  props => {
    const t = useT();
    const { locale: localeRef } = useLocale();
    const contentRef = computed(() => TEMPLATE_CONTENT[props.seo.slug]);
    // ブランド名を付けると、SERP の幅で差別化語のほうが切れる。
    usePageMeta(() => {
      const en =
        localeRef.value === "en" ? TEMPLATE_SEO_EN[props.seo.slug] : undefined;
      return {
        title: en?.heading ?? props.seo.title,
        description: en?.intro ?? props.seo.description,
        path: `/templates/${props.slug}`,
      };
    });
    function loadAds() {
      if (contentRef.value?.body.length)
        loadArticleAds(`/templates/${props.slug}`);
    }
    onMounted(() => {
      window.scrollTo(0, 0);
      loadAds();
    });
    watch(() => props.slug, loadAds, { flush: "post" });
    return () => {
      const { seo, template } = props;
      const locale = localeRef.value;
      const category = TEMPLATE_CATEGORIES.find(
        category => category.id === seo.categoryId
      );
      const en = locale === "en" ? TEMPLATE_SEO_EN[seo.slug] : undefined;
      const heading = en?.heading ?? seo.heading;
      const intro = en?.intro ?? seo.intro;
      const content = contentRef.value;
      const catLabel = category
        ? locale === "en"
          ? (TEMPLATE_CATEGORIES_EN[category.id]?.label ?? category.label)
          : category.label
        : "";
      return (
        <main class="lp-surface min-h-screen">
          {/* パンくず */}
          <nav
            class="px-4 pt-6 pb-2 max-w-3xl mx-auto"
            aria-label={t("templates.breadcrumbAria")}
          >
            <ol class="flex flex-wrap items-center gap-1 text-xs text-lp-text-muted">
              <li>
                <Link href="/about" class="hover:underline text-lp-primary">
                  {t("footer.about")}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/templates" class="hover:underline text-lp-primary">
                  {t("templates.breadcrumb")}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li class="text-lp-text-secondary font-bold">{template.name}</li>
            </ol>
          </nav>

          {/* メインコンテンツ */}
          <article class="px-4 pb-8 max-w-3xl mx-auto">
            {/* カテゴリバッジ */}
            {category && (
              <div class="mb-3">
                <span class="inline-block text-xs font-bold text-lp-primary bg-lp-highlight/40 rounded-full px-3 py-1">
                  {category.emoji} {catLabel}
                </span>
              </div>
            )}

            <h1 class="text-2xl sm:text-3xl font-extrabold text-lp-text leading-tight">
              {heading}
            </h1>

            <p class="mt-4 text-sm sm:text-base text-lp-text-secondary leading-relaxed">
              {intro}
            </p>
          </article>

          {/* テンプレート内容プレビュー */}
          <section class="px-4 pb-10 max-w-3xl mx-auto">
            <h2 class="text-lg font-extrabold text-lp-text mb-4">
              {t("templatesDetail.contents")}
            </h2>

            {/* グループ/タスク一覧 */}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {template.groups.map((group, i) => (
                <div
                  key={group.id}
                  class="rounded-xl border border-lp-line bg-lp-card p-4"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-xl" aria-hidden="true">
                      {group.emoji}
                    </span>
                    <h3 class="text-sm font-bold text-lp-text">
                      {template.assignmentMode === "task"
                        ? t("templatesDetail.taskN", { n: i + 1 })
                        : t("templatesDetail.groupN", { n: i + 1 })}
                    </h3>
                  </div>
                  <ul class="flex flex-col gap-1">
                    {group.tasks.map(task => (
                      <li
                        key={task}
                        class="text-sm text-lp-text-secondary flex items-start gap-2"
                      >
                        <span class="text-lp-primary mt-0.5">-</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* メンバー例 */}
            <div class="mt-6">
              <h3 class="text-sm font-bold text-lp-text-secondary mb-2">
                {t("templatesDetail.memberExample", {
                  count: template.members.length,
                })}
              </h3>
              <div class="flex flex-wrap gap-2">
                {template.members.map(member => (
                  <span
                    key={member.id}
                    class="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
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
              <p class="text-xs text-lp-text-muted mt-2">
                {t("templatesDetail.editNote")}
              </p>
            </div>
          </section>

          {/* 本文（テンプレート固有の運用解説） */}
          {content && (
            <section lang="ja" class="px-4 pb-10 max-w-3xl mx-auto">
              {locale === "en" && (
                <p lang="en" class="text-sm text-lp-text-secondary mb-4">
                  {t("templatesDetail.japaneseContentNote")}
                </p>
              )}
              {content.body.map(section => (
                <div key={section.heading} class="mb-8 last:mb-0">
                  <h2 class="text-lg font-extrabold text-lp-text mb-3">
                    {section.heading}
                  </h2>
                  {section.paragraphs.map((paragraph, i) => (
                    <p
                      key={i}
                      class="text-sm sm:text-base text-lp-text-secondary leading-relaxed mb-3 last:mb-0"
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
            <section lang="ja" class="px-4 pb-10 max-w-3xl mx-auto">
              <h2 class="text-lg font-extrabold text-lp-text mb-4">
                {seo.heading}のよくある質問
              </h2>
              <dl>
                {content.faq.map(item => (
                  <div
                    key={item.question}
                    class="rounded-xl border border-lp-line bg-lp-card p-4 mb-3 last:mb-0"
                  >
                    <dt class="text-sm font-bold text-lp-text mb-2">
                      {item.question}
                    </dt>
                    <dd class="text-sm text-lp-text-secondary leading-relaxed">
                      {item.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* 一覧に戻るリンク */}
          <div class="px-4 pb-6 max-w-3xl mx-auto text-center">
            <Link
              href="/templates"
              class="inline-flex items-center gap-2 text-sm font-bold text-lp-primary hover:underline"
            >
              <ArrowLeft class="size-4" />
              {t("templatesDetail.backToList")}
            </Link>
          </div>

          {/* 他のテンプレートへのリンク（内部リンク強化） */}
          <section class="px-4 pb-8 sm:pb-24 max-w-3xl mx-auto">
            <h2 class="text-base font-extrabold text-lp-text mb-3">
              {t("templatesDetail.related")}
            </h2>
            <RelatedTemplates
              currentSlug={seo.slug}
              categoryId={seo.categoryId}
            />
          </section>

          {/* JSON-LD: BreadcrumbList + FAQPage（serializeJsonLd が < をエスケープ） */}
          <script
            type="application/ld+json"
            innerHTML={serializeJsonLd([
              ...(content && content.faq.length > 0
                ? [faqPageSchema(content.faq)]
                : []),
              breadcrumbSchema([
                {
                  name: t("footer.about"),
                  item: window.location.origin + "/about",
                },
                {
                  name: t("templates.breadcrumb"),
                  item: window.location.origin + "/templates",
                },
                { name: template.name },
              ]),
            ])}
          />

          <LpStickyCta href={`/?template=${seo.templateIndex}`}>
            {t("templatesDetail.createFromThis")}
          </LpStickyCta>
        </main>
      );
    };
  }
);

/** 同カテゴリの他テンプレート + 別カテゴリも表示 */
interface RelatedTemplatesProps {
  currentSlug: string;
  categoryId: string;
}
const RelatedTemplates = defineView<RelatedTemplatesProps>(
  ["currentSlug", "categoryId"],
  props => {
    const { locale: localeRef } = useLocale();
    return () => {
      const { currentSlug, categoryId } = props;
      const locale = localeRef.value;
      const localizedTemplates = getTemplates(locale);
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
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {related.map(tpl => {
            const t = localizedTemplates[tpl.templateIndex];
            if (!t) return null;
            return (
              <Link
                key={tpl.slug}
                href={`/templates/${tpl.slug}`}
                class="group flex items-center gap-3 rounded-lg border border-lp-line bg-lp-card p-3 hover:border-lp-primary transition-colors"
              >
                <span class="text-lg" aria-hidden="true">
                  {t.emoji}
                </span>
                <span class="text-sm font-bold text-lp-text-secondary group-hover:text-lp-primary transition-colors">
                  {t.name}
                </span>
              </Link>
            );
          })}
        </div>
      );
    };
  }
);
