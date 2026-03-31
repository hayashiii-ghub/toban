import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { ArrowRight, ArrowLeft, Printer, RotateCcw, Share2, Users } from "lucide-react";
import {
  TEMPLATE_SEO_MAP,
  TEMPLATE_SEO_DATA,
  COMMON_FAQ,
  TEMPLATE_CATEGORIES,
} from "@shared/seo-templates";
import { TEMPLATES } from "@/rotation/constants";

import NotFound from "./NotFound";

export default function TemplateDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const seo = slug ? TEMPLATE_SEO_MAP.get(slug) : undefined;
  const template = seo ? TEMPLATES[seo.templateIndex] : undefined;
  const category = seo
    ? TEMPLATE_CATEGORIES.find((c) => c.id === seo.categoryId)
    : undefined;

  useEffect(() => {
    if (seo) {
      document.title = seo.title + "｜toban（トバン）";
    }
    return () => {
      document.title = "toban（トバン）｜無料で当番表を作成・印刷・共有";
    };
  }, [seo]);

  if (!seo || !template) return <NotFound />;

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FFF8E7" }}>
      {/* パンくず */}
      <nav className="px-4 pt-6 pb-2 max-w-3xl mx-auto" aria-label="パンくず">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
          <li><Link href="/" className="hover:underline text-amber-700">toban</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/templates" className="hover:underline text-amber-700">テンプレート一覧</Link></li>
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
              {category.emoji} {category.label}
            </span>
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
          {seo.heading}
        </h1>

        <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
          {seo.intro}
        </p>

        {/* CTA */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href={`/app?template=${seo.templateIndex}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 shadow-md transition-colors"
          >
            このテンプレートで当番表を作る
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </article>

      {/* テンプレート内容プレビュー */}
      <section className="px-4 pb-10 max-w-3xl mx-auto">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">
          テンプレートの内容
        </h2>

        {/* グループ/タスク一覧 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {template.groups.map((group, i) => (
            <div
              key={group.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl" aria-hidden="true">{group.emoji}</span>
                <h3 className="text-sm font-bold text-gray-800">
                  {template.assignmentMode === "task"
                    ? `タスク ${i + 1}`
                    : `グループ ${i + 1}`}
                </h3>
              </div>
              <ul className="flex flex-col gap-1">
                {group.tasks.map((task) => (
                  <li key={task} className="text-sm text-gray-600 flex items-start gap-2">
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
            メンバー例（{template.members.length}名）
          </h3>
          <div className="flex flex-wrap gap-2">
            {template.members.map((member) => (
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
            ※ メンバー名・人数・色は自由に編集できます。
          </p>
        </div>
      </section>

      {/* 機能紹介 */}
      <section className="px-4 pb-10 max-w-3xl mx-auto">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">
          tobanの特徴
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              icon: RotateCcw,
              title: "自動ローテーション",
              desc: "日付モードを設定すれば、開始日と周期に基づいて自動的に担当が切り替わります。土日祝のスキップにも対応。",
            },
            {
              icon: Printer,
              title: "きれいに印刷",
              desc: "カード・一覧表・カレンダーの3つの表示形式を、そのまま印刷または画像保存できます。",
            },
            {
              icon: Share2,
              title: "URLで簡単共有",
              desc: "閲覧用URLを発行すれば、LINEやメールで当番表を共有可能。QRコードも生成できます。",
            },
            {
              icon: Users,
              title: "柔軟なカスタマイズ",
              desc: "グループ・タスク・メンバーは自由に追加・削除・並べ替え。9種類のデザインテーマで見た目も変えられます。",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-gray-200 bg-white p-4 flex gap-3"
            >
              <Icon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-gray-800">{title}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pb-10 max-w-3xl mx-auto">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">
          よくある質問
        </h2>
        <dl className="flex flex-col gap-3">
          {COMMON_FAQ.map((faq) => (
            <div key={faq.question} className="rounded-xl bg-white border border-gray-200 p-4">
              <dt className="text-sm font-bold text-gray-900">{faq.question}</dt>
              <dd className="text-sm text-gray-600 mt-2 leading-relaxed">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 下部CTA */}
      <div className="px-4 pb-6 max-w-3xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-center">
        <a
          href={`/app?template=${seo.templateIndex}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 shadow-md transition-colors"
        >
          このテンプレートで当番表を作る
          <ArrowRight className="w-4 h-4" />
        </a>
        <Link
          href="/templates"
          className="inline-flex items-center gap-2 text-sm font-bold text-amber-700 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          テンプレート一覧に戻る
        </Link>
      </div>

      {/* 他のテンプレートへのリンク（内部リンク強化） */}
      <section className="px-4 pb-16 max-w-3xl mx-auto">
        <h2 className="text-base font-extrabold text-gray-900 mb-3">
          関連するテンプレート
        </h2>
        <RelatedTemplates currentSlug={seo.slug} categoryId={seo.categoryId} />
      </section>

      {/* JSON-LD: FAQPage + BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: COMMON_FAQ.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "toban",
                  item: window.location.origin + "/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "テンプレート一覧",
                  item: window.location.origin + "/templates",
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: template.name,
                },
              ],
            },
          ]),
        }}
      />
    </main>
  );
}

/** 同カテゴリの他テンプレート + 別カテゴリも表示 */
function RelatedTemplates({ currentSlug, categoryId }: { currentSlug: string; categoryId: string }) {
  const sameCategory = TEMPLATE_SEO_DATA.filter(
    (t) => t.categoryId === categoryId && t.slug !== currentSlug,
  );
  const otherCategory = TEMPLATE_SEO_DATA.filter(
    (t) => t.categoryId !== categoryId,
  );
  const related = [...sameCategory, ...otherCategory.slice(0, Math.max(0, 4 - sameCategory.length))].slice(0, 4);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {related.map((tpl) => {
        const t = TEMPLATES[tpl.templateIndex];
        if (!t) return null;
        return (
          <Link
            key={tpl.slug}
            href={`/templates/${tpl.slug}`}
            className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-amber-300 transition-colors"
          >
            <span className="text-lg" aria-hidden="true">{t.emoji}</span>
            <span className="text-sm font-bold text-gray-700 group-hover:text-amber-700 transition-colors">{t.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
