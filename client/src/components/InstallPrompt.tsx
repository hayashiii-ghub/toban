import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import { useT } from "@/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) &&
    !("MSStream" in window) &&
    /Safari/.test(ua) &&
    !/CriOS|FxiOS|OPiOS/.test(ua)
  );
}

function isStandalone(): boolean {
  return (
    ("standalone" in navigator &&
      (navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

const DISMISS_KEY = "toban-install-dismissed";

export function InstallPrompt() {
  const t = useT();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => safeGetItem(DISMISS_KEY) === "1"
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // dismissed と環境から直接導出 (useEffect/useState 不要)
  const showIOSGuide = !dismissed && isIOSSafari() && !isStandalone();

  const handleDismiss = () => {
    setDismissed(true);
    safeSetItem(DISMISS_KEY, "1");
  };

  // Android/Chrome: standard install prompt
  if (deferredPrompt && !dismissed) {
    const handleInstall = async () => {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    };

    return (
      <div
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 theme-border theme-shadow p-3 flex items-center gap-3"
        style={{
          backgroundColor: "var(--dt-current-highlight)",
          borderRadius: "var(--dt-border-radius)",
        }}
      >
        <Download
          className="size-5 shrink-0"
          style={{ color: "var(--dt-text)" }}
        />
        <div className="flex-1">
          <div
            className="text-sm font-bold"
            style={{ color: "var(--dt-text)" }}
          >
            {t("install.androidTitle")}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--dt-text-secondary)" }}
          >
            {t("install.androidDesc")}
          </div>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="theme-border px-3 py-1.5 text-xs font-bold transition-all hover:translate-y-[-1px]"
          style={{ backgroundColor: "var(--dt-card-bg)", borderRadius: "6px" }}
        >
          {t("install.add")}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 hover:bg-yellow-400 rounded-lg transition-colors"
          aria-label={t("common.close")}
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  // iOS Safari: manual guide
  if (showIOSGuide) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 theme-border theme-shadow p-3 flex items-center gap-3"
        style={{
          backgroundColor: "var(--dt-current-highlight)",
          borderRadius: "var(--dt-border-radius)",
        }}
      >
        <Share
          className="size-5 shrink-0"
          style={{ color: "var(--dt-text)" }}
        />
        <div className="flex-1">
          <div
            className="text-sm font-bold"
            style={{ color: "var(--dt-text)" }}
          >
            {t("install.iosTitle")}
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: "var(--dt-text-secondary)" }}
          >
            {t("install.iosDescA")}
            <span className="inline-block mx-0.5">↗</span>
            {t("install.iosDescB")}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 hover:bg-yellow-400 rounded-lg transition-colors shrink-0"
          aria-label={t("common.close")}
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return null;
}
