import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { JUNBAN_PAGE_SEO, JUNBAN_PAGE_SEO_EN } from "@shared/seo-templates";
import {
  faqPageSchema,
  breadcrumbSchema,
  serializeJsonLd,
} from "@shared/jsonLd";
import type { Member, TaskGroup } from "@/rotation/types";
import { RotationDisc } from "@/features/home/RotationDisc";
import { LpCtaLink } from "@/features/landing/LpCtaLink";
import { useT, useLocale } from "@/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";

// 円盤の実例（show don't tell）。表現可能な構成（担当者数 ≧ 当番数）にする。
const SAMPLE_MEMBERS: Member[] = [
  {
    id: "s1",
    name: "たろう",
    color: "#2E6B4F",
    bgColor: "#DCFCE7",
    textColor: "#14532D",
  },
  {
    id: "s2",
    name: "はなこ",
    color: "#B45309",
    bgColor: "#FEF3C7",
    textColor: "#7C2D12",
  },
  {
    id: "s3",
    name: "ゆうき",
    color: "#1D4ED8",
    bgColor: "#DBEAFE",
    textColor: "#1E3A8A",
  },
];
const SAMPLE_GROUPS: TaskGroup[] = [
  { id: "g1", tasks: ["そうじ"], emoji: "🧹" },
  { id: "g2", tasks: ["はいぜん"], emoji: "🍚" },
  { id: "g3", tasks: ["にっちょく"], emoji: "📋" },
];

export default function JunbanPage() {
  const t = useT();
  const { locale } = useLocale();
  const seo = locale === "en" ? JUNBAN_PAGE_SEO_EN : JUNBAN_PAGE_SEO;
  usePageMeta({
    title: seo.title,
    description: seo.description,
    path: JUNBAN_PAGE_SEO.path,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--lp-bg)" }}>
      {/* パンくず */}
      <nav
        className="px-4 pt-6 pb-2 max-w-3xl mx-auto"
        aria-label={t("templates.breadcrumbAria")}
      >
        <ol className="flex flex-wrap items-center gap-1 text-xs text-lp-text-muted">
          <li>
            <Link href="/about" className="hover:underline text-lp-primary">
              {t("footer.about")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-lp-text-secondary font-bold">{seo.heading}</li>
        </ol>
      </nav>

      <article className="px-4 pb-8 max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-lp-text leading-tight">
          {seo.heading}
        </h1>
        <p className="mt-4 text-sm sm:text-base text-lp-text-secondary leading-relaxed">
          {seo.intro}
        </p>

        <ul className="mt-6 flex flex-col gap-2">
          {seo.benefits.map(b => (
            <li
              key={b}
              className="text-sm sm:text-base text-lp-text-secondary flex items-start gap-2"
            >
              <span className="text-lp-primary mt-0.5" aria-hidden="true">
                ●
              </span>
              {b}
            </li>
          ))}
        </ul>
      </article>

      {/* 円盤の実例 */}
      <section className="px-4 pb-10 max-w-2xl mx-auto">
        <div className="rounded-2xl border border-lp-line bg-lp-card p-4 sm:p-6">
          <RotationDisc
            groups={SAMPLE_GROUPS}
            members={SAMPLE_MEMBERS}
            rotation={0}
            assignmentMode="member"
          />
        </div>
      </section>

      {/* CTA: 円盤ビューへ直接着地 */}
      <div className="px-4 pb-10 max-w-3xl mx-auto text-center">
        <LpCtaLink href="/?view=disc">
          {locale === "en"
            ? "Decide order with the wheel"
            : "円盤ビューで順番を決める"}
        </LpCtaLink>
      </div>

      {/* FAQ */}
      <section className="px-4 pb-10 max-w-3xl mx-auto">
        <h2 className="text-lg font-extrabold text-lp-text mb-4">
          {t("lp.faqHeading")}
        </h2>
        <dl className="flex flex-col gap-4">
          {seo.faq.map(f => (
            <div
              key={f.question}
              className="rounded-xl border border-lp-line bg-lp-card p-4"
            >
              <dt className="text-sm font-bold text-lp-text mb-1">
                {f.question}
              </dt>
              <dd className="text-sm text-lp-text-secondary leading-relaxed">
                {f.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="px-4 pb-24 max-w-3xl mx-auto text-center">
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 text-sm font-bold text-lp-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          {t("templates.breadcrumb")}
        </Link>
      </div>

      {/* JSON-LD: FAQPage + BreadcrumbList（serializeJsonLd が < をエスケープ） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([
            faqPageSchema(seo.faq),
            breadcrumbSchema([
              {
                name: "toban について",
                item: window.location.origin + "/about",
              },
              { name: seo.heading },
            ]),
          ]),
        }}
      />
    </main>
  );
}
