import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { getSchedule, ApiError, InvalidApiResponseError } from "@/lib/api";
import type { ScheduleDTO } from "@/rotation/types";
import {
  computeAssignments,
  computeDateRotationForDate,
  generateId,
} from "@/rotation/utils";
import { loadState, saveState } from "@/lib/appState";
import { ScheduleViews } from "@/features/home/ScheduleViews";
import { ViewTabs, type ViewTabValue } from "@/features/home/ViewTabs";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { Copy } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { DEFAULT_THEME_ID } from "@/rotation/defaultState";
import { PrintMenu } from "@/components/PrintMenu";
import { usePrintDateString } from "@/hooks/usePrintDateString";
import { usePrintMode } from "@/hooks/usePrintMode";
import { useTurnLabel } from "@/hooks/useTurnLabel";
import { useLocalToday } from "@/hooks/useLocalToday";
import { MyDuty, loadSharedMe, saveSharedMe } from "@/features/shared/MyDuty";
import { useT, type MessageKey } from "@/i18n";
import { getSavedFontId } from "@/fonts";
import "./home.css";

export default function SharedScheduleView() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const t = useT();
  const today = useLocalToday();
  // 取得した slug ごと結果を持ち、表示中の slug と違えば読み込み中とみなす
  const [loaded, setLoaded] = useState<{
    slug: string;
    schedule: ScheduleDTO | null;
    errorKey: MessageKey | null;
  } | null>(null);
  const current = loaded?.slug === slug ? loaded : null;
  const loading = !current;
  const schedule = current?.schedule ?? null;
  const errorKey = current?.errorKey ?? null;
  const [viewTab, setViewTab] = useState<ViewTabValue>("cards");
  // 受け取った人が選んだ自分の名前（当番表ごとにこの端末に覚えておく）
  const [meBySlug, setMeBySlug] = useState<Record<string, string | null>>({});
  const meId = slug
    ? slug in meBySlug
      ? meBySlug[slug]
      : loadSharedMe(slug)
    : null;
  const chooseMe = (memberId: string | null) => {
    if (!slug) return;
    saveSharedMe(slug, memberId);
    setMeBySlug(prev => ({ ...prev, [slug]: memberId }));
  };
  const printDate = usePrintDateString();

  // 印刷は Home と同じ usePrintMode に集約（printMode 設定・@page 向き注入・afterprint cleanup を一括）。
  const { handlePrint } = usePrintMode();

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    getSchedule(slug)
      .then(data => {
        if (cancelled) return;
        setLoaded({ slug, schedule: data, errorKey: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        let key: MessageKey = "shared.error.network";
        if (err instanceof ApiError) {
          if (err.status === 404) key = "shared.error.notFound";
          else if (err.status >= 500) key = "shared.error.server";
          else key = "shared.error.fetch";
        } else if (err instanceof InvalidApiResponseError) {
          // 上限超過などで形が合わない。zod の英語文は出さず、取得失敗として見せる。
          key = "shared.error.fetch";
        }
        setLoaded({ slug, schedule: null, errorKey: key });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const scheduleName = schedule?.name;
  useEffect(() => {
    document.title = scheduleName
      ? `${scheduleName} - toban`
      : t("lp.docTitle");
    return () => {
      document.title = t("lp.docTitle");
    };
  }, [scheduleName, t]);

  const effectiveRotation = useMemo(() => {
    if (!schedule) return 0;
    if (schedule.rotationConfig?.mode === "date") {
      const activeMembers = schedule.members.filter(m => !m.skipped);
      return computeDateRotationForDate(
        schedule.rotationConfig,
        activeMembers.length,
        today
      );
    }
    return schedule.rotation;
  }, [schedule, today]);
  const turn = useTurnLabel(
    schedule?.rotationConfig,
    schedule?.members ?? [],
    effectiveRotation
  );

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
      fontId: schedule.fontId ?? getSavedFontId(),
    };

    const newState = {
      schedules: [...state.schedules, newSchedule],
      activeScheduleId: newSchedule.id,
    };
    if (!saveState(newState)) {
      toast.error(t("summary.saveFailed"));
      return;
    }
    toast.success(t("shared.copied"));
    navigate("/");
  }, [schedule, navigate, t]);

  if (loading) return <LoadingScreen />;

  if (errorKey || !schedule) {
    const key = errorKey ?? "shared.error.notFound";
    const isNotFound = key === "shared.error.notFound";
    return (
      <DesignThemeProvider themeId={DEFAULT_THEME_ID}>
        <div
          className="rotation-page flex-1 flex items-center justify-center p-4"
          style={{ backgroundColor: "var(--dt-page-bg)" }}
        >
          <div
            className="theme-border theme-shadow w-full max-w-md p-8 text-center"
            style={{
              borderRadius: "var(--dt-border-radius)",
              backgroundColor: "var(--dt-card-bg)",
            }}
          >
            {/* 受け取った人の過失ではないので、404 ページと同じく警告色を使わない */}
            <div
              className="theme-border size-16 mx-auto mb-5 flex items-center justify-center text-3xl"
              style={{
                borderRadius: "50%",
                backgroundColor: "var(--dt-current-highlight)",
              }}
              aria-hidden="true"
            >
              {isNotFound ? "🔍" : "📡"}
            </div>
            <h1
              className="text-lg font-bold mb-2"
              style={{ color: "var(--dt-text)" }}
            >
              {t(key)}
            </h1>
            <p
              className="text-sm mb-6 leading-relaxed"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              {t(
                isNotFound
                  ? "shared.error.notFoundHint"
                  : "shared.error.retryHint"
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!isNotFound && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-5 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
                  style={{
                    backgroundColor: "var(--dt-control-bar-bg)",
                    color: "var(--dt-control-bar-text)",
                    borderRadius: "10px",
                  }}
                >
                  {t("error.reload")}
                </button>
              )}
              <a
                href="/"
                className="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-5 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift"
                style={{
                  backgroundColor: "var(--dt-button-bg)",
                  color: "var(--dt-text)",
                  borderRadius: "10px",
                }}
              >
                {t("shared.createYourOwn")}
              </a>
            </div>
          </div>
        </div>
      </DesignThemeProvider>
    );
  }

  const rotationLabel = turn.label;

  return (
    <DesignThemeProvider
      themeId={schedule?.designThemeId}
      fontId={schedule?.fontId}
    >
      <main
        className="rotation-page flex-1"
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
            {/* 手動の「初期」「3回目」は受け取った人には意味が伝わらないので、日付モードだけ出す */}
            {turn.isDateMode && (
              <p
                className="text-sm sm:text-base font-bold mt-2 rotation-no-print"
                style={{ color: "var(--dt-text-secondary)" }}
              >
                {rotationLabel}
              </p>
            )}
            <div
              className="rotation-print-only mt-3 pt-2 text-sm font-bold"
              style={{
                color: "var(--dt-text-secondary)",
                borderBottom: "3px solid var(--dt-border-color)",
              }}
            >
              <span className="inline-block pb-2">
                {t(
                  turn.isDateMode
                    ? "shared.printHeaderDate"
                    : "shared.printHeader",
                  { label: rotationLabel, date: printDate }
                )}
              </span>
            </div>
          </div>
        </header>

        <MyDuty
          slug={schedule.slug}
          meId={meId}
          groups={schedule.groups}
          members={schedule.members}
          rotation={effectiveRotation}
          rotationConfig={schedule.rotationConfig}
          assignmentMode={schedule.assignmentMode}
          onChange={chooseMe}
        />

        <ViewTabs viewTab={viewTab} onChangeTab={setViewTab} />

        <ScheduleViews
          highlightMemberId={meId}
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

        <div className="px-3 sm:px-4 pb-8 sm:pb-12 rotation-no-print">
          <div className="max-w-4xl mx-auto text-center flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <PrintMenu
              onPrint={() =>
                handlePrint(viewTab, schedule.name, turn.fileLabel)
              }
            />
            <button
              type="button"
              onClick={handleImport}
              className="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
              style={{
                backgroundColor: "var(--dt-control-bar-bg)",
                color: "var(--dt-control-bar-text)",
                borderRadius: "var(--dt-border-radius-sm)",
              }}
            >
              <Copy className="size-4" />
              {t("shared.copyToMine")}
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center px-2 py-2 text-sm font-bold underline underline-offset-4"
              style={{ color: "var(--dt-text-secondary)" }}
            >
              {t("shared.createYourOwn")}
            </a>
          </div>
        </div>
      </main>
    </DesignThemeProvider>
  );
}
