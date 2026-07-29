import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  ChevronDown,
  Send,
  Loader2,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_SEO_DATA,
  COMMON_FAQ,
  COMMON_FAQ_EN,
} from "@shared/seo-templates";
import { faqPageSchema, serializeJsonLd } from "@shared/jsonLd";
import { CONTACT_CATEGORIES } from "@shared/schemas";
import { LIMITS } from "@shared/limits";
import { TEMPLATES } from "@/rotation/constants";
import { useT, useLocale } from "@/i18n";
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

const SHARE_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/about`
    : "https://toban.shigoto.dev/about";

function ShareDropdown({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const shareText = t("lp.shareText");

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      toast.success(t("lp.urlCopied"));
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1000);
    } catch {
      toast.error(t("lp.copyFailed"));
    }
  };

  const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(shareText)}`;
  const xShareUrl = `https://x.com/intent/tweet?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(shareText)}`;

  return (
    <>
      <button
        type="button"
        aria-label={t("lp.shareMenuClose")}
        className="fixed inset-0 z-40 cursor-default"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 mt-2 z-50 w-56 rounded-xl shadow-lg border overflow-hidden"
        style={{ backgroundColor: "#fff", borderColor: C.border }}
      >
        <a
          href={lineShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-gray-50 transition-colors"
          style={{ color: "#06C755" }}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          {t("share.lineShare")}
        </a>
        <a
          href={xShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-gray-50 transition-colors"
          style={{ color: C.text }}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          {t("lp.shareX")}
        </a>
        <button
          type="button"
          onClick={handleCopyUrl}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-gray-50 transition-colors"
          style={{ color: C.text }}
        >
          {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
          {t("share.copyUrl")}
        </button>
      </div>
    </>
  );
}

function ContactForm() {
  const t = useT();
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const honeypot =
      (document.getElementById("contact-url") as HTMLInputElement | null)
        ?.value ?? "";
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, email, message, url: honeypot }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setCategory("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div
        className="border p-6 sm:p-8 text-center"
        style={{
          borderColor: C.border,
          backgroundColor: C.cardBg,
          borderRadius: "6px",
        }}
      >
        <p className="text-lg font-bold" style={{ color: C.primary }}>
          {t("contact.sent")}
        </p>
        <p className="text-sm mt-2" style={{ color: C.textSecondary }}>
          {t("contact.sentDetail")}
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-bold underline"
          style={{ color: C.primary }}
        >
          {t("contact.sendAnother")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* ハニーポット: CSS で非表示。bot が自動入力すると送信をスキップ */}
      <div
        aria-hidden="true"
        className="absolute opacity-0 h-0 overflow-hidden pointer-events-none"
        tabIndex={-1}
      >
        <label htmlFor="contact-url">URL</label>
        <input
          id="contact-url"
          name="url"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          aria-label="URL (honeypot)"
        />
      </div>
      <div>
        <label
          htmlFor="contact-category"
          className="block text-sm font-bold mb-1"
          style={{ color: C.text }}
        >
          {t("contact.categoryLabel")}
        </label>
        <select
          id="contact-category"
          required
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-shadow"
          style={{
            borderColor: C.border,
            backgroundColor: C.cardBg,
            color: category ? C.text : C.textSecondary,
          }}
          aria-label={t("contact.categoryLabel")}
        >
          <option value="" disabled>
            {t("contact.selectPlaceholder")}
          </option>
          {CONTACT_CATEGORIES.map(c => (
            <option key={c} value={c} style={{ color: C.text }}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="contact-email"
          className="block text-sm font-bold mb-1"
          style={{ color: C.text }}
        >
          {t("contact.emailLabel")}
        </label>
        <input
          id="contact-email"
          type="email"
          required
          maxLength={LIMITS.contactEmail}
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-shadow"
          style={{ borderColor: C.border, color: C.text }}
          placeholder="example@email.com"
          aria-label={t("contact.emailLabel")}
        />
      </div>
      <div>
        <label
          htmlFor="contact-message"
          className="block text-sm font-bold mb-1"
          style={{ color: C.text }}
        >
          {t("contact.messageLabel")}
        </label>
        <textarea
          id="contact-message"
          required
          maxLength={LIMITS.contactMessage}
          rows={5}
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-shadow resize-y"
          style={{ borderColor: C.border, color: C.text }}
          placeholder={t("contact.messagePlaceholder")}
          aria-label={t("contact.messageLabel")}
        />
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">{t("contact.error")}</p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center gap-2 rounded-xl font-bold px-6 py-3 text-white transition-colors disabled:opacity-60"
        style={{ backgroundColor: C.primary }}
      >
        {status === "sending" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {status === "sending" ? t("contact.sending") : t("contact.submit")}
      </button>
    </form>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border overflow-hidden"
      style={{
        borderColor: C.border,
        backgroundColor: C.cardBg,
        borderRadius: "6px",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-bold pr-4" style={{ color: C.text }}>
          {question}
        </span>
        <ChevronDown
          className="size-4 flex-shrink-0 transition-transform"
          style={{
            color: C.textMuted,
            transform: open ? "rotate(180deg)" : undefined,
          }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p
            className="text-sm leading-relaxed"
            style={{ color: C.textSecondary }}
          >
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}

// カテゴリから代表テンプレートを抜粋（各カテゴリ1つずつ、最大6つ）
const featuredTemplates = TEMPLATE_CATEGORIES.flatMap(cat => {
  const t = TEMPLATE_SEO_DATA.find(t => t.categoryId === cat.id);
  return t ? [t] : [];
}).slice(0, 6);

export default function LandingPage() {
  const t = useT();
  const { locale } = useLocale();
  const faqs = locale === "en" ? COMMON_FAQ_EN : COMMON_FAQ;
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = t("lp.docTitle");
  }, [t]);

  useEffect(() => {
    if (!showShareMenu) return;
    const close = () => setShowShareMenu(false);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [showShareMenu]);

  const isMobile =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|Android/i.test(navigator.userAgent);

  const handleShare = async () => {
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: t("lp.shareTitle"),
          text: t("lp.shareText"),
          url: SHARE_URL,
        });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    setShowShareMenu(prev => !prev);
  };

  return (
    <main
      className="lp min-h-screen"
      style={{ backgroundColor: C.pageBg, fontFamily: "'Kiwi Maru', serif" }}
    >
      {/* ── ヒーロー ── */}
      <section
        className="px-4 py-16 sm:py-24 text-center"
        style={{ backgroundColor: C.heroBg }}
      >
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight"
          style={{ color: C.heroText }}
        >
          {t("lp.heroTitleA")}
          <br className="sm:hidden" />
          {t("lp.heroTitleB")}
        </h1>
        <p
          className="mt-4 text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
          style={{ color: C.heroSubtext }}
        >
          {t("lp.heroSubA")}
          <br className="hidden sm:block" />
          {t("lp.heroSubB")}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center max-w-md sm:max-w-none mx-auto">
          <div className="relative">
            <button
              type="button"
              onClick={handleShare}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl font-bold px-8 py-3 text-base sm:text-lg border-2 transition-colors cursor-pointer min-w-[200px] sm:min-w-[220px]"
              style={{ borderColor: C.heroText, color: C.heroText }}
            >
              <Share2 className="size-5" />
              {t("lp.shareToban")}
            </button>
            {showShareMenu && (
              <ShareDropdown onClose={() => setShowShareMenu(false)} />
            )}
          </div>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl font-bold px-8 py-3 text-base sm:text-lg shadow-lg transition-colors min-w-[200px] sm:min-w-[220px]"
            style={{ backgroundColor: C.heroText, color: C.primary }}
          >
            {t("lp.createSchedule")}
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>

      {/* ── 特徴 ── */}
      <section className="px-4 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-xl sm:text-2xl font-extrabold text-center mb-8"
            style={{ color: C.text }}
          >
            {t("lp.featuresHeading")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                emoji: "📝",
                label: t("lp.feat.noSignup.label"),
                desc: t("lp.feat.noSignup.desc"),
              },
              {
                emoji: "🖨️",
                label: t("lp.feat.print.label"),
                desc: t("lp.feat.print.desc"),
              },
              {
                emoji: "🔗",
                label: t("lp.feat.share.label"),
                desc: t("lp.feat.share.desc"),
              },
              {
                emoji: "🆓",
                label: t("lp.feat.free.label"),
                desc: t("lp.feat.free.desc"),
              },
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
                  className="p-3 sm:py-4 text-center"
                  style={{
                    backgroundColor: "color-mix(in srgb, #F5F0E8 60%, #ffffff)",
                  }}
                >
                  <div className="text-3xl sm:text-4xl mb-1" aria-hidden="true">
                    {emoji}
                  </div>
                  <div
                    className="text-sm sm:text-base"
                    style={{ color: C.text, fontWeight: 800 }}
                  >
                    {label}
                  </div>
                </div>
                {/* ボディ */}
                <div className="px-3 py-2.5 sm:py-3">
                  <div
                    className="lp-pretty text-xs leading-relaxed p-1.5 text-center"
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
      <section
        className="px-4 py-12 sm:py-16"
        style={{ backgroundColor: `${C.primary}08` }}
      >
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-xl sm:text-2xl font-extrabold text-center mb-2"
            style={{ color: C.text }}
          >
            {t("lp.templatesHeading")}
          </h2>
          <p
            className="text-sm text-center mb-8"
            style={{ color: C.textMuted }}
          >
            {t("lp.templatesSubtitle", { count: TEMPLATE_SEO_DATA.length })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredTemplates.map(tpl => {
              if (!tpl) return null;
              const template = TEMPLATES[tpl.templateIndex];
              if (!template) return null;
              return (
                <Link
                  key={tpl.slug}
                  href={`/templates/${tpl.slug}`}
                  className="group flex items-start gap-3 border p-4 transition-all duration-150 hover:shadow-md"
                  style={{
                    borderColor: C.border,
                    backgroundColor: C.cardBg,
                    borderRadius: "6px",
                  }}
                >
                  <span className="text-2xl flex-shrink-0">
                    {template.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-sm font-bold group-hover:underline"
                      style={{ color: C.text }}
                    >
                      {template.name}
                    </div>
                    <div
                      className="text-xs mt-1 line-clamp-2"
                      style={{ color: C.textMuted }}
                    >
                      {template.groups.map(g => g.tasks.join("、")).join(" / ")}
                    </div>
                  </div>
                  <ArrowRight
                    className="size-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: C.primary }}
                  />
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-6 flex flex-col items-center gap-2">
            <Link
              href="/templates"
              className="inline-flex items-center gap-1 text-sm font-bold underline"
              style={{ color: C.primary }}
            >
              {t("lp.viewAllTemplates")}
              <ArrowRight className="size-3" />
            </Link>
            <Link
              href="/junban"
              className="inline-flex items-center gap-1 text-sm font-bold underline"
              style={{ color: C.primary }}
            >
              {t("lp.viewJunban")}
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Q&A ── */}
      <section className="px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-xl sm:text-2xl font-extrabold text-center mb-8"
            style={{ color: C.text }}
          >
            {t("lp.faqHeading")}
          </h2>
          <div className="flex flex-col gap-3">
            {faqs.map(faq => (
              <FAQItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── お問い合わせ ── */}
      <section
        id="contact"
        className="px-4 py-12 sm:py-16"
        style={{ backgroundColor: `${C.primary}08` }}
      >
        <div className="max-w-xl mx-auto">
          <h2
            className="text-xl sm:text-2xl font-extrabold text-center mb-2"
            style={{ color: C.text }}
          >
            {t("contact.heading")}
          </h2>
          <p
            className="text-sm text-center mb-8"
            style={{ color: C.textMuted }}
          >
            {t("contact.subtitle")}
          </p>
          <div
            className="border p-4 sm:p-6"
            style={{
              borderColor: C.border,
              backgroundColor: C.cardBg,
              borderRadius: "6px",
            }}
          >
            <ContactForm />
          </div>
        </div>
      </section>

      {/* JSON-LD: 構造化データ（serializeJsonLd が < をエスケープ） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "toban",
              url: "https://toban.app",
              description:
                "学校・保育園・介護施設・自治会・オフィス・家庭などの当番表を無料で作成・印刷・共有できるWebアプリ",
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "All",
              offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
            },
            faqPageSchema(COMMON_FAQ),
          ]),
        }}
      />
    </main>
  );
}
