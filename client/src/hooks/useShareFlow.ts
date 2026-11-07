import {
  computed,
  reactive,
  shallowRef,
  toValue,
  type MaybeRefOrGetter,
} from "vue";
import { toast } from "vue-sonner";
import {
  createSchedule,
  updateSchedule,
  publishSchedule,
  toScheduleData,
} from "@/lib/api";
import { getShareErrorMessage, type ShareStage } from "@/lib/shareFlow";
import {
  clearPendingSync,
  pauseScheduleSync,
  resumeScheduleSync,
  waitForScheduleSync,
} from "@/lib/syncManager";
import type { Schedule } from "@/rotation/types";
import type { StateAction } from "@/lib/vue";
import { useT } from "@/i18n";

interface UseShareFlowOptions {
  activeSchedule: MaybeRefOrGetter<Schedule | undefined>;
  prepareForManualSave: () => Promise<Schedule | undefined>;
  updateActiveSchedule: (
    updater: (schedule: Schedule) => Schedule,
    scheduleId?: string
  ) => void;
}
export interface ShareConfirmation {
  scheduleId: string;
  scheduleName: string;
}
export type ShareConfirmationRequestResult =
  | ({ status: "confirmation_required" } & ShareConfirmation)
  | { status: "busy" | "missing_schedule" };
interface ShareSnapshot {
  confirmation: ShareConfirmation;
  content: string;
}
class ShareConfirmationChangedError extends Error {}
function matchesSnapshot(
  schedule: Schedule | undefined,
  snapshot: ShareSnapshot
): boolean {
  return (
    schedule?.id === snapshot.confirmation.scheduleId &&
    JSON.stringify(toScheduleData(schedule)) === snapshot.content
  );
}
export function useShareFlow(options: UseShareFlowOptions) {
  const t = useT();
  const isSharing = shallowRef(false);
  const showShare = shallowRef(false);
  const shareConfirmation = shallowRef<ShareConfirmation | null>(null);
  let confirmation: ShareSnapshot | null = null;
  const currentSchedule = () => toValue(options.activeSchedule);
  const setShowShare = (action: StateAction<boolean>) => {
    showShare.value =
      typeof action === "function" ? action(showShare.value) : action;
  };
  const clearConfirmation = () => {
    confirmation = null;
    shareConfirmation.value = null;
  };
  function requestShareConfirmation(): ShareConfirmationRequestResult {
    if (isSharing.value || showShare.value || confirmation)
      return { status: "busy" };
    const schedule = currentSchedule();
    if (!schedule) return { status: "missing_schedule" };
    const visible = { scheduleId: schedule.id, scheduleName: schedule.name };
    confirmation = {
      confirmation: visible,
      content: JSON.stringify(toScheduleData(schedule)),
    };
    shareConfirmation.value = visible;
    return { status: "confirmation_required", ...visible };
  }
  const cancelShareConfirmation = () => {
    if (!isSharing.value) clearConfirmation();
  };
  async function runShare(snapshot?: ShareSnapshot) {
    const initialSchedule = currentSchedule();
    if (isSharing.value || !initialSchedule) return;
    const assertConfirmed = (prepared?: Schedule) => {
      if (
        snapshot &&
        (!matchesSnapshot(currentSchedule(), snapshot) ||
          (prepared && !matchesSnapshot(prepared, snapshot)))
      )
        throw new ShareConfirmationChangedError();
    };
    isSharing.value = true;
    pauseScheduleSync(initialSchedule.id);
    let stage: ShareStage = "save";
    try {
      // Complete an earlier PUT before explicitly saving this newer snapshot.
      await waitForScheduleSync(initialSchedule.id);
      assertConfirmed();
      const prepared = await options.prepareForManualSave();
      if (snapshot && !prepared) throw new ShareConfirmationChangedError();
      const preparedSchedule = prepared ?? initialSchedule;
      if (preparedSchedule.id !== initialSchedule.id)
        throw new Error("The schedule changed while preparing to share.");
      assertConfirmed(preparedSchedule);
      const data = toScheduleData(preparedSchedule);
      let shareTarget = preparedSchedule;
      if (preparedSchedule.slug && preparedSchedule.editToken) {
        await updateSchedule(
          preparedSchedule.slug,
          preparedSchedule.editToken,
          data
        );
      } else {
        const identity = await createSchedule(data);
        options.updateActiveSchedule(
          current =>
            current.id === initialSchedule.id &&
            !(current.slug && current.editToken)
              ? { ...current, ...identity }
              : current,
          initialSchedule.id
        );
        shareTarget = { ...preparedSchedule, ...identity };
      }
      if (!shareTarget.slug || !shareTarget.editToken)
        throw new Error("Missing share credentials");
      assertConfirmed(shareTarget);
      stage = "publish";
      await publishSchedule(shareTarget.slug, shareTarget.editToken);
      clearPendingSync(shareTarget.id, shareTarget);
      if (
        currentSchedule()?.id === shareTarget.id &&
        (!snapshot || matchesSnapshot(currentSchedule(), snapshot))
      ) {
        showShare.value = true;
      } else {
        toast.success(
          t("shareConfirm.publishedChanged", { name: shareTarget.name })
        );
      }
    } catch (error) {
      if (error instanceof ShareConfirmationChangedError)
        toast.error(t("shareConfirm.changed"));
      else {
        console.error("Share failed", { stage, error });
        toast.error(getShareErrorMessage(error, stage));
      }
    } finally {
      clearConfirmation();
      resumeScheduleSync(initialSchedule.id);
      isSharing.value = false;
    }
  }
  const handleShare = () => runShare();
  const confirmShare = computed(() => {
    const expected = shareConfirmation.value;
    return async () => {
      const snapshot = confirmation;
      if (isSharing.value || !snapshot || snapshot.confirmation !== expected)
        return;
      if (!matchesSnapshot(currentSchedule(), snapshot)) {
        clearConfirmation();
        toast.error(t("shareConfirm.changed"));
        return;
      }
      await runShare(snapshot);
    };
  });
  return reactive({
    isSharing,
    showShare,
    setShowShare,
    handleShare,
    shareConfirmation,
    showShareConfirmation: computed(() => shareConfirmation.value !== null),
    requestShareConfirmation,
    confirmShare,
    cancelShareConfirmation,
  });
}
