import { defineComponent, shallowRef, watch } from "vue";
import { useLocation, useSearch } from "@/lib/router";
import { toast } from "vue-sonner";
import { z } from "zod";
import { generateId } from "@/rotation/utils";
import { loadState, saveState } from "@/lib/appState";
import { ApiError, getScheduleForEdit } from "@/lib/api";
import { decodeShareTransferData } from "@/lib/shareTransfer";
import { useT, tStandalone, type MessageKey } from "@/i18n";
import { Loader2 } from "@lucide/vue";
import { getSavedFontId } from "@/fonts";

const transferDataSchema = z.object({
  slug: z.string().min(1),
  editToken: z.string().min(1),
  name: z.string().min(1),
});
export default defineComponent(() => {
  const search = useSearch();
  const [, navigate] = useLocation();
  const t = useT();
  const errorKey = shallowRef<MessageKey | null>(null);
  watch(
    search,
    (value, _previous, onCleanup) => {
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });
      void (async () => {
        const data = new URLSearchParams(value).get("data");
        if (!data) {
          errorKey.value = "transfer.error.notFound";
          return;
        }
        let decoded: string;
        try {
          decoded = decodeShareTransferData(data);
        } catch {
          errorKey.value = "transfer.error.broken";
          return;
        }
        const parsed = transferDataSchema.safeParse(
          (() => {
            try {
              return JSON.parse(decoded);
            } catch {
              return null;
            }
          })()
        );
        if (!parsed.success) {
          errorKey.value = "transfer.error.badFormat";
          return;
        }
        try {
          const fetched = await getScheduleForEdit(
            parsed.data.slug,
            parsed.data.editToken
          );
          if (cancelled) return;
          const state = loadState();
          const existing = state.schedules.find(
            schedule => schedule.slug === parsed.data.slug
          );
          const nextSchedule = {
            id: existing?.id ?? generateId("s"),
            name: fetched.name,
            rotation: fetched.rotation,
            groups: fetched.groups,
            members: fetched.members,
            slug: fetched.slug,
            editToken: parsed.data.editToken,
            rotationConfig: fetched.rotationConfig,
            assignmentMode: fetched.assignmentMode,
            designThemeId: fetched.designThemeId,
            fontId: fetched.fontId ?? existing?.fontId ?? getSavedFontId(),
            pinned: existing?.pinned,
          };
          const schedules = existing
            ? state.schedules.map(schedule =>
                schedule.slug === parsed.data.slug ? nextSchedule : schedule
              )
            : [...state.schedules, nextSchedule];
          if (!saveState({ schedules, activeScheduleId: nextSchedule.id })) {
            errorKey.value = "transfer.error.saveFailed";
            return;
          }
          toast.success(
            tStandalone(existing ? "transfer.updated" : "transfer.added", {
              name: fetched.name,
            })
          );
          void navigate("/");
        } catch (error) {
          if (cancelled) return;
          errorKey.value =
            error instanceof ApiError && [401, 403, 404].includes(error.status)
              ? "transfer.error.invalidLink"
              : "transfer.error.saveFailed";
        }
      })();
    },
    { immediate: true }
  );
  return () => {
    if (errorKey.value) {
      return (
        <div
          class="min-h-screen flex flex-col items-center justify-center gap-4"
          style={{ backgroundColor: "var(--dt-page-bg)" }}
        >
          <div class="text-6xl">😢</div>
          <h1 class="text-xl font-bold" style={{ color: "var(--dt-text)" }}>
            {t(errorKey.value)}
          </h1>
          <a
            href="/"
            class="theme-border theme-shadow-sm px-4 py-2 font-bold text-sm transition-all duration-150 theme-hover-lift"
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
        class="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--dt-page-bg)" }}
      >
        <Loader2
          class="size-8 animate-spin"
          style={{ color: "var(--dt-current-highlight)" }}
        />
      </div>
    );
  };
});
