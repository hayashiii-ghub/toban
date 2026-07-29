import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { getSchedule, ApiError } from "@/lib/api";
import type { ScheduleDTO } from "@/rotation/types";
import { APP_TITLE } from "@/rotation/constants";
import {
  computeAssignments,
  computeDateRotation,
  generateId,
} from "@/rotation/utils";
import { loadState, saveState } from "@/lib/appState";
import { ScheduleViews } from "@/features/home/ScheduleViews";
import { ViewTabs, type ViewTabValue } from "@/features/home/ViewTabs";
import { AdBanner } from "@/components/AdBanner";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { Copy, Loader2 } from "lucide-react";
import { PrintMenu } from "@/components/PrintMenu";
import { usePrintDateString } from "@/hooks/usePrintDateString";
import { usePrintMode } from "@/hooks/usePrintMode";
import { useT } from "@/i18n";
import "./home.css";

export default function SharedScheduleView() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const t = useT();
  const [schedule, setSchedule] = useState<ScheduleDTO | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<ViewTabValue>("cards");
  const printDate = usePrintDateString();

  // 印刷は Home と同じ usePrintMode に集約（printMode 設定・@page 向き注入・afterprint cleanup を一括）。
  const { handlePrint } = usePrintMode();

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setErrorKey(null);
    setSchedule(null);
    getSchedule(slug)
      .then(data => {
        if (cancelled) return;
        setSchedule(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setErrorKey("shared.error.notFound");
          } else if (err.status >= 500) {
            setErrorKey("shared.error.server");
          } else {
            setErrorKey("shared.error.fetch");
          }
        } else {
          setErrorKey("shared.error.network");
        }
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
    return computeAssignments(
      schedule.groups,
      schedule.members,
      effectiveRotation,
      schedule.assignmentMode
    );
  }, [schedule, effectiveRotation]);

  const handleImport = useCallback(() => {
    if (!schedule) return;

    const state = loadState();
    // メンバーIDマッピング（旧ID → 新ID）
    const memberIdMap = new Map<string, string>();
    const newMembers = schedule.members.map(m => {
      const newId = generateId("m");
      memberIdMap.set(m.id, newId);
      return { ...m, id: newId };
    });

    const newSchedule = {
      id: generateId("s"),
      name: schedule.name,
      rotation: schedule.rotation,
      groups: schedule.groups.map(g => ({
        ...g,
        id: generateId("g"),
        // グループ専用メンバーIDも新IDに変換
        memberIds: g.memberIds?.map(id => memberIdMap.get(id) ?? id),
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
    toast.success(t("shared.copied"));
    navigate("/");
  }, [schedule, navigate, t]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--dt-page-bg)" }}
      >
        <Loader2
          className="size-8 animate-spin"
          style={{ color: "var(--dt-current-highlight)" }}
        />
      </div>
    );
  }

  if (errorKey || !schedule) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "var(--dt-page-bg)" }}
      >
        <div className="text-6xl">😢</div>
        <h1 className="text-xl font-bold" style={{ color: "var(--dt-text)" }}>
          {t(errorKey ?? "shared.error.notFound")}
        </h1>
        <a
          href="/"
          className="theme-border theme-shadow-sm px-4 py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
          style={{
            backgroundColor: "var(--dt-current-highlight)",
            borderRadius: "var(--dt-border-radius-sm)",
          }}
        >
          {t("shared.createYourOwn")}
        </a>
      </div>
    );
  }

  const rotationLabel =
    effectiveRotation === 0
      ? t("rotation.initial")
      : t("rotation.nth", { n: effectiveRotation });

  return (
    <DesignThemeProvider themeId={schedule?.designThemeId}>
      <main
        className="rotation-page min-h-screen"
        style={{ backgroundColor: "var(--dt-page-bg)" }}
      >
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
              style={{
                color: "var(--dt-text)",
                fontWeight: "var(--dt-font-weight-extra)",
              }}
              aria-hidden="true"
            >
              {schedule.name}
            </div>
            <p
              className="text-sm font-bold mt-1 rotation-no-print"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              {rotationLabel}
            </p>
            <div
              className="rotation-print-only mt-3 pt-2 text-sm font-bold"
              style={{
                color: "var(--dt-text-secondary)",
                borderBottom: "3px solid var(--dt-border-color)",
              }}
            >
              <span className="inline-block pb-2">
                {t("shared.printHeader", {
                  label: rotationLabel,
                  date: printDate,
                })}
              </span>
            </div>
          </div>
        </header>

        <ViewTabs viewTab={viewTab} onChangeTab={setViewTab} />

        <ScheduleViews
          viewTab={viewTab}
          assignments={assignments}
          groups={schedule.groups}
          members={schedule.members}
          rotation={effectiveRotation}
          rotationConfig={schedule.rotationConfig}
          assignmentMode={schedule.assignmentMode}
          scheduleId={schedule.slug}
          direction="forward"
          stagger={false}
        />

        <AdBanner />

        <div className="px-3 sm:px-4 pb-8 sm:pb-12 rotation-no-print">
          <div className="max-w-4xl mx-auto text-center flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <PrintMenu
              onPrint={() => handlePrint(viewTab, schedule.name, rotationLabel)}
            />
            <button
              type="button"
              onClick={handleImport}
              className="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
              style={{
                backgroundColor: "#10B981",
                color: "#fff",
                borderRadius: "var(--dt-border-radius-sm)",
              }}
            >
              <Copy className="size-4" />
              {t("shared.copyToMine")}
            </button>
            <a
              href="/"
              className="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
              style={{
                backgroundColor: "var(--dt-current-highlight)",
                borderRadius: "var(--dt-border-radius-sm)",
              }}
            >
              {t("shared.createYourOwn")}
            </a>
          </div>
        </div>
      </main>
    </DesignThemeProvider>
  );
}
