import { defineView, stateSetter } from "@/lib/vue";
import { shallowRef, computed } from "vue";
import type { Member, TaskGroup } from "@/rotation/types";
import { MEMBER_PRESETS } from "@/rotation/constants";
import { generateId, deepClone } from "@/rotation/utils";
import { parseNames } from "@/rotation/templateSetup";
import { useT } from "@/i18n";
import { toast } from "vue-sonner";
import { LIMITS } from "@shared/limits";
interface Props {
  members: Member[];
  groups: TaskGroup[];
  activeMemberIds: string[];
  isTaskMode: boolean;
  onMembersChange: (members: Member[]) => void;
  onGroupsChange: (groups: TaskGroup[]) => void;
  onClose: () => void;
}
export const BulkMemberAdd = defineView<Props>(
  [
    "members",
    "groups",
    "activeMemberIds",
    "isTaskMode",
    "onMembersChange",
    "onGroupsChange",
    "onClose",
  ],
  (props, _viewContext) => {
    const t = useT();
    const bulkText = shallowRef(""),
      setBulkText = stateSetter(bulkText);
    const bulkNames = computed(() => parseNames(bulkText.value));
    const handleBulkAdd = () => {
      if (bulkNames.value.length === 0) return;
      if (props.members.length + bulkNames.value.length > LIMITS.members) {
        toast.error(t("settings.maxMembersReached", { n: LIMITS.members }));
        return;
      }
      if (
        !props.isTaskMode &&
        props.groups.length + bulkNames.value.length > LIMITS.groups
      ) {
        toast.error(t("settings.maxGroupsReached", { n: LIMITS.groups }));
        return;
      }
      const newMembers = bulkNames.value.map((name, i) => {
        const preset =
          MEMBER_PRESETS[(props.members.length + i) % MEMBER_PRESETS.length];
        return { id: generateId("m"), name, ...preset } as Member;
      });
      if (props.isTaskMode) {
        props.onMembersChange([...props.members, ...newMembers]);
        const next = deepClone(props.groups);
        const newIds = newMembers.map(m => m.id);
        for (const group of next) {
          const existing = group.memberIds ?? props.activeMemberIds;
          group.memberIds = [...existing, ...newIds];
        }
        props.onGroupsChange(next);
      } else {
        const newGroups = newMembers.map(
          () =>
            ({
              id: generateId("g"),
              tasks: [t("settings.newTask")],
              emoji: "✨",
            }) as TaskGroup
        );
        props.onMembersChange([...props.members, ...newMembers]);
        props.onGroupsChange([...props.groups, ...newGroups]);
      }
      setBulkText("");
      props.onClose();
    };
    return () => (
      <div class="flex flex-col gap-2">
        <textarea
          value={bulkText.value}
          onInput={e => setBulkText((e.target as HTMLInputElement).value)}
          placeholder={
            props.isTaskMode
              ? t("bulk.placeholderTask")
              : t("bulk.placeholderMember")
          }
          rows={5}
          class="theme-border px-3 py-2 text-sm font-medium resize-none"
          style={{
            borderRadius: "var(--dt-border-radius-sm)",
            backgroundColor: "var(--dt-button-bg)",
          }}
          aria-label={
            props.isTaskMode ? t("bulk.ariaTask") : t("bulk.ariaMember")
          }
        />
        {bulkNames.value.length > 0 && (
          <p
            class="text-xs font-bold"
            style={{ color: "var(--dt-text-secondary)" }}
          >
            {t("bulk.willAdd", { n: bulkNames.value.length })}
          </p>
        )}
        <button
          type="button"
          onClick={handleBulkAdd}
          disabled={bulkNames.value.length === 0}
          class="theme-border theme-shadow-sm flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm transition-all duration-150 theme-hover-lift disabled:opacity-40"
          // 編集画面の「保存する」と同じ色
          style={{
            backgroundColor: "var(--dt-control-bar-bg)",
            color: "var(--dt-control-bar-text)",
            borderRadius: "10px",
          }}
        >
          {t("bulk.add")}
        </button>
      </div>
    );
  }
);
