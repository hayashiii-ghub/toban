import {
  Teleport,
  onMounted,
  onScopeDispose,
  ref,
  watch,
  type Ref,
  type VNodeChild,
} from "vue";
import { defineView } from "@/lib/vue";

interface PopoverMenuProps {
  /** 開いたボタンやタブの位置。メニューはこの下（入らなければ上）に出す */
  anchor: DOMRect;
  /** start はメニューの左端を、end は右端を anchor に揃える */
  align?: "start" | "end";
  label: string;
  /** 何も選ばずに閉じた（外を押した・Esc・Tab・スクロール） */
  onDismiss: () => void;
  /** 開いたボタン。押したときは開け閉めをボタンに任せる */
  triggerRef?: Ref<HTMLElement | null>;
  children?: VNodeChild;
}
const EDGE = 8;
const GAP = 6;
const ITEMS = '[role="menuitem"]:not(:disabled)';

export const PopoverMenu = defineView<PopoverMenuProps>(
  ["anchor", "align", "label", "onDismiss", "triggerRef", "children"],
  (props, { slots }) => {
    const menuRef = ref<HTMLDivElement | null>(null);
    // 描いた後の大きさから直接配置し、位置の再描画によるちらつきを避ける。
    function placeMenu() {
      const element = menuRef.value;
      if (!element) return;
      const anchor = props.anchor;
      const below = anchor.bottom + GAP;
      const top =
        below + element.offsetHeight <= window.innerHeight - EDGE
          ? below
          : Math.max(EDGE, anchor.top - GAP - element.offsetHeight);
      const preferred =
        props.align === "end"
          ? anchor.right - element.offsetWidth
          : anchor.left;
      const left = Math.min(
        Math.max(EDGE, preferred),
        window.innerWidth - element.offsetWidth - EDGE
      );
      element.style.top = `${top}px`;
      element.style.left = `${left}px`;
    }
    watch(() => [props.anchor, props.align], placeMenu, { flush: "post" });
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (props.triggerRef?.value?.contains(target)) return;
      if (!menuRef.value?.contains(target)) props.onDismiss();
    }
    const handleMoved = () => props.onDismiss();
    onMounted(() => {
      placeMenu();
      menuRef.value?.querySelector<HTMLElement>(ITEMS)?.focus();
      document.addEventListener("pointerdown", handlePointerDown, true);
      window.addEventListener("resize", handleMoved);
      window.addEventListener("scroll", handleMoved, true);
    });
    onScopeDispose(() => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("resize", handleMoved);
      window.removeEventListener("scroll", handleMoved, true);
    });
    function handleKeyDown(event: KeyboardEvent) {
      const items = [
        ...(menuRef.value?.querySelectorAll<HTMLElement>(ITEMS) ?? []),
      ];
      const index = items.indexOf(document.activeElement as HTMLElement);
      const focusAt = (position: number) =>
        items[(position + items.length) % items.length]?.focus();
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          focusAt(index + 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          focusAt(index - 1);
          break;
        case "Home":
          event.preventDefault();
          focusAt(0);
          break;
        case "End":
          event.preventDefault();
          focusAt(items.length - 1);
          break;
        case "Escape":
        case "Tab":
          event.preventDefault();
          props.onDismiss();
          break;
      }
    }
    return () => (
      <Teleport to={document.body}>
        <div
          ref={menuRef}
          role="menu"
          aria-label={props.label}
          onKeydown={handleKeyDown}
          class="fixed z-50 min-w-[11rem] py-1 theme-border theme-shadow rotation-no-print"
          style={{
            top: "-9999px",
            left: "-9999px",
            backgroundColor: "var(--dt-card-bg)",
            borderRadius: "var(--dt-border-radius-sm)",
          }}
        >
          {slots.default?.() ?? props.children}
        </div>
      </Teleport>
    );
  }
);

const ITEM_CLASS =
  "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold text-left outline-none transition-colors hover:bg-black/5 focus-visible:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent";
type PopoverMenuItemProps = {
  icon: VNodeChild;
  children?: VNodeChild;
  danger?: boolean;
} & (
  | { onSelect: () => void; disabled?: boolean; href?: never; newTab?: never }
  | { href: string; newTab?: boolean; onSelect?: () => void; disabled?: never }
);

/** onSelect ならボタン、href ならリンクになる */
export const PopoverMenuItem = defineView<PopoverMenuItemProps>(
  ["icon", "children", "danger", "onSelect", "disabled", "href", "newTab"],
  (props, { slots }) =>
    () => {
      const style = { color: props.danger ? "#DC2626" : "var(--dt-text)" };
      const content = slots.default?.() ?? props.children;
      if (props.href !== undefined)
        return (
          <a
            role="menuitem"
            href={props.href}
            onClick={props.onSelect}
            {...(props.newTab
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            class={ITEM_CLASS}
            style={style}
          >
            {props.icon}
            {content}
          </a>
        );
      return (
        <button
          type="button"
          role="menuitem"
          disabled={props.disabled}
          onClick={props.onSelect}
          class={ITEM_CLASS}
          style={style}
        >
          {props.icon}
          {content}
        </button>
      );
    }
);
export const PopoverMenuSeparator = defineView<object>([], () => () => (
  <div
    role="separator"
    class="my-1"
    style={{ borderTop: "1px solid var(--dt-table-border-light)" }}
  />
));
