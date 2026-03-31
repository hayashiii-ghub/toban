import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  ChevronDown,
  Send,
  Loader2,
} from "lucide-react";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_SEO_DATA,
  COMMON_FAQ,
} from "@shared/seo-templates";
import { TEMPLATES } from "@/rotation/constants";
import "./landing.css";

// 黒板テーマカラー
const C = {
  pageBg: "#F5F0E8",
  primary: "#2E6B4F",
  primaryHover: "#245A41",
  cardBg: "#ffffff",
  text: "#2A3A30",
  textSecondary: "#4A6050",
  textMuted: "#708878",
  border: "#C2CCBA",
  highlight: "#A8D8B8",
  heroBg: "#2E6B4F",
  heroText: "#ffffff",
  heroSubtext: "#D0E8DC",
} as const;

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const honeypot = (document.getElementById("contact-url") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, url: honeypot }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="border p-6 sm:p-8 text-center" style={{ borderColor: C.border, backgroundColor: C.cardBg, borderRadius: "6px" }}>
        <p className="text-lg font-bold" style={{ color: C.primary }}>送信しました</p>
        <p className="text-sm mt-2" style={{ color: C.textSecondary }}>
          お問い合わせいただきありがとうございます。内容を確認のうえ、ご返信いたします。
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-bold underline"
          style={{ color: C.primary }}
        >
          別の内容を送信する
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* ハニーポット: CSS で非表示。bot が自動入力すると送信をスキップ */}
      <div aria-hidden="true" className="absolute opacity-0 h-0 overflow-hidden pointer-events-none" tabIndex={-1}>
        <label htmlFor="contact-url">URL</label>
        <input id="contact-url" name="url" type="text" autoComplete="off" tabIndex={-1} />
      </div>
      <div>
        <label htmlFor="contact-name" className="block text-sm font-bold mb-1" style={{ color: C.text }}>
          お名前
        </label>
        <input
          id="contact-name"
          type="text"
          required
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-shadow"
          style={{ borderColor: C.border, color: C.text }}
          placeholder="山田 太郎"
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="block text-sm font-bold mb-1" style={{ color: C.text }}>
          メールアドレス
        </label>
        <input
          id="contact-email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-shadow"
          style={{ borderColor: C.border, color: C.text }}
          placeholder="example@email.com"
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm font-bold mb-1" style={{ color: C.text }}>
          お問い合わせ内容
        </label>
        <textarea
          id="contact-message"
          required
          maxLength={1000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-shadow resize-y"
          style={{ borderColor: C.border, color: C.text }}
          placeholder="不具合の報告や機能のご要望など、お気軽にお書きください。"
        />
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">
          送信に失敗しました。しばらくしてからお試しください。
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center gap-2 rounded-xl font-bold px-6 py-3 text-white transition-colors disabled:opacity-60"
        style={{ backgroundColor: C.primary }}
      >
        {status === "sending" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {status === "sending" ? "送信中…" : "送信する"}
      </button>
    </form>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border overflow-hidden" style={{ borderColor: C.border, backgroundColor: C.cardBg, borderRadius: "6px" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-bold pr-4" style={{ color: C.text }}>{question}</span>
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ color: C.textMuted, transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>{answer}</p>
        </div>
      )}
    </div>
  );
}

// カテゴリから代表テンプレートを抜粋（各カテゴリ1つずつ、最大6つ）
const featuredTemplates = TEMPLATE_CATEGORIES
  .map((cat) => TEMPLATE_SEO_DATA.find((t) => t.categoryId === cat.id))
  .filter(Boolean)
  .slice(0, 6);

