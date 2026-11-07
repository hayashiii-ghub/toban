import { defineView } from "@/lib/vue";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Pin,
  PinOff,
  Trash2,
} from "@lucide/vue";
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuSeparator,
} from "@/components/PopoverMenu";
import { useT } from "@/i18n";

export interface TabMenuTarget {
  scheduleId: string;
  name: string;
  pinned: boolean;
  /** 開いたタブの位置 */
  anchor: DOMRect;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  canDelete: boolean;
}

interface TabMenuProps {
  target: TabMenuTarget;
  onTogglePin: () => void;
  onMove: (dir: "left" | "right") => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDismiss: () => void;
}

/** 当番表タブを長押し・右クリック・ダブルクリック・Shift+F10 したときのメニュー */
export const TabMenu = defineView<TabMenuProps>(
  ["target", "onTogglePin", "onMove", "onDuplicate", "onDelete", "onDismiss"],
  props => {
    const t = useT();
    return () => {
      const { target, onTogglePin, onMove, onDuplicate, onDelete, onDismiss } =
        props;

      return (
        <PopoverMenu
          anchor={target.anchor}
          label={t("tabs.menuAria", { name: target.name })}
          onDismiss={onDismiss}
        >
          <PopoverMenuItem
            icon={
              target.pinned ? (
                <PinOff class="size-4" aria-hidden="true" />
              ) : (
                <Pin class="size-4" aria-hidden="true" />
              )
            }
            onSelect={onTogglePin}
          >
            {target.pinned ? t("tabs.menu.unpin") : t("tabs.menu.pin")}
          </PopoverMenuItem>
          {/* ピン留めしたタブは先頭に固定されるので、並べ替えの対象にしない */}
          {!target.pinned && (
            <>
              <PopoverMenuItem
                icon={<ChevronLeft class="size-4" aria-hidden="true" />}
                disabled={!target.canMoveLeft}
                onSelect={() => onMove("left")}
              >
                {t("tabs.menu.moveLeft")}
              </PopoverMenuItem>
              <PopoverMenuItem
                icon={<ChevronRight class="size-4" aria-hidden="true" />}
                disabled={!target.canMoveRight}
                onSelect={() => onMove("right")}
              >
                {t("tabs.menu.moveRight")}
              </PopoverMenuItem>
            </>
          )}
          <PopoverMenuItem
            icon={<Copy class="size-4" aria-hidden="true" />}
            onSelect={onDuplicate}
          >
            {t("common.duplicate")}
          </PopoverMenuItem>
          {target.canDelete && (
            <>
              <PopoverMenuSeparator />
              <PopoverMenuItem
                icon={<Trash2 class="size-4" aria-hidden="true" />}
                danger
                onSelect={onDelete}
              >
                {t("common.delete")}
              </PopoverMenuItem>
            </>
          )}
        </PopoverMenu>
      );
    };
  }
);
