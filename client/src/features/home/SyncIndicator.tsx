import { Cloud, CloudOff, Loader2, Check } from "lucide-react";
import type { SyncStatus } from "@/lib/syncManager";

interface SyncIndicatorProps {
  status: SyncStatus;
  hasSlug: boolean;
}

export function SyncIndicator({ status, hasSlug }: SyncIndicatorProps) {
  if (!hasSlug) return null;

  const config = {
    idle: { icon: Cloud, text: "クラウド保存済み", color: "#999" },
    syncing: { icon: Loader2, text: "同期中...", color: "#3B82F6" },
    synced: { icon: Check, text: "同期完了", color: "#10B981" },
    error: { icon: CloudOff, text: "同期エラー", color: "#EF4444" },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className="flex items-center gap-1 text-xs font-medium rotation-no-print"
      style={{ color: config.color }}
    >
      <Icon className={`w-3 h-3 ${status === "syncing" ? "animate-spin" : ""}`} />
      <span>{config.text}</span>
    </div>
  );
}
