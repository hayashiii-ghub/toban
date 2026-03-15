import { useEffect, useRef, useState } from "react";
import type { Schedule } from "@/rotation/types";
import { scheduleSyncDebounced, setSyncStatusCallback, flushPendingSync, type SyncStatus } from "@/lib/syncManager";

export function useAutoSync(schedule: Schedule): SyncStatus {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const prevJsonRef = useRef<string>("");
  const scheduleIdRef = useRef(schedule.id);

  useEffect(() => {
    setSyncStatusCallback((id, status) => {
      if (id === scheduleIdRef.current) {
        setSyncStatus(status);
      }
    });
    return () => setSyncStatusCallback(null);
  }, []);

  useEffect(() => {
    scheduleIdRef.current = schedule.id;
    prevJsonRef.current = "";
    setSyncStatus("idle");
  }, [schedule.id]);

  useEffect(() => {
    if (!schedule.slug || !schedule.editToken) return;

    const json = JSON.stringify({
      name: schedule.name,
      rotation: schedule.rotation,
      groups: schedule.groups,
      members: schedule.members,
    });

    if (prevJsonRef.current && prevJsonRef.current !== json) {
      scheduleSyncDebounced(schedule);
    }
    prevJsonRef.current = json;
  }, [schedule]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (schedule.slug && schedule.editToken) {
        flushPendingSync(schedule.id);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [schedule.id, schedule.slug, schedule.editToken]);

  return syncStatus;
}
