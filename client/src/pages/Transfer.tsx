import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { loadState, saveState, generateId } from "@/rotation/utils";
import { Loader2 } from "lucide-react";

export default function Transfer() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(search);
      const data = params.get("data");
      if (!data) {
        setError("転送データが見つかりません");
        return;
      }

      const parsed = JSON.parse(decodeURIComponent(escape(atob(data))));
      if (!parsed.slug || !parsed.editToken || !parsed.name) {
        setError("転送データが不正です");
        return;
      }

      const state = loadState();

      // 既に同じslugが存在する場合はeditTokenを更新
      const existing = state.schedules.find((s) => s.slug === parsed.slug);
      if (existing) {
        existing.editToken = parsed.editToken;
        saveState(state);
        toast.success(`「${parsed.name}」の編集権限を更新しました`);
        navigate("/");
        return;
      }

      // 新規追加（データはAPIから取得するため最小限のスケジュールを作成）
      const newSchedule = {
        id: generateId("s"),
        name: parsed.name,
        rotation: 0,
        groups: [{ id: generateId("g"), tasks: ["読み込み中..."], emoji: "⏳" }],
        members: [{ id: generateId("m"), name: "...", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" }],
        slug: parsed.slug,
        editToken: parsed.editToken,
      };

      const newState = {
        schedules: [...state.schedules, newSchedule],
        activeScheduleId: newSchedule.id,
      };
      saveState(newState);
      toast.success(`「${parsed.name}」の編集権限を追加しました`);
      navigate("/");
    } catch {
      setError("転送データの読み込みに失敗しました");
    }
  }, [search, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#FFF8E7" }}>
        <div className="text-6xl">😢</div>
        <h1 className="text-xl font-bold" style={{ color: "#1a1a1a" }}>{error}</h1>
        <a
          href="/"
          className="brutal-border brutal-shadow-sm px-4 py-2 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
          style={{ backgroundColor: "#FBBF24", borderRadius: "8px" }}
        >
          ホームに戻る
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8E7" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FBBF24" }} />
    </div>
  );
}
