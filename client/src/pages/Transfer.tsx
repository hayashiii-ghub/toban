import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { z } from "zod";
import { generateId } from "@/rotation/utils";
import { loadState, saveState } from "@/lib/appState";
import { ApiError, getScheduleForEdit } from "@/lib/api";
import { decodeShareTransferData } from "@/lib/shareTransfer";
import { useT, tStandalone } from "@/i18n";
import { Loader2 } from "lucide-react";
import { getSavedFontId } from "@/fonts";

const transferDataSchema = z.object({
  slug: z.string().min(1),
  editToken: z.string().min(1),
  name: z.string().min(1),
});

export default function Transfer() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const t = useT();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const params = new URLSearchParams(search);
      const data = params.get("data");
      if (!data) {
        setErrorKey("transfer.error.notFound");
        return;
      }

      let decoded: string;
      try {
        decoded = decodeShareTransferData(data);
      } catch {
        setErrorKey("transfer.error.broken");
        return;
      }

      const parseResult = transferDataSchema.safeParse(
        (() => {
          try {
            return JSON.parse(decoded);
          } catch {
            return null;
          }
        })()
      );
      if (!parseResult.success) {
        setErrorKey("transfer.error.badFormat");
        return;
      }
      const parsed = parseResult.data;

      try {
        const fetched = await getScheduleForEdit(parsed.slug, parsed.editToken);
        if (cancelled) return;

        const state = loadState();
        const existing = state.schedules.find(
          schedule => schedule.slug === parsed.slug
        );
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
          fontId: fetched.fontId ?? existing?.fontId ?? getSavedFontId(),
          pinned: existing?.pinned,
        };

        const schedules = existing
          ? state.schedules.map(schedule =>
              schedule.slug === parsed.slug ? nextSchedule : schedule
            )
          : [...state.schedules, nextSchedule];

        saveState({
          schedules,
          activeScheduleId: nextSchedule.id,
        });

        toast.success(
          tStandalone(existing ? "transfer.updated" : "transfer.added", {
            name: fetched.name,
          })
        );
        navigate("/");
      } catch (error) {
        if (cancelled) return;
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403 || error.status === 404)
        ) {
          setErrorKey("transfer.error.invalidLink");
          return;
        }
        setErrorKey("transfer.error.saveFailed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [search, navigate]);

  if (errorKey) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "var(--dt-page-bg)" }}
      >
        <div className="text-6xl">😢</div>
        <h1 className="text-xl font-bold" style={{ color: "var(--dt-text)" }}>
          {t(errorKey)}
        </h1>
        <a
          href="/"
          className="theme-border theme-shadow-sm px-4 py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
          style={{
            backgroundColor: "var(--dt-current-highlight)",
            borderRadius: "var(--dt-border-radius-sm)",
          }}
        >
          {t("error.backHome")}
        </a>
      </div>
    );
  }

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
