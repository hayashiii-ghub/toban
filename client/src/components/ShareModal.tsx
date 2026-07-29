import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { m } from "framer-motion";
import { X, Copy, Check, AlertTriangle } from "lucide-react";
import QRCode from "react-qr-code";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { encodeShareTransferData } from "@/lib/shareTransfer";
import { useT } from "@/i18n";
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
  const [activeTab, setActiveTab] = useState<ShareTab>("view");
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimerRef = useRef<number | null>(null);

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
        className="theme-border theme-shadow w-full max-w-md overflow-hidden sm:rounded-2xl rounded-t-2xl rounded-b-none sm:rounded-b-2xl"
        style={{ backgroundColor: "var(--dt-card-bg)" }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4"
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
            <X className="size-5" />
          </button>
        </div>

        {/* タブ切り替え */}
        <div
          className="grid grid-cols-2"
          style={{
            borderBottom: "var(--dt-border-width) solid var(--dt-border-color)",
          }}
        >
          <button
            type="button"
            className="py-3 text-sm font-bold transition-colors"
            style={{
              backgroundColor:
                activeTab === "view"
                  ? "var(--dt-current-highlight)"
                  : "transparent",
              color: "var(--dt-text)",
              borderRight: "1.5px solid var(--dt-border-color)",
            }}
            onClick={() => handleTabChange("view")}
          >
            {t("share.tabView")}
          </button>
          <button
            type="button"
            className="py-3 text-sm font-bold transition-colors"
            style={{
              backgroundColor:
                activeTab === "edit"
                  ? "var(--dt-current-highlight)"
                  : "transparent",
              color: "var(--dt-text)",
              borderLeft: "1.5px solid var(--dt-border-color)",
            }}
            onClick={() => handleTabChange("edit")}
          >
            {t("share.tabEdit")}
          </button>
        </div>

        <div className="p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-5 flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--dt-text-secondary)" }}>
            {activeTab === "view"
              ? t("share.descView", { name: scheduleName })
              : t("share.descEdit", { name: scheduleName })}
          </p>

          <div
            className="theme-border p-3 text-xs font-mono break-all"
            style={{
              borderRadius: "var(--dt-border-radius-sm)",
              backgroundColor: "#FAFAFA",
              color: "#333",
            }}
          >
            {currentUrl}
          </div>

          <div className="flex justify-center py-2">
            <div
              className="theme-border p-2 sm:p-3"
              style={{
                borderRadius: "var(--dt-border-radius)",
                backgroundColor: "var(--dt-card-bg)",
              }}
            >
              <QRCode
                value={currentUrl}
                size={140}
                level="M"
                className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px]"
              />
            </div>
          </div>

          <a
            href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(currentUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="theme-border w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm text-white transition-all duration-150 theme-hover-lift"
            style={{ backgroundColor: "#06C755", borderRadius: "10px" }}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            {t("share.lineShare")}
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="theme-border theme-shadow-sm w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm text-white transition-all duration-150 theme-hover-lift"
            style={{ backgroundColor: "#1a1a1a", borderRadius: "10px" }}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? t("share.copied") : t("share.copyUrl")}
          </button>

          {activeTab === "edit" && (
            <div
              className="flex items-start gap-2 px-3 py-2 rounded-lg"
              style={{ backgroundColor: "#FEF3C7" }}
            >
              <AlertTriangle
                className="size-4 shrink-0 mt-0.5"
                style={{ color: "#D97706" }}
              />
              <p className="text-xs" style={{ color: "#92400E" }}>
                {t("share.editWarning")}
              </p>
            </div>
          )}
        </div>
      </m.div>
    </m.div>
  );
}
