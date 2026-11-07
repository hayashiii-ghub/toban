import { defineView } from "@/lib/vue";
import { Teleport } from "vue";
import { AnimatePresence } from "motion-v";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { NewScheduleModal } from "@/components/NewScheduleModal";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { ShareModal } from "@/components/ShareModal";
import type { ModalType } from "@/hooks/useModalManager";
import type { ScheduleSettings } from "@/hooks/useScheduleManager";
import type { Schedule, ScheduleTemplate } from "@/rotation/types";
interface ModalHostProps {
  modalType: ModalType;
  deleteTargetId: string | null;
  showShare: boolean;
  activeSchedule: Schedule;
  schedules: Schedule[];
  onAddSchedule: (template: ScheduleTemplate) => void;
  onDeleteSchedule: (id: string) => void;
  onDuplicateSchedule: () => void;
  onSaveSettings: (settings: ScheduleSettings) => void;
  onCloseModal: () => void;
  onRequestDelete: () => void;
  onCloseShare: () => void;
}
export const ModalHost = defineView<ModalHostProps>(
  [
    "modalType",
    "deleteTargetId",
    "showShare",
    "activeSchedule",
    "schedules",
    "onAddSchedule",
    "onDeleteSchedule",
    "onDuplicateSchedule",
    "onSaveSettings",
    "onCloseModal",
    "onRequestDelete",
    "onCloseShare",
  ],
  (props, _viewContext) => {
    return () => (
      <>
        <Teleport to="body">
          <AnimatePresence>
            {props.modalType === "newSchedule" && (
              <NewScheduleModal
                onSelect={props.onAddSchedule}
                onClose={props.onCloseModal}
              />
            )}
          </AnimatePresence>
        </Teleport>
        <Teleport to="body">
          <AnimatePresence>
            {props.modalType === "confirmDelete" && props.deleteTargetId && (
              <ConfirmDeleteDialog
                scheduleName={
                  props.schedules.find(s => s.id === props.deleteTargetId)
                    ?.name ?? ""
                }
                onConfirm={() => props.onDeleteSchedule(props.deleteTargetId!)}
                onCancel={props.onCloseModal}
              />
            )}
          </AnimatePresence>
        </Teleport>
        <Teleport to="body">
          <AnimatePresence>
            {props.modalType === "settings" && (
              <SettingsModal
                scheduleName={props.activeSchedule.name}
                groups={props.activeSchedule.groups}
                members={props.activeSchedule.members}
                rotationConfig={props.activeSchedule.rotationConfig}
                pinned={props.activeSchedule.pinned}
                assignmentMode={props.activeSchedule.assignmentMode}
                designThemeId={props.activeSchedule.designThemeId}
                fontId={props.activeSchedule.fontId}
                canDelete={props.schedules.length > 1}
                onSave={props.onSaveSettings}
                onDuplicate={props.onDuplicateSchedule}
                onDelete={props.onRequestDelete}
                onClose={props.onCloseModal}
              />
            )}
          </AnimatePresence>
        </Teleport>
        <Teleport to="body">
          <AnimatePresence>
            {props.showShare &&
              props.activeSchedule.slug &&
              props.activeSchedule.editToken && (
                <ShareModal
                  slug={props.activeSchedule.slug}
                  editToken={props.activeSchedule.editToken}
                  scheduleName={props.activeSchedule.name}
                  canAddToCalendar={
                    props.activeSchedule.rotationConfig?.mode === "date"
                  }
                  onClose={props.onCloseShare}
                />
              )}
          </AnimatePresence>
        </Teleport>
      </>
    );
  }
);
