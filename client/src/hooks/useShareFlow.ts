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
      const preparedSchedule =
        (await prepareForManualSave()) ?? initialSchedule;
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
        updateActiveSchedule(s => ({
          ...s,
          slug: result.slug,
          editToken: result.editToken,
        }));
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
      clearPendingSync(shareTarget.id);
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
