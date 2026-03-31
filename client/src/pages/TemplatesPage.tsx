import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, FileText, Printer, Share2, RotateCcw } from "lucide-react";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_SEO_DATA,
  COMMON_FAQ,
  type TemplateSEO,
} from "@shared/seo-templates";
import { TEMPLATES } from "@/rotation/constants";

const byCategory = new Map<string, TemplateSEO[]>();
for (const cat of TEMPLATE_CATEGORIES) byCategory.set(cat.id, []);
for (const t of TEMPLATE_SEO_DATA) byCategory.get(t.categoryId)?.push(t);

export default function TemplatesPage() {
  useEffect(() => {
    document.title = "当番表テンプレート一覧｜無料で使えるtoban（トバン）";
    return () => {
      document.title = "toban（トバン）｜無料で当番表を作成・印刷・共有";
    };
  }, []);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FFF8E7" }}>
      {/* ヘッダー */}
      <div className="px-4 pt-8 pb-6 text-center">
        <Link href="/" className="inline-block mb-4 text-sm font-bold text-amber-700 hover:underline">
          ← toban トップへ
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
          当番表テンプレート一覧
        </h1>
        <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          掃除当番・給食当番・日直など、すぐ使える<strong>無料テンプレート</strong>を{TEMPLATE_SEO_DATA.length}種類ご用意しました。
          テンプレートを選んで、メンバーや担当を自由に編集するだけで当番表が完成します。
        </p>
      </div>

      {/* 特徴セクション */}
      <div className="px-4 pb-8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: FileText, label: "登録不要", sub: "ブラウザだけで完結" },
            { icon: Printer, label: "印刷対応", sub: "画像保存もOK" },
            { icon: Share2, label: "URL共有", sub: "QRコードも対応" },
            { icon: RotateCcw, label: "自動ローテーション", sub: "日付で自動切替" },
          ].map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="rounded-xl border border-amber-200 bg-white/80 p-3 text-center"
            >
              <Icon className="w-5 h-5 mx-auto mb-1 text-amber-600" />
              <div className="text-sm font-bold text-gray-800">{label}</div>
              <div className="text-xs text-gray-500">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* カテゴリ別テンプレート */}
      <div className="px-4 pb-12">
        <div className="max-w-4xl mx-auto flex flex-col gap-10">
          {TEMPLATE_CATEGORIES.map((cat) => {
            const templates = byCategory.get(cat.id);
            if (!templates || templates.length === 0) return null;
            return (
              <section key={cat.id} id={cat.id}>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 mb-1">
                  <span className="mr-2">{cat.emoji}</span>
                  {cat.label}
                </h2>
                <p className="text-sm text-gray-500 mb-4">{cat.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map((tpl) => {
                    const template = TEMPLATES[tpl.templateIndex];
                    if (!template) return null;
                    return (
                      <Link
                        key={tpl.slug}
                        href={`/templates/${tpl.slug}`}
                        className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-150"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0" aria-hidden="true">
                            {template.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-extrabold text-gray-900 group-hover:text-amber-700 transition-colors">
                              {template.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {template.groups.map((g) => g.tasks.join("、")).join(" / ")}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {template.groups.length}
                              {template.assignmentMode === "task" ? "タスク" : "グループ"}
                              ・{template.members.length}名
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 flex-shrink-0 mt-1 transition-colors" />
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

      {/* FAQ */}
      <div className="px-4 pb-16 bg-amber-50/50">
        <div className="max-w-3xl mx-auto pt-10">
          <h2 className="text-lg font-extrabold text-gray-900 mb-6 text-center">
            よくある質問
          </h2>
          <dl className="flex flex-col gap-4">
            {COMMON_FAQ.map((faq) => (
              <div key={faq.question} className="rounded-xl bg-white border border-gray-200 p-4">
                <dt className="text-sm font-bold text-gray-900">{faq.question}</dt>
                <dd className="text-sm text-gray-600 mt-2 leading-relaxed">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-12 text-center">
        <a
          href="/app"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 shadow-md transition-colors"
        >
          当番表を作成する
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* JSON-LD: FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
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
          }),
        }}
      />
    </main>
  );
}
