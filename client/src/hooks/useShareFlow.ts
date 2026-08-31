import { useCallback, useLayoutEffect, useRef, useState } from "react";
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
import { useT } from "@/i18n";

interface UseShareFlowOptions {
  activeSchedule: Schedule | undefined;
  prepareForManualSave: () => Promise<Schedule | undefined>;
  updateActiveSchedule: (updater: (schedule: Schedule) => Schedule) => void;
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

export function useShareFlow({
  activeSchedule,
  prepareForManualSave,
  updateActiveSchedule,
}: UseShareFlowOptions) {
  const t = useT();
  const [isSharing, setIsSharing] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareConfirmation, setShareConfirmation] =
    useState<ShareConfirmation | null>(null);
  const currentScheduleRef = useRef(activeSchedule);
  const sharingRef = useRef(false);
  const confirmationRef = useRef<ShareSnapshot | null>(null);

  useLayoutEffect(() => {
    currentScheduleRef.current = activeSchedule;
  }, [activeSchedule]);

  const clearConfirmation = useCallback(() => {
    confirmationRef.current = null;
    setShareConfirmation(null);
  }, []);

  const requestShareConfirmation =
    useCallback((): ShareConfirmationRequestResult => {
      if (sharingRef.current || showShare) return { status: "busy" };
      const schedule = currentScheduleRef.current;
      if (!schedule) return { status: "missing_schedule" };
      if (confirmationRef.current) return { status: "busy" };
      const confirmation = {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
      };
      confirmationRef.current = {
        confirmation,
        content: JSON.stringify(toScheduleData(schedule)),
      };
      setShareConfirmation(confirmation);
      return { status: "confirmation_required", ...confirmation };
    }, [showShare]);

  const cancelShareConfirmation = useCallback(() => {
    if (!sharingRef.current) clearConfirmation();
  }, [clearConfirmation]);

  const runShare = useCallback(
    async (snapshot?: ShareSnapshot) => {
      const initialSchedule = currentScheduleRef.current;
      if (sharingRef.current || !initialSchedule) return;

      // Confirmation is tied to both the roster and its visible contents.
      // Credentials added by a background backup do not change that consent.
      const assertConfirmed = (prepared?: Schedule) => {
        if (
          snapshot &&
          (!matchesSnapshot(currentScheduleRef.current, snapshot) ||
            (prepared && !matchesSnapshot(prepared, snapshot)))
        ) {
          throw new ShareConfirmationChangedError();
        }
      };

      sharingRef.current = true;
      setIsSharing(true);
      pauseScheduleSync(initialSchedule.id);
      let stage: ShareStage = "save";
      try {
        // Pausing cancels future automatic PUTs; an already-dispatched one must
        // finish before the explicit save or it could overwrite that newer save.
        await waitForScheduleSync(initialSchedule.id);
        assertConfirmed();
        const prepared = await prepareForManualSave();
        if (snapshot && !prepared) throw new ShareConfirmationChangedError();
        const preparedSchedule = prepared ?? initialSchedule;
        if (preparedSchedule.id !== initialSchedule.id) {
          throw new Error("The schedule changed while preparing to share.");
        }
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

        assertConfirmed(shareTarget);
        stage = "publish";
        await publishSchedule(shareTarget.slug, shareTarget.editToken);
        clearPendingSync(shareTarget.id, shareTarget);
        if (
          currentScheduleRef.current?.id === shareTarget.id &&
          (!snapshot || matchesSnapshot(currentScheduleRef.current, snapshot))
        ) {
          setShowShare(true);
        } else {
          // A successful publication cannot be undone by a later UI change.
          // Report success without opening another roster's sharing dialog.
          toast.success(
            t("shareConfirm.publishedChanged", { name: shareTarget.name })
          );
        }
      } catch (error) {
        if (error instanceof ShareConfirmationChangedError) {
          toast.error(t("shareConfirm.changed"));
        } else {
          console.error("Share failed", { stage, error });
          toast.error(getShareErrorMessage(error, stage));
        }
      } finally {
        clearConfirmation();
        resumeScheduleSync(initialSchedule.id);
        sharingRef.current = false;
        setIsSharing(false);
      }
    },
    [prepareForManualSave, updateActiveSchedule, clearConfirmation, t]
  );

  // The existing Share button is already an explicit user action.
  const handleShare = useCallback(() => runShare(), [runShare]);

  const confirmShare = useCallback(async () => {
    const snapshot = confirmationRef.current;
    if (
      sharingRef.current ||
      !snapshot ||
      snapshot.confirmation !== shareConfirmation
    ) {
      return;
    }
    if (!matchesSnapshot(currentScheduleRef.current, snapshot)) {
      clearConfirmation();
      toast.error(t("shareConfirm.changed"));
      return;
    }
    await runShare(snapshot);
  }, [shareConfirmation, clearConfirmation, runShare, t]);

  return {
    isSharing,
    showShare,
    setShowShare,
    handleShare,
    shareConfirmation,
    showShareConfirmation: shareConfirmation !== null,
    requestShareConfirmation,
    confirmShare,
    cancelShareConfirmation,
  };
}
