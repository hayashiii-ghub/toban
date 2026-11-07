import { onMounted } from "vue";
import { defineView } from "@/lib/vue";
import { Link } from "@/lib/router";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORIES_EN,
  TEMPLATE_SEO_DATA,
  type TemplateSEO,
} from "@shared/seo-templates";
import { getTemplates } from "@shared/template-localization";
import { LpStickyCta } from "@/features/landing/LpStickyCta";
import { ChalkEdge, TemplateCard } from "@/features/landing/parts";
import { LP_COLORS as C, alpha } from "@/features/landing/theme";
import { MEMBER_PRESETS } from "@shared/appearance";
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

const TemplatesPage = defineView<object>([], () => {
  const t = useT();
  const { locale: localeRef } = useLocale();
  usePageMeta(() => ({
    title: t("templates.docTitle"),
    description: `${t("templates.subA")}${t("templates.subFree")}${t("templates.subB", { count: TEMPLATE_SEO_DATA.length })}`,
    path: "/templates",
  }));
  onMounted(() => window.scrollTo(0, 0));
  return () => {
    const locale = localeRef.value;
    const localizedTemplates = getTemplates(locale);
    // 画面のカードと ItemList は同じ並び・同じ条件（template が引けないものは出さない）で作る
    const categories = TEMPLATE_CATEGORIES.flatMap(cat => {
      const templates = (byCategory.get(cat.id) ?? []).flatMap(tpl => {
        const template = localizedTemplates[tpl.templateIndex];
        return template ? [{ tpl, template }] : [];
      });
      if (templates.length === 0) return [];
      const catEn =
        locale === "en" ? TEMPLATE_CATEGORIES_EN[cat.id] : undefined;
      return [
        {
          cat,
          label: catEn?.label ?? cat.label,
          description: catEn?.description ?? cat.description,
          templates,
        },
      ];
    });
    const listedTemplates = categories.flatMap(c =>
      c.templates.map(({ tpl, template }) => ({
        slug: tpl.slug,
        name: template.name,
      }))
    );

    return (
      <main class="lp lp-surface min-h-screen">
        {/* ── 黒板の見出し帯 ── */}
        <header
          class="relative px-4 pt-8 pb-12 sm:pt-10 sm:pb-14"
          style={{ backgroundColor: C.heroBg }}
        >
          <div class="max-w-4xl mx-auto">
            <nav aria-label={t("templates.breadcrumbAria")}>
              <ol
                class="flex flex-wrap items-center gap-1 text-xs"
                style={{ color: C.heroSubtext }}
              >
                <li>
                  <Link
                    href="/about"
                    class="underline underline-offset-4"
                    style={{ color: C.heroText }}
                  >
                    {t("footer.about")}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>{t("templates.breadcrumb")}</li>
              </ol>
            </nav>
            <h1
              class="mt-6 text-3xl sm:text-4xl leading-tight"
              style={{ color: C.heroText }}
            >
              {t("templates.heading")}
            </h1>
            <p
              class="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed"
              style={{ color: C.heroSubtext }}
            >
              {t("templates.subA")}
              <strong style={{ color: C.heroText }}>
                {t("templates.subFree")}
              </strong>
              {t("templates.subB", { count: TEMPLATE_SEO_DATA.length })}
            </p>
            <ul class="mt-6 -mx-4 px-4 flex gap-2 overflow-x-auto pb-1 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
              {categories.map(({ cat, label }) => (
                <li key={cat.id}>
                  <a
                    href={`#${cat.id}`}
                    class="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors"
                    style={{
                      backgroundColor: alpha(C.heroText, 12),
                      color: C.heroText,
                    }}
                  >
                    <span aria-hidden="true">{cat.emoji}</span>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <ChalkEdge />
        </header>

        {/* ── カテゴリ別テンプレート ── */}
        <div class="px-4 pt-12 pb-8 sm:pt-16 sm:pb-28">
          <div class="max-w-4xl mx-auto flex flex-col gap-14">
            {categories.map(({ cat, label, description, templates }, ci) => {
              const tone = MEMBER_PRESETS[ci % MEMBER_PRESETS.length];
              return (
                <section key={cat.id} id={cat.id} class="scroll-mt-6">
                  <div class="flex items-center gap-3 mb-2">
                    <span
                      aria-hidden="true"
                      class="size-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: tone.bgColor }}
                    >
                      {cat.emoji}
                    </span>
                    <h2 class="text-xl sm:text-2xl" style={{ color: C.text }}>
                      {label}
                    </h2>
                  </div>
                  <p class="text-sm mb-5" style={{ color: C.textMuted }}>
                    {description}
                  </p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(({ tpl, template }) => (
                      <TemplateCard
                        key={tpl.slug}
                        href={`/templates/${tpl.slug}`}
                        emoji={template.emoji}
                        name={template.name}
                        tasks={template.groups
                          .map(g => g.tasks.join(locale === "en" ? ", " : "、"))
                          .join(" / ")}
                        meta={
                          <>
                            {t(
                              `templateSummary.${template.assignmentMode === "task" ? "task" : "group"}.${template.groups.length === 1 ? "one" : "other"}`,
                              { count: template.groups.length }
                            )}
                            {locale === "en" ? " · " : "・"}
                            {locale === "en"
                              ? t(
                                  `templateSummary.member.${template.members.length === 1 ? "one" : "other"}`,
                                  { count: template.members.length }
                                )
                              : `${template.members.length}名`}
                          </>
                        }
                        tone={tone}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        {/* JSON-LD: BreadcrumbList + ItemList（serializeJsonLd が < をエスケープ） */}
        <script
          type="application/ld+json"
          innerHTML={serializeJsonLd([
            breadcrumbSchema([
              {
                name: t("footer.about"),
                item: window.location.origin + "/about",
              },
              { name: t("templates.breadcrumb") },
            ]),
            itemListSchema(
              listedTemplates.map(tpl => ({
                name: tpl.name,
                url: `${window.location.origin}/templates/${tpl.slug}`,
              }))
            ),
          ])}
        />

        <LpStickyCta href="/">{t("lp.createSchedule")}</LpStickyCta>
      </main>
    );
  };
});
export default TemplatesPage;
