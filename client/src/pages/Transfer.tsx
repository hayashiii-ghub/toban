import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { loadState, saveState, generateId } from "@/rotation/utils";
import { ApiError, getScheduleForEdit } from "@/lib/api";
import { decodeShareTransferData } from "@/lib/shareTransfer";
import { Loader2 } from "lucide-react";

export default function Transfer() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const params = new URLSearchParams(search);
      const data = params.get("data");
      if (!data) {
        setError("転送データが見つかりません");
        return;
      }

      let decoded: string;
      try {
        decoded = decodeShareTransferData(data);
      } catch {
        setError("転送URLが壊れています。もう一度リンクを取得してください");
        return;
      }

      let parsed: { slug?: string; editToken?: string; name?: string };
      try {
        parsed = JSON.parse(decoded);
      } catch {
        setError("転送データの形式が正しくありません");
        return;
      }

      if (!parsed.slug || !parsed.editToken || !parsed.name) {
        setError("転送データが不正です");
        return;
      }

      try {
        const fetched = await getScheduleForEdit(parsed.slug, parsed.editToken);
        if (cancelled) return;

        const state = loadState();
        const existing = state.schedules.find((schedule) => schedule.slug === parsed.slug);
        const nextSchedule = {
          id: existing?.id ?? generateId("s"),
          name: fetched.name,
          rotation: fetched.rotation,
          groups: fetched.groups,
          members: fetched.members,
          slug: fetched.slug,
          editToken: parsed.editToken,
          rotationConfig: fetched.rotationConfig,
          assignmentMode: fetched.assignmentMode,
          designThemeId: fetched.designThemeId,
          pinned: existing?.pinned,
        };

        const schedules = existing
          ? state.schedules.map((schedule) =>
              schedule.slug === parsed.slug ? nextSchedule : schedule,
            )
          : [...state.schedules, nextSchedule];

        saveState({
          schedules,
          activeScheduleId: nextSchedule.id,
        });

        toast.success(
          existing
            ? `「${fetched.name}」の編集権限を更新しました`
            : `「${fetched.name}」の編集権限を追加しました`,
        );
        navigate("/app");
      } catch (error) {
        if (cancelled) return;
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403 || error.status === 404)
        ) {
          setError("編集リンクが無効か、当番表が見つかりません");
          return;
        }
        setError("転送データの保存に失敗しました");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [search, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "var(--dt-page-bg)" }}>
        <div className="text-6xl">😢</div>
        <h1 className="text-xl font-bold" style={{ color: "var(--dt-text)" }}>{error}</h1>
        <a
          href="/app"
          className="theme-border theme-shadow-sm px-4 py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
          style={{ backgroundColor: "var(--dt-current-highlight)", borderRadius: "var(--dt-border-radius-sm)" }}
        >
          ホームに戻る
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--dt-page-bg)" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--dt-current-highlight)" }} />
    </div>
  );
}
