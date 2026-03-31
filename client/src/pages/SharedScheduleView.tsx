import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { getSchedule, ApiError } from "@/lib/api";
import type { ScheduleDTO } from "@/rotation/types";
import { APP_TITLE } from "@/rotation/constants";
import { computeAssignments, computeDateRotation, generateId, loadState, saveState } from "@/rotation/utils";
import { AssignmentsGrid } from "@/features/home/AssignmentsGrid";
import { RotationQuickTable } from "@/features/home/RotationQuickTable";
import { RotationCalendar } from "@/features/home/RotationCalendar";
import { ViewTabs, type ViewTabValue } from "@/features/home/ViewTabs";
import { AdBanner } from "@/components/AdBanner";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { Copy, Loader2 } from "lucide-react";
import { PrintMenu } from "@/components/PrintMenu";
import "./home.css";

export default function SharedScheduleView() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [schedule, setSchedule] = useState<ScheduleDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<ViewTabValue>("cards");

  useEffect(() => {
    const cleanup = () => {
      delete document.body.dataset.printMode;
    };
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window.print !== "function") {
      toast.error("このブラウザでは印刷できません。SafariまたはChromeで開いてください");
      return;
    }
    document.body.dataset.printMode = viewTab;
    window.print();
  }, [viewTab]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSchedule(null);
    getSchedule(slug)
      .then((data) => {
        if (cancelled) return;
        setSchedule(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError("スケジュールが見つかりませんでした");
          } else if (err.status >= 500) {
            setError("サーバーエラーが発生しました。しばらくしてからお試しください");
          } else {
            setError("データの取得に失敗しました");
          }
        } else {
          setError("ネットワークエラーが発生しました。接続を確認してください");
        }
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  const scheduleName = schedule?.name;
  useEffect(() => {
    if (scheduleName) {
      document.title = `${scheduleName} - toban`;
    }
    return () => {
      document.title = APP_TITLE;
    };
  }, [scheduleName]);

  const effectiveRotation = useMemo(() => {
    if (!schedule) return 0;
    if (schedule.rotationConfig?.mode === "date") {
      const activeMembers = schedule.members.filter(m => !m.skipped);
      return computeDateRotation(schedule.rotationConfig, activeMembers.length);
    }
    return schedule.rotation;
  }, [schedule]);

  const assignments = useMemo(() => {
    if (!schedule) return [];
    return computeAssignments(schedule.groups, schedule.members, effectiveRotation, schedule.assignmentMode);
  }, [schedule, effectiveRotation]);

  const handleImport = useCallback(() => {
    if (!schedule) return;

    const state = loadState();
    // メンバーIDマッピング（旧ID → 新ID）
    const memberIdMap = new Map<string, string>();
    const newMembers = schedule.members.map((m) => {
      const newId = generateId("m");
      memberIdMap.set(m.id, newId);
      return { ...m, id: newId };
    });

    const newSchedule = {
      id: generateId("s"),
      name: schedule.name,
      rotation: schedule.rotation,
      groups: schedule.groups.map((g) => ({
        ...g,
        id: generateId("g"),
        // グループ専用メンバーIDも新IDに変換
        memberIds: g.memberIds?.map((id) => memberIdMap.get(id) ?? id),
      })),
      members: newMembers,
      assignmentMode: schedule.assignmentMode,
      rotationConfig: schedule.rotationConfig,
      designThemeId: schedule.designThemeId,
    };

    const newState = {
      schedules: [...state.schedules, newSchedule],
      activeScheduleId: newSchedule.id,
    };
    saveState(newState);
    toast.success("当番表をコピーしました");
    navigate("/app");
  }, [schedule, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--dt-page-bg)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--dt-current-highlight)" }} />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "var(--dt-page-bg)" }}>
        <div className="text-6xl">😢</div>
        <h1 className="text-xl font-bold" style={{ color: "var(--dt-text)" }}>
          {error ?? "スケジュールが見つかりませんでした"}
        </h1>
        <a
          href="/app"
          className="theme-border theme-shadow-sm px-4 py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
          style={{ backgroundColor: "var(--dt-current-highlight)", borderRadius: "var(--dt-border-radius-sm)" }}
        >
          自分で当番表を作る
        </a>
      </div>
    );
  }

  const rotationLabel = effectiveRotation === 0 ? "初期" : `${effectiveRotation}回目`;

  return (
    <DesignThemeProvider themeId={schedule?.designThemeId}>
    <main className="rotation-page min-h-screen" style={{ backgroundColor: "var(--dt-page-bg)" }}>
      <header className="rotation-print-header pt-6 sm:pt-8 pb-6 sm:pb-8 px-3 sm:px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1
            className="text-2xl sm:text-3xl font-extrabold rotation-no-print"
            style={{ color: "var(--dt-text)" }}
          >
            {schedule.name}
          </h1>
          <div
            className="rotation-print-only text-2xl sm:text-3xl md:text-4xl tracking-tight"
            style={{ color: "var(--dt-text)", fontWeight: "var(--dt-font-weight-extra)" }}
            aria-hidden="true"
          >
            {schedule.name}
          </div>
          <p className="text-sm font-bold mt-1 rotation-no-print" style={{ color: "var(--dt-text-secondary)" }}>
            {rotationLabel}
          </p>
          <div
            className="rotation-print-only mt-3 pt-2 text-sm font-bold"
            style={{ color: "var(--dt-text-secondary)", borderBottom: "2px solid var(--dt-current-highlight)" }}
          >
            <span className="inline-block pb-2">
              順番: {rotationLabel} ／ 印刷日: {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
            </span>
          </div>
        </div>
      </header>

      <ViewTabs viewTab={viewTab} onChangeTab={setViewTab} />

      {viewTab === "cards" && (
        <AssignmentsGrid
          assignments={assignments}
          direction="forward"
          rotation={effectiveRotation}
          scheduleId={schedule.slug}
          stagger={false}
          assignmentMode={schedule.assignmentMode}
        />
      )}

      {viewTab === "table" && (
        <RotationQuickTable
          groups={schedule.groups}
          members={schedule.members}
          rotation={effectiveRotation}
          assignmentMode={schedule.assignmentMode}
        />
      )}

      {viewTab === "calendar" && (
        <RotationCalendar
          groups={schedule.groups}
          members={schedule.members}
          rotation={effectiveRotation}
          rotationConfig={schedule.rotationConfig}
          assignmentMode={schedule.assignmentMode}
        />
      )}

      <AdBanner />

      <div className="px-3 sm:px-4 pb-8 sm:pb-12 rotation-no-print">
        <div className="max-w-4xl mx-auto text-center flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <PrintMenu onPrint={handlePrint} />
          <button
            onClick={handleImport}
            className="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
            style={{ backgroundColor: "#10B981", color: "#fff", borderRadius: "var(--dt-border-radius-sm)" }}
          >
            <Copy className="w-4 h-4" />
            この当番表を自分用にコピー
          </button>
          <a
            href="/app"
            className="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
            style={{ backgroundColor: "var(--dt-current-highlight)", borderRadius: "var(--dt-border-radius-sm)" }}
          >
            自分で当番表を作る
          </a>
        </div>
      </div>
    </main>
    </DesignThemeProvider>
  );
}
