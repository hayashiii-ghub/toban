import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 brutal-border brutal-shadow p-3 flex items-center gap-3"
      style={{ backgroundColor: "#FBBF24", borderRadius: "12px" }}
    >
      <Download className="w-5 h-5 shrink-0" style={{ color: "#1a1a1a" }} />
      <div className="flex-1">
        <div className="text-sm font-bold" style={{ color: "#1a1a1a" }}>アプリとして追加</div>
        <div className="text-xs font-medium" style={{ color: "#7C5E00" }}>ホーム画面からすぐアクセス</div>
      </div>
      <button
        onClick={handleInstall}
        className="brutal-border px-3 py-1.5 text-xs font-bold transition-all hover:translate-y-[-1px]"
        style={{ backgroundColor: "#fff", borderRadius: "6px" }}
      >
        追加
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-yellow-400 rounded-lg transition-colors"
        aria-label="閉じる"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
