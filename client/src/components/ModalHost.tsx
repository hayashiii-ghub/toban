import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { NewScheduleModal } from "@/components/NewScheduleModal";
import { SettingsModal } from "@/components/SettingsModal";
import { ShareModal } from "@/components/ShareModal";
import type { ModalType } from "@/hooks/useModalManager";
import type { Schedule, TaskGroup, Member, RotationConfig, AssignmentMode } from "@/rotation/types";

interface ModalHostProps {
  modalType: ModalType;
  deleteTargetId: string | null;
  showShare: boolean;
  activeSchedule: Schedule;
  schedules: Schedule[];
  onAddSchedule: (template: Parameters<typeof NewScheduleModal>[0]["onSelect"] extends (t: infer T) => void ? T : never) => void;
  onDeleteSchedule: (id: string) => void;
  onDuplicateSchedule: () => void;
  onSaveSettings: (name: string, groups: TaskGroup[], members: Member[], rotationConfig?: RotationConfig, pinned?: boolean, assignmentMode?: AssignmentMode, designThemeId?: string) => void;
  onCloseModal: () => void;
  onRequestDelete: () => void;
  onCloseShare: () => void;
}

export function ModalHost({
  modalType,
  deleteTargetId,
  showShare,
  activeSchedule,
  schedules,
  onAddSchedule,
  onDeleteSchedule,
  onDuplicateSchedule,
  onSaveSettings,
  onCloseModal,
  onRequestDelete,
  onCloseShare,
}: ModalHostProps) {
  return (
    <>
      {createPortal(
        <AnimatePresence>
          {modalType === "newSchedule" && (
            <NewScheduleModal onSelect={onAddSchedule} onClose={onCloseModal} />
          )}
        </AnimatePresence>,
        document.body,
      )}
      {createPortal(
        <AnimatePresence>
          {modalType === "confirmDelete" && deleteTargetId && (
            <ConfirmDeleteDialog
              scheduleName={schedules.find((s) => s.id === deleteTargetId)?.name ?? ""}
              onConfirm={() => onDeleteSchedule(deleteTargetId)}
              onCancel={onCloseModal}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
      {createPortal(
        <AnimatePresence>
          {modalType === "settings" && (
            <SettingsModal
              scheduleName={activeSchedule.name}
              groups={activeSchedule.groups}
              members={activeSchedule.members}
              rotationConfig={activeSchedule.rotationConfig}
              pinned={activeSchedule.pinned}
              assignmentMode={activeSchedule.assignmentMode}
              designThemeId={activeSchedule.designThemeId}
              canDelete={schedules.length > 1}
              onSave={onSaveSettings}
              onDuplicate={onDuplicateSchedule}
              onDelete={onRequestDelete}
              onClose={onCloseModal}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
      {createPortal(
        <AnimatePresence>
          {showShare && activeSchedule.slug && activeSchedule.editToken && (
            <ShareModal
              slug={activeSchedule.slug}
              editToken={activeSchedule.editToken}
              scheduleName={activeSchedule.name}
              onClose={onCloseShare}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
