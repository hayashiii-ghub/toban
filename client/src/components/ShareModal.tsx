import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { m } from "framer-motion";
import {
  X,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  QrCode,
} from "lucide-react";
// 既定 import だと Vite の CJS interop でモジュールオブジェクトが渡り、
// React が要素の型を解決できずモーダルごと落ちる（React error #130）。
import { QRCode } from "react-qr-code";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { encodeShareTransferData } from "@/lib/shareTransfer";
import { useLocale, useT } from "@/i18n";
import { toast } from "sonner";

type ShareTab = "view" | "edit";

interface Props {
  slug: string;
  editToken: string;
  scheduleName: string;
  onClose: () => void;
}

export function ShareModal({ slug, editToken, scheduleName, onClose }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<ShareTab>("view");
  const [copied, setCopied] = useState(false);
  // 共有元の端末では自分のQRを読めないので、既定は閉じておく
  const [showQr, setShowQr] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimerRef = useRef<number | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // 背の低い端末だと QR が本文の折り返し位置より下に開くので、送り込む
  useEffect(() => {
    if (showQr) {
      qrRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [showQr]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    return () => {
      // unmount 時に最新の timer id をクリアするため ref.current を直接参照
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const viewUrl = `${window.location.origin}/s/${slug}`;

  const editUrl = useMemo(() => {
    const json = JSON.stringify({ slug, editToken, name: scheduleName });
    const encoded = encodeShareTransferData(json);
    return `${window.location.origin}/transfer?data=${encoded}`;
  }, [slug, editToken, scheduleName]);

  const currentUrl = activeTab === "view" ? viewUrl : editUrl;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success(
        activeTab === "view" ? t("share.copiedView") : t("share.copiedEdit")
      );
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("share.copyFailed"));
    }
  }, [currentUrl, activeTab, t]);

  const handleTabChange = (tab: ShareTab) => {
    setActiveTab(tab);
    setCopied(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  useEscapeKey(onClose);
  useFocusTrap(modalRef, true);

  const tabs: { value: ShareTab; label: string }[] = [
    { value: "view", label: t("share.tabView") },
    { value: "edit", label: t("share.tabEdit") },
  ];

  const copyAction = (
    <button
      type="button"
      onClick={handleCopy}
      className="theme-border w-full flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
      style={{
        backgroundColor: "var(--dt-card-bg)",
        color: "var(--dt-text)",
        borderRadius: "10px",
      }}
    >
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      {copied ? t("share.copied") : t("share.copyUrl")}
    </button>
  );
  const lineAction = (
    <a
      href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(currentUrl)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="theme-border theme-shadow-sm w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm text-white transition-all duration-150 theme-hover-lift"
      style={{ backgroundColor: "#06C755", borderRadius: "10px" }}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
      {t("share.lineShare")}
    </a>
  );

  return (
    <m.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 rotation-no-print"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <m.div
        ref={modalRef}
        // 骨格は SettingsModal と同じ。ヘッダーとフッターを固定して本文だけ
        // スクロールさせないと、編集タブの背が高い端末で上端が画面外に出る
        className="theme-border theme-shadow w-full max-w-md modal-max-h overflow-hidden flex flex-col sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl"
        style={{ backgroundColor: "var(--dt-card-bg)" }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div
          className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4"
          style={{
            borderBottom: "var(--dt-border-width) solid var(--dt-border-color)",
          }}
        >
          <h2
            id="share-modal-title"
            className="text-lg font-extrabold"
            style={{ color: "var(--dt-text)" }}
          >
            {t("share.title")}
          </h2>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t("common.close")}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* タブ切り替え。見た目は ViewTabs と揃える */}
        <div className="shrink-0 grid grid-cols-2 gap-2 px-4 sm:px-5 pt-3">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`theme-border py-2 text-sm font-bold transition-all duration-150 ${
                activeTab === value ? "theme-shadow-sm" : "theme-hover-lift"
              }`}
              style={{
                backgroundColor:
                  activeTab === value
                    ? "var(--dt-tab-active-bg)"
                    : "var(--dt-tab-inactive-bg)",
                color:
                  activeTab === value
                    ? "var(--dt-tab-active-text)"
                    : "var(--dt-tab-inactive-text)",
                borderRadius: "var(--dt-border-radius-sm)",
                transform:
                  activeTab === value
                    ? "translate(var(--dt-hover-translate), var(--dt-hover-translate))"
                    : undefined,
              }}
              aria-pressed={activeTab === value}
              onClick={() => handleTabChange(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-3">
          <p className="text-sm" style={{ color: "var(--dt-text-secondary)" }}>
            {activeTab === "view"
              ? t("share.descView", { name: scheduleName })
              : t("share.descEdit", { name: scheduleName })}
          </p>

          {/* 渡す前に読ませたいので、コピー操作より上に置く */}
          {activeTab === "edit" && (
            <div
              className="flex items-start gap-2 px-3 py-2 rounded-lg"
              style={{ backgroundColor: "#FEF3C7" }}
            >
              <AlertTriangle
                className="size-4 shrink-0 mt-0.5"
                style={{ color: "#D97706" }}
                aria-hidden="true"
              />
              <p className="text-xs" style={{ color: "#92400E" }}>
                {t("share.editWarning")}
              </p>
            </div>
          )}

          {/* 編集URLは data= に長いエンコード文字列が付く。折り返すと画面が
              埋まるうえ読んでも意味がないので、1行に省略して見せる */}
          <div
            className="theme-border px-3 py-2.5 text-xs font-mono truncate"
            style={{
              borderRadius: "var(--dt-border-radius-sm)",
              backgroundColor: "var(--dt-page-bg)",
              color: "var(--dt-text-secondary)",
            }}
            title={currentUrl}
          >
            {currentUrl}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowQr(v => !v)}
              className="flex items-center gap-1.5 text-sm font-bold transition-colors"
              style={{ color: "var(--dt-text-secondary)" }}
              aria-expanded={showQr}
            >
              <QrCode className="size-4" aria-hidden="true" />
              {showQr ? t("share.hideQr") : t("share.showQr")}
              <ChevronDown
                className={`size-4 transition-transform ${showQr ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {showQr && (
              <div ref={qrRef} className="flex justify-center pt-3">
                {/* 余白は白のままにする。テーマ色にするとクワイエット
                    ゾーンが崩れて読み取れなくなる */}
                <div
                  className="theme-border p-3"
                  style={{
                    borderRadius: "var(--dt-border-radius)",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <QRCode
                    value={currentUrl}
                    size={140}
                    level="M"
                    className="w-[140px] h-[140px]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          className="shrink-0 px-4 sm:px-5 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 flex flex-col gap-2"
          style={{
            borderTop: "var(--dt-border-width) solid var(--dt-border-color)",
          }}
        >
          {locale === "en" ? (
            <>
              {copyAction}
              {lineAction}
            </>
          ) : (
            <>
              {lineAction}
              {copyAction}
            </>
          )}

          <p
            className="text-xs text-center"
            style={{ color: "var(--dt-text-muted)" }}
          >
            {t("share.retention")}
          </p>
        </div>
      </m.div>
    </m.div>
  );
}
