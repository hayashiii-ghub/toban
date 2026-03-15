import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { getSchedule } from "@/lib/api";
import type { ScheduleDTO } from "@/rotation/types";
import { APP_TITLE } from "@/rotation/constants";
import { computeAssignments, generateId, loadState, saveState } from "@/rotation/utils";
import { AssignmentsGrid } from "@/features/home/AssignmentsGrid";
import { RotationQuickTable } from "@/features/home/RotationQuickTable";
import { AdBanner } from "@/components/AdBanner";
import { Copy, Loader2 } from "lucide-react";

export default function SharedScheduleView() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [schedule, setSchedule] = useState<ScheduleDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getSchedule(slug)
      .then(setSchedule)
      .catch(() => setError("スケジュールが見つかりませんでした"))
      .finally(() => setLoading(false));
  }, [slug]);

  const scheduleName = schedule?.name;
  useEffect(() => {
    if (scheduleName) {
      document.title = `${scheduleName} - 当番表メーカー`;
    }
    return () => {
      document.title = APP_TITLE;
    };
  }, [scheduleName]);

  const assignments = useMemo(() => {
    if (!schedule) return [];
    return computeAssignments(schedule.groups, schedule.members, schedule.rotation);
  }, [schedule]);

  const handleImport = useCallback(() => {
    if (!schedule) return;

    const state = loadState();
    const newSchedule = {
      id: generateId("s"),
      name: schedule.name,
      rotation: schedule.rotation,
      groups: schedule.groups.map((g) => ({ ...g, id: generateId("g") })),
      members: schedule.members.map((m) => ({ ...m, id: generateId("m") })),
    };

    const newState = {
      schedules: [...state.schedules, newSchedule],
      activeScheduleId: newSchedule.id,
    };
    saveState(newState);
    toast.success("当番表をコピーしました");
    navigate("/");
  }, [schedule, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FFF8E7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FBBF24" }} />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#FFF8E7" }}>
        <div className="text-6xl">😢</div>
        <h1 className="text-xl font-bold" style={{ color: "#1a1a1a" }}>
          {error ?? "スケジュールが見つかりませんでした"}
        </h1>
        <a
          href="/"
          className="brutal-border brutal-shadow-sm px-4 py-2 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
          style={{ backgroundColor: "#FBBF24", borderRadius: "8px" }}
        >
          自分で当番表を作る
        </a>
      </div>
    );
  }

  const rotationLabel = schedule.rotation === 0 ? "初期" : `${schedule.rotation}回目`;

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FFF8E7" }}>
      <div className="px-3 sm:px-4 pt-6 sm:pt-8 pb-2">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "#1a1a1a" }}>
            {schedule.name}
          </h1>
          <p className="text-sm font-bold mt-1" style={{ color: "#7C5E00" }}>
            {rotationLabel}
          </p>
        </div>
      </div>

      <AssignmentsGrid
        assignments={assignments}
        direction="forward"
        rotation={schedule.rotation}
        groupCount={schedule.groups.length}
        scheduleId={schedule.slug}
        stagger={false}
      />

      <RotationQuickTable
        groups={schedule.groups}
        members={schedule.members}
        rotation={schedule.rotation}
      />

      <AdBanner />

      <div className="px-3 sm:px-4 pb-8 sm:pb-12">
        <div className="max-w-4xl mx-auto text-center flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleImport}
            className="brutal-border brutal-shadow-sm inline-flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
            style={{ backgroundColor: "#10B981", color: "#fff", borderRadius: "8px" }}
          >
            <Copy className="w-4 h-4" />
            この当番表を自分用にコピー
          </button>
          <a
            href="/"
            className="brutal-border brutal-shadow-sm inline-flex items-center gap-2 px-4 py-2 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a]"
            style={{ backgroundColor: "#FBBF24", borderRadius: "8px" }}
          >
            自分で当番表を作る
          </a>
        </div>
      </div>
    </main>
  );
}
