import { computed, reactive, shallowRef } from "vue";
import type { ScheduleSettings } from "@/hooks/useScheduleManager";
import type { RotationConfig } from "@/rotation/types";
import { getSavedFontId } from "@/fonts";
import {
  changeDraftAssignmentMode,
  createSettingsDraft,
  type SettingsDraft,
} from "./settingsDraft";

export function useSettingsDraft(settings: ScheduleSettings) {
  const initial = createSettingsDraft(settings, getSavedFontId());
  const draft = shallowRef(initial);
  const initialJson = JSON.stringify(initial);
  const isDirty = computed(() => JSON.stringify(draft.value) !== initialJson);

  const applyPatch = (patch: Partial<SettingsDraft>) => {
    draft.value = { ...draft.value, ...patch };
  };
  const updateRotationConfig = (
    updater: (current: RotationConfig) => RotationConfig
  ) => {
    draft.value = {
      ...draft.value,
      rotationConfig: updater(draft.value.rotationConfig),
    };
  };
  const changeAssignmentMode = (
    mode: SettingsDraft["assignmentMode"],
    newTaskName: string
  ) => {
    draft.value = changeDraftAssignmentMode(draft.value, mode, newTaskName);
  };

  return reactive({
    draft,
    initial,
    isDirty,
    applyPatch,
    updateRotationConfig,
    changeAssignmentMode,
  });
}
