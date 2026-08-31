import { useCallback, useState } from "react";
import { toast } from "sonner";
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

interface UseShareFlowOptions {
  activeSchedule: Schedule | undefined;
  prepareForManualSave: () => Promise<Schedule | undefined>;
  updateActiveSchedule: (updater: (schedule: Schedule) => Schedule) => void;
}

export function useShareFlow({
  activeSchedule,
  prepareForManualSave,
  updateActiveSchedule,
}: UseShareFlowOptions) {
  const [isSharing, setIsSharing] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const handleShare = useCallback(async () => {
    const initialSchedule = activeSchedule;
    if (!initialSchedule) return;

    pauseScheduleSync(initialSchedule.id);
    setIsSharing(true);
    let stage: ShareStage = "save";
    try {
      // Pausing cancels future automatic PUTs; an already-dispatched one must
      // finish before the explicit save or it could overwrite that newer save.
      await waitForScheduleSync(initialSchedule.id);
      const preparedSchedule =
        (await prepareForManualSave()) ?? initialSchedule;
      if (preparedSchedule.id !== initialSchedule.id) {
        throw new Error("The schedule changed while preparing to share.");
      }
      const data = toScheduleData(preparedSchedule);

      let shareTarget = preparedSchedule;
      if (preparedSchedule.slug && preparedSchedule.editToken) {
        await updateSchedule(
          preparedSchedule.slug,
          preparedSchedule.editToken,
          data
        );
      } else {
        const result = await createSchedule(data);
        updateActiveSchedule(s =>
          s.id === initialSchedule.id && !(s.slug && s.editToken)
            ? { ...s, slug: result.slug, editToken: result.editToken }
            : s
        );
        shareTarget = {
          ...preparedSchedule,
          slug: result.slug,
          editToken: result.editToken,
        };
      }

      if (!shareTarget.slug || !shareTarget.editToken) {
        throw new Error("Missing share credentials");
      }

      stage = "publish";
      await publishSchedule(shareTarget.slug, shareTarget.editToken);
      clearPendingSync(shareTarget.id, shareTarget);
      setShowShare(true);
    } catch (error) {
      console.error("Share failed", { stage, error });
      toast.error(getShareErrorMessage(error, stage));
    } finally {
      resumeScheduleSync(initialSchedule.id);
      setIsSharing(false);
    }
  }, [activeSchedule, prepareForManualSave, updateActiveSchedule]);

  return { isSharing, showShare, setShowShare, handleShare };
}
