import { reactive, shallowRef } from "vue";

export type ModalType = "settings" | "newSchedule" | "confirmDelete" | null;
interface ModalState {
  type: ModalType;
  /** confirmDelete 時の対象 scheduleId */
  deleteTargetId: string | null;
}
export function useModalManager() {
  const modal = shallowRef<ModalState>({ type: null, deleteTargetId: null });
  const openSettings = () => {
    modal.value = { type: "settings", deleteTargetId: null };
  };
  const openNewSchedule = () => {
    modal.value = { type: "newSchedule", deleteTargetId: null };
  };
  const openConfirmDelete = (scheduleId: string) => {
    modal.value = { type: "confirmDelete", deleteTargetId: scheduleId };
  };
  const closeModal = () => {
    modal.value = { type: null, deleteTargetId: null };
  };
  return reactive({
    modal,
    openSettings,
    openNewSchedule,
    openConfirmDelete,
    closeModal,
  });
}
