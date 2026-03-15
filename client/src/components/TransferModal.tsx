import { useState, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Copy, Check } from "lucide-react";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { toast } from "sonner";

interface Props {
  slug: string;
  editToken: string;
  scheduleName: string;
  onClose: () => void;
}

export function TransferModal({ slug, editToken, scheduleName, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  const transferUrl = useMemo(() => {
    const json = JSON.stringify({ slug, editToken, name: scheduleName });
    const encoded = btoa(unescape(encodeURIComponent(json)));
    return `${window.location.origin}/transfer?data=${encoded}`;
  }, [slug, editToken, scheduleName]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(transferUrl);
    setCopied(true);
    toast.success("転送URLをコピーしました");
    if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, [transferUrl]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  useEscapeKey(onClose);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={modalRef}
        className="brutal-border brutal-shadow w-full max-w-md overflow-hidden"
        style={{ backgroundColor: "#fff", borderRadius: "16px" }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "3px solid #1a1a1a" }}>
          <h2 className="text-lg font-extrabold" style={{ color: "#1a1a1a" }}>別端末に移す</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors" aria-label="閉じる">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm" style={{ color: "#666" }}>
            以下のURLを別の端末のブラウザで開くと、「{scheduleName}」の編集権限を移せます。
          </p>

          <div
            className="brutal-border p-3 text-xs font-mono break-all"
            style={{ borderRadius: "8px", backgroundColor: "#FAFAFA", color: "#333" }}
          >
            {transferUrl}
          </div>

          <button
            onClick={handleCopy}
            className="brutal-border brutal-shadow-sm w-full flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm text-white transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
            style={{ backgroundColor: "#1a1a1a", borderRadius: "10px" }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "コピーしました" : "URLをコピー"}
          </button>

          <p className="text-xs" style={{ color: "#999" }}>
            このURLには編集トークンが含まれています。信頼できる相手にのみ共有してください。
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
