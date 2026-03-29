import { useCallback, useState } from "react";

export type ModalType = "settings" | "newSchedule" | "confirmDelete" | null;

export interface ModalState {
  type: ModalType;
  /** confirmDelete 時の対象 scheduleId */
  deleteTargetId: string | null;
}

export function useModalManager() {
  const [modal, setModal] = useState<ModalState>({ type: null, deleteTargetId: null });

  const openSettings = useCallback(() => setModal({ type: "settings", deleteTargetId: null }), []);
  const openNewSchedule = useCallback(() => setModal({ type: "newSchedule", deleteTargetId: null }), []);
  const openConfirmDelete = useCallback((scheduleId: string) => setModal({ type: "confirmDelete", deleteTargetId: scheduleId }), []);
  const closeModal = useCallback(() => setModal({ type: null, deleteTargetId: null }), []);

  return {
    modal,
    openSettings,
    openNewSchedule,
    openConfirmDelete,
    closeModal,
  };
}
