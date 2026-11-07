import {
  computed,
  onMounted,
  onScopeDispose,
  reactive,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import type { Schedule } from "@/rotation/types";
import { createSchedule, getScheduleForEdit, toScheduleData } from "@/lib/api";
import {
  scheduleSyncDebounced,
  setSyncStatusCallback,
  flushPendingSync,
  isScheduleSyncPaused,
  hasPendingSync,
  restorePendingScheduleSync,
  type SyncStatus,
} from "@/lib/syncManager";

const BACKUP_DEBOUNCE_MS = 5000;
type CloudSchedule = Schedule & { slug: string; editToken: string };
type ScheduleLookup = (id: string) => Schedule | undefined;
type ScheduleUpdater = (
  updater: (schedule: Schedule) => Schedule,
  scheduleId?: string
) => void;

export function useAutoSync(
  input: MaybeRefOrGetter<Schedule | undefined>,
  onScheduleUpdate?: ScheduleUpdater,
  options?: {
    isEditing?: MaybeRefOrGetter<boolean>;
    getScheduleById?: ScheduleLookup;
  }
) {
  const schedule = computed(() => toValue(input));
  const syncStatus = shallowRef<SyncStatus>("idle");
  let mounted = false;
  let backupTimer: number | null = null;
  const backupPromises = new Map<string, Promise<Schedule | undefined>>();
  let adoptedJson: string | null = null;
  let pulledKey: string | null = null;
  let previous: { id: string; json: string; cloudIdentity: string } | null =
    null;

  const lookup = (id: string) =>
    options?.getScheduleById
      ? options.getScheduleById(id)
      : schedule.value?.id === id
        ? schedule.value
        : undefined;
  const cancelPendingBackup = () => {
    if (backupTimer !== null) window.clearTimeout(backupTimer);
    backupTimer = null;
  };
  watch(
    () => schedule.value?.id,
    () => {
      cancelPendingBackup();
      syncStatus.value = "idle";
    },
    { flush: "sync" }
  );

  async function attemptAutoBackup(
    requested: Schedule
  ): Promise<Schedule | undefined> {
    const latest = lookup(requested.id);
    if (!latest || !mounted) return undefined;
    if (latest.slug && latest.editToken) return latest;
    if (isScheduleSyncPaused(requested.id)) return latest;
    const pending = backupPromises.get(requested.id);
    if (pending) return pending;
    if (!latest.members.some(member => member.name.trim() !== ""))
      return latest;
    const source = latest;
    const sourceJson = JSON.stringify(toScheduleData(source));
    // Assigned after starting the request so its finally can remove only itself.
    // eslint-disable-next-line prefer-const -- the request can settle before initialization
    let currentBackupPromise!: Promise<Schedule | undefined>;
    const backupPromise = (async () => {
      if (schedule.value?.id === source.id) syncStatus.value = "syncing";
      try {
        const identity = await createSchedule(toScheduleData(source));
        if (!mounted) return undefined;
        const attachIdentity = (current: Schedule): Schedule =>
          current.id !== source.id || (current.slug && current.editToken)
            ? current
            : {
                ...current,
                slug: identity.slug,
                editToken: identity.editToken,
              };
        onScheduleUpdate?.(attachIdentity, source.id);
        const current = lookup(source.id);
        const updated = current ? attachIdentity(current) : undefined;
        const hasNewChanges =
          updated && JSON.stringify(toScheduleData(updated)) !== sourceJson;
        // Changes made during POST must reach the cloud even after switching tabs.
        if (updated && hasNewChanges) scheduleSyncDebounced(updated);
        if (schedule.value?.id === source.id)
          syncStatus.value = hasNewChanges ? "syncing" : "synced";
        return updated;
      } catch {
        if (mounted && schedule.value?.id === source.id)
          syncStatus.value = "error";
        return lookup(source.id);
      } finally {
        if (backupPromises.get(source.id) === currentBackupPromise)
          backupPromises.delete(source.id);
      }
    })();
    currentBackupPromise = backupPromise;
    backupPromises.set(source.id, backupPromise);
    return backupPromise;
  }

  async function prepareForManualSave(): Promise<Schedule | undefined> {
    const before = schedule.value;
    cancelPendingBackup();
    if (!before) return undefined;
    const backedUp = await backupPromises.get(before.id);
    const current = schedule.value;
    if (!mounted || current?.id !== before.id)
      throw new Error("The schedule changed while preparing to share.");
    // Credentials may arrive during POST; its older body must never replace edits.
    const latest = lookup(before.id) ?? current;
    return backedUp?.slug &&
      backedUp.editToken &&
      !(latest.slug && latest.editToken)
      ? { ...latest, slug: backedUp.slug, editToken: backedUp.editToken }
      : latest;
  }

  function canPull(current: Schedule | undefined): current is CloudSchedule {
    return (
      mounted &&
      !!current?.slug &&
      !!current.editToken &&
      !toValue(options?.isEditing) &&
      backupTimer === null &&
      !hasPendingSync(current.id) &&
      !isScheduleSyncPaused(current.id)
    );
  }
  async function pull() {
    const before = schedule.value;
    if (!onScheduleUpdate || !canPull(before)) return;
    const beforeJson = JSON.stringify(toScheduleData(before));
    let fetched;
    try {
      fetched = await getScheduleForEdit(before.slug, before.editToken);
    } catch {
      return;
    }
    const unchanged = (
      current: Schedule | undefined
    ): current is CloudSchedule =>
      canPull(current) &&
      schedule.value?.id === before.id &&
      current.id === before.id &&
      current.slug === before.slug &&
      current.editToken === before.editToken &&
      JSON.stringify(toScheduleData(current)) === beforeJson;
    if (!unchanged(schedule.value)) return;
    const serverData = {
      name: fetched.name,
      rotation: fetched.rotation,
      groups: fetched.groups,
      members: fetched.members,
      rotationConfig: fetched.rotationConfig,
      assignmentMode: fetched.assignmentMode,
      designThemeId: fetched.designThemeId,
      fontId: fetched.fontId ?? before.fontId,
    };
    const mergedJson = JSON.stringify(serverData);
    if (mergedJson === beforeJson) return;
    adoptedJson = `${before.id}:${mergedJson}`;
    onScheduleUpdate(
      current => (unchanged(current) ? { ...current, ...serverData } : current),
      before.id
    );
  }

  function processChange(current: Schedule | undefined) {
    if (!mounted || !current) return;
    const json = JSON.stringify(toScheduleData(current));
    const cloudIdentity = `${current.slug ?? ""}:${current.editToken ?? ""}`;
    const before = previous;
    previous = { id: current.id, json, cloudIdentity };
    if (adoptedJson === `${current.id}:${json}`) {
      adoptedJson = null;
      return;
    }
    const sameSchedule = before?.id === current.id;
    if (!sameSchedule && restorePendingScheduleSync(current)) return;
    const changed = sameSchedule && before.json !== json;
    const gainedIdentity =
      sameSchedule && before.cloudIdentity !== cloudIdentity;
    const newlySelectedLocal =
      before && !sameSchedule && !(current.slug && current.editToken);
    if (!changed && !gainedIdentity && !newlySelectedLocal) return;
    if (current.slug && current.editToken) {
      cancelPendingBackup();
      scheduleSyncDebounced(current);
    } else if (onScheduleUpdate) {
      cancelPendingBackup();
      backupTimer = window.setTimeout(() => {
        backupTimer = null;
        const latest = schedule.value;
        if (
          !latest ||
          latest.id !== current.id ||
          (latest.slug && latest.editToken)
        )
          return;
        void attemptAutoBackup(latest);
      }, BACKUP_DEBOUNCE_MS);
    }
  }
  function pullSelected() {
    const current = schedule.value;
    const key = `${current?.id ?? ""}:${current?.slug ?? ""}:${current?.editToken ?? ""}`;
    if (pulledKey === key) return;
    pulledKey = key;
    void pull();
  }
  watch(
    schedule,
    current => {
      processChange(current);
      pullSelected();
    },
    { flush: "post" }
  );
  const beforeUnload = () => {
    cancelPendingBackup();
    const current = schedule.value;
    if (current?.slug && current.editToken)
      void flushPendingSync(current.id, { keepalive: true });
  };
  const retrySync = () => {
    const current = schedule.value;
    if (!current) return;
    if (current.slug && current.editToken) void flushPendingSync(current.id);
    else if (onScheduleUpdate) void attemptAutoBackup(current);
  };
  const visibilityChanged = () => {
    if (document.visibilityState !== "visible") return;
    void pull();
    retrySync();
  };
  onMounted(() => {
    mounted = true;
    setSyncStatusCallback((id, value) => {
      if (id === schedule.value?.id) syncStatus.value = value;
    });
    processChange(schedule.value);
    pullSelected();
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("online", retrySync);
    document.addEventListener("visibilitychange", visibilityChanged);
  });
  onScopeDispose(() => {
    mounted = false;
    cancelPendingBackup();
    setSyncStatusCallback(null);
    window.removeEventListener("beforeunload", beforeUnload);
    window.removeEventListener("online", retrySync);
    document.removeEventListener("visibilitychange", visibilityChanged);
  });
  return reactive({ syncStatus, cancelPendingBackup, prepareForManualSave });
}