export default function LandingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "toban（トバン）｜無料で当番表を作成・印刷・共有";
  }, []);

  return (
    <main className="lp min-h-screen" style={{ backgroundColor: C.pageBg, fontFamily: "'M PLUS Rounded 1c', sans-serif" }}>
      {/* ── ヒーロー ── */}
      <section
        className="px-4 py-16 sm:py-24 text-center"
        style={{ backgroundColor: C.heroBg }}
      >
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight"
          style={{ color: C.heroText }}
        >
          かんたん当番表、
          <br className="sm:hidden" />
          すぐ完成。
        </h1>
        <p
          className="mt-4 text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
          style={{ color: C.heroSubtext }}
        >
          掃除当番・給食当番・日直のローテーション表を
          <br className="hidden sm:block" />
          無料でかんたんに作成・印刷・共有できます。
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center max-w-md sm:max-w-none mx-auto">
          <Link
            href="/templates"
            className="inline-flex items-center justify-center gap-2 rounded-xl font-bold px-8 py-3 text-base sm:text-lg border-2 transition-colors"
            style={{ borderColor: C.heroSubtext, color: C.heroSubtext }}
          >
            テンプレートを見る
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl font-bold px-8 py-3 text-base sm:text-lg shadow-lg transition-colors"
            style={{ backgroundColor: C.heroText, color: C.primary }}
          >
            当番表を作る
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── 特徴 ── */}
      <section className="px-4 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-extrabold text-center mb-8" style={{ color: C.text }}>
            tobanの特徴
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { emoji: "📝", label: "登録不要", desc: "アカウント不要。ブラウザだけで完結します。" },
              { emoji: "🖨️", label: "印刷がきれい", desc: "カード・一覧表・カレンダーの3形式で印刷できます。" },
              { emoji: "🔗", label: "URLで共有", desc: "共有URLを発行してLINEやメールで送れます。" },
              { emoji: "🆓", label: "完全無料", desc: "すべての機能を無料でお使いいただけます。" },
            ].map(({ label, emoji, desc }) => (
              <div
                key={label}
                className="overflow-hidden"
                style={{
                  border: `1.5px solid ${C.border}`,
                  borderRadius: "6px",
                  backgroundColor: C.cardBg,
                  boxShadow: "0 2px 8px rgba(46, 107, 79, 0.1)",
                }}
              >
                {/* ヘッダー（アプリのカード上部と同じスタイル） */}
                <div
                  className="px-3 py-3 sm:py-4 text-center"
                  style={{ backgroundColor: "color-mix(in srgb, #F5F0E8 60%, #ffffff)" }}
                >
                  <div className="text-3xl sm:text-4xl mb-1" aria-hidden="true">{emoji}</div>
                  <div className="text-sm sm:text-base" style={{ color: C.text, fontWeight: 800 }}>{label}</div>
                </div>
                {/* ボディ */}
                <div className="px-3 py-2.5 sm:py-3">
                  <div
                    className="lp-pretty text-xs leading-relaxed px-1.5 py-1.5 text-center"
                    style={{
                      backgroundColor: `${C.highlight}40`,
                      borderRadius: "4px",
                      border: `2px solid ${C.primary}20`,
                      color: C.textSecondary,
                    }}
                  >
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── テンプレート紹介 ── */}
      <section className="px-4 py-12 sm:py-16" style={{ backgroundColor: `${C.primary}08` }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-extrabold text-center mb-2" style={{ color: C.text }}>
            すぐ使えるテンプレート
          </h2>
          <p className="text-sm text-center mb-8" style={{ color: C.textMuted }}>
            {TEMPLATE_SEO_DATA.length}種類のテンプレートから選んで、メンバーを入れるだけ。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredTemplates.map((tpl) => {
              if (!tpl) return null;
              const template = TEMPLATES[tpl.templateIndex];
              if (!template) return null;
              return (
                <Link
                  key={tpl.slug}
                  href={`/templates/${tpl.slug}`}
                  className="group flex items-start gap-3 border p-4 transition-all duration-150 hover:shadow-md"
                  style={{ borderColor: C.border, backgroundColor: C.cardBg, borderRadius: "6px" }}
                >
                  <span className="text-2xl flex-shrink-0">{template.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold group-hover:underline" style={{ color: C.text }}>
                      {template.name}
                    </div>
                    <div className="text-xs mt-1 line-clamp-2" style={{ color: C.textMuted }}>
                      {template.groups.map((g) => g.tasks.join("、")).join(" / ")}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.primary }} />
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/templates"
              className="inline-flex items-center gap-1 text-sm font-bold underline"
              style={{ color: C.primary }}
            >
              テンプレート一覧を見る
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Q&A ── */}
      <section className="px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-extrabold text-center mb-8" style={{ color: C.text }}>
            よくある質問
          </h2>
          <div className="flex flex-col gap-3">
            {COMMON_FAQ.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ── お問い合わせ ── */}
      <section id="contact" className="px-4 py-12 sm:py-16" style={{ backgroundColor: `${C.primary}08` }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-extrabold text-center mb-2" style={{ color: C.text }}>
            お問い合わせ
          </h2>
          <p className="text-sm text-center mb-8" style={{ color: C.textMuted }}>
            不具合の報告や機能のご要望など、お気軽にご連絡ください。
          </p>
          <div className="border p-4 sm:p-6" style={{ borderColor: C.border, backgroundColor: C.cardBg, borderRadius: "6px" }}>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "toban",
              url: "https://toban.app",
              description: "掃除当番・給食当番・日直のローテーション表を無料で作成・印刷・共有できるWebアプリ",
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "All",
              offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: COMMON_FAQ.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            },
          ]),
        }}
      />
    </main>
  );
}
