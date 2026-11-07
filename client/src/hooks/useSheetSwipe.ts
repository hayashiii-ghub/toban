import type { Ref } from "vue";
// スマホで下から出る画面（幅 640px 未満）を、上の見出しを下になでて閉じる。PC の真ん中に出る形では何もしない。
// 見出しには touch-action: none を付けておく（付けないと、ブラウザが引っぱって更新などに使い、指の動きが届かない）
const CLOSE_DISTANCE = 96;
// これだけ動かして、この速さ（px/ms）より速く払ったら、短くても閉じる
const FLICK_DISTANCE = 24;
const FLICK_SPEED = 0.5;
/**
 * 見出しの onPointerDown に渡す関数を返す。
 * onClose が false を返したら（保存していない変更の確認で取り消した、など）元の位置へ戻す
 */
export function useSheetSwipe(
  sheetRef: Ref<HTMLElement | null>,
  onClose: () => boolean | void
) {
  return (e: PointerEvent) => {
    const sheet = sheetRef.value;
    if (!sheet || window.matchMedia?.("(min-width: 640px)").matches) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // 見出しの中のボタン（×）は、そのまま押せるようにする
    if ((e.target as Element).closest("button, a, input, select, textarea"))
      return;
    const handle = e.currentTarget as HTMLElement;
    const id = e.pointerId;
    const startY = e.clientY;
    let dy = 0;
    let lastY = startY;
    let lastTime = e.timeStamp;
    let speed = 0;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      speed = (ev.clientY - lastY) / Math.max(1, ev.timeStamp - lastTime);
      lastY = ev.clientY;
      lastTime = ev.timeStamp;
      dy = Math.max(0, ev.clientY - startY);
      // transform は framer-motion が出入りの動きに使うので、ぶつからない translate で動かす
      sheet.style.setProperty("translate", `0 ${dy}px`);
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      if (handle.hasPointerCapture?.(id)) handle.releasePointerCapture(id);
      const wantsClose =
        ev.type === "pointerup" &&
        (dy > CLOSE_DISTANCE || (dy > FLICK_DISTANCE && speed > FLICK_SPEED));
      // 閉じるときは translate を残し、そのまま閉じる動きにつなぐ
      if (wantsClose && onClose() !== false) return;
      if (!dy) {
        sheet.style.removeProperty("translate");
        return;
      }
      sheet.style.setProperty("transition", "translate 0.2s ease-out");
      sheet.style.setProperty("translate", "0 0");
      window.setTimeout(() => {
        sheet.style.removeProperty("transition");
        sheet.style.removeProperty("translate");
      }, 200);
    };
    handle.setPointerCapture?.(id);
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  };
}
