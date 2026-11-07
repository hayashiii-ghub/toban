import {
  computed,
  onScopeDispose,
  reactive,
  shallowRef,
  toValue,
  type MaybeRefOrGetter,
} from "vue";
import { stateSetter } from "@/lib/vue";
// HTML の drag and drop はスマホの指では動かないので、並べ替えは pointer イベントで作る（マウスも指も同じ動き）。
// 動かすものには data-drag-item を付ける（つまむ印はその中に置く）。落とせる所は target が返すセレクターで探す。
// 動かしている間は、そのものが指に付いてきて、下にある落とせる所を onOver で知らせ、離したら onDrop で返す。
/** これだけ動いたら、押しただけではなく動かし始めたとみなす（px） */
const START_DISTANCE = 4;
/** 長押しを待つあいだに、これより動いたらスクロールとみなしてやめる（px） */
const HOLD_SLOP = 10;
/** 箱の端からこの距離に入ったら、箱をスクロールさせる（px） */
const EDGE = 48;
const MAX_SCROLL_STEP = 14;
type Axis = "x" | "y";
const LIFT_STYLES = [
  "translate",
  "z-index",
  "pointer-events",
  "box-shadow",
  "position",
] as const;
interface Options<T> {
  /** 動かす向き。既定は縦 */
  axis?: Axis;
  /** 落とせる所のセレクター。動かしているものごとに変えられる */
  target: (item: T) => string;
  /**
   * 指で押したまま、この時間が過ぎてから動かせるようにする（ms）。マウスは待たない。
   * 横にスクロールする並び（当番表のタブ）で、スクロールと取り違えないため
   */
  holdDelay?: number;
  /** 動かし始めたとき（長押しで開いたメニューを閉じる、など） */
  onStart?: (item: T) => void;
  onOver?: (item: T, target: Element | null) => void;
  onDrop: (item: T, target: Element) => void;
  /** 動かし終えたとき（落とした・やめたのどちらでも） */
  onEnd?: () => void;
}
type Phase = "waiting" | "ready" | "dragging";
interface Session<T> {
  item: T;
  pointerId: number;
  row: HTMLElement;
  scroller: HTMLElement | null;
  startX: number;
  startY: number;
  x: number;
  y: number;
  /** 長押しが済んだときの指の位置。そこから動いたら動かし始める */
  readyX: number;
  readyY: number;
  scrollStart: number;
  phase: Phase;
  over: Element | null;
  timer: number | undefined;
  frame: number | undefined;
  detach: () => void;
}
function scrollParentOf(el: HTMLElement, axis: Axis): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    const overflow = axis === "y" ? style.overflowY : style.overflowX;
    if (overflow === "auto" || overflow === "scroll") return node;
  }
  return null;
}
export function usePointerDrag<T>(options: MaybeRefOrGetter<Options<T>>) {
  // 動かしている途中の listener から、いちばん新しい options を読む
  const optionsRef = computed(() => toValue(options));
  const sessionRef = shallowRef<Session<T> | null>(null);
  const dragging = shallowRef<T | null>(null);
  const setDragging = stateSetter(dragging);
  const finish = (drop: boolean) => {
    const s = sessionRef.value;
    if (!s) return;
    sessionRef.value = null;
    window.clearTimeout(s.timer);
    if (s.frame !== undefined) cancelAnimationFrame(s.frame);
    s.detach();
    if (s.phase === "dragging") {
      for (const key of LIFT_STYLES) s.row.style.removeProperty(key);
      // 元の位置へ戻るのを transition で見せない（戻してから transition を外す）
      void s.row.offsetWidth;
      s.row.style.removeProperty("transition");
      // 離した直後に、動かしたもの自身へ来る click（タブを選ぶ、など）を 1 回だけ飲み込む
      const row = s.row;
      const swallow = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
      };
      row.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(
        () => row.removeEventListener("click", swallow, { capture: true }),
        0
      );
      if (drop && s.over) optionsRef.value.onDrop(s.item, s.over);
      optionsRef.value.onEnd?.();
      setDragging(null);
    }
  };
  onScopeDispose(() => finish(false));
  const bind = (item: T) => ({
    onPointerdown: (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (sessionRef.value) finish(false);
      const axis = optionsRef.value.axis ?? "y";
      const handle = e.currentTarget as HTMLElement;
      const row = handle.closest<HTMLElement>("[data-drag-item]") ?? handle;
      const scroller = scrollParentOf(row, axis);
      const waitForHold =
        e.pointerType !== "mouse" && !!optionsRef.value.holdDelay;
      const position = (s: Session<T>) => {
        const scrolled = s.scroller
          ? (axis === "y" ? s.scroller.scrollTop : s.scroller.scrollLeft) -
            s.scrollStart
          : 0;
        const delta =
          (axis === "y" ? s.y - s.startY : s.x - s.startX) + scrolled;
        // transform は framer-motion などが使うので、ぶつからない translate で動かす
        s.row.style.setProperty(
          "translate",
          axis === "y" ? `0 ${delta}px` : `${delta}px 0`
        );
        const under = document
          .elementFromPoint?.(s.x, s.y)
          ?.closest(optionsRef.value.target(s.item));
        const over = under && under !== s.row ? under : null;
        if (over !== s.over) {
          s.over = over;
          optionsRef.value.onOver?.(s.item, over);
        }
      };
      // 箱の端に近づいたら、少しずつスクロールする
      const autoScroll = () => {
        const s = sessionRef.value;
        if (!s || s.phase !== "dragging") return;
        if (s.scroller) {
          const rect = s.scroller.getBoundingClientRect();
          const [p, lo, hi] =
            axis === "y"
              ? [s.y, rect.top, rect.bottom]
              : [s.x, rect.left, rect.right];
          const step =
            p < lo + EDGE
              ? -Math.ceil(((lo + EDGE - p) / EDGE) * MAX_SCROLL_STEP)
              : p > hi - EDGE
                ? Math.ceil(((p - (hi - EDGE)) / EDGE) * MAX_SCROLL_STEP)
                : 0;
          if (step) {
            if (axis === "y") s.scroller.scrollTop += step;
            else s.scroller.scrollLeft += step;
            position(s);
          }
        }
        s.frame = requestAnimationFrame(autoScroll);
      };
      const startDragging = (s: Session<T>) => {
        s.phase = "dragging";
        const style = s.row.style;
        if (getComputedStyle(s.row).position === "static")
          style.setProperty("position", "relative");
        style.setProperty("z-index", "20");
        // 下にある落とせる所を elementFromPoint で拾えるよう、動かしているものは指を通す
        style.setProperty("pointer-events", "none");
        style.setProperty("box-shadow", "var(--dt-shadow-card-lg)");
        // 指に遅れず付いてくるよう、行の transition を止める
        style.setProperty("transition", "none");
        setDragging(s.item);
        optionsRef.value.onStart?.(s.item);
        position(s);
        s.frame = requestAnimationFrame(autoScroll);
      };
      const onMove = (ev: PointerEvent) => {
        const s = sessionRef.value;
        if (!s || ev.pointerId !== s.pointerId) return;
        s.x = ev.clientX;
        s.y = ev.clientY;
        const moved = Math.hypot(s.x - s.startX, s.y - s.startY);
        if (s.phase === "waiting") {
          if (waitForHold) {
            if (moved > HOLD_SLOP) finish(false);
          } else if (moved > START_DISTANCE) startDragging(s);
        } else if (s.phase === "ready") {
          if (Math.hypot(s.x - s.readyX, s.y - s.readyY) > START_DISTANCE)
            startDragging(s);
        } else {
          position(s);
        }
      };
      const onUp = (ev: PointerEvent) => {
        if (sessionRef.value?.pointerId === ev.pointerId) finish(true);
      };
      const onCancel = (ev: PointerEvent) => {
        if (sessionRef.value?.pointerId === ev.pointerId) finish(false);
      };
      handle.setPointerCapture?.(e.pointerId);
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onCancel);
      const session: Session<T> = {
        item,
        pointerId: e.pointerId,
        row,
        scroller,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        readyX: e.clientX,
        readyY: e.clientY,
        scrollStart: scroller
          ? axis === "y"
            ? scroller.scrollTop
            : scroller.scrollLeft
          : 0,
        phase: "waiting",
        over: null,
        timer: undefined,
        frame: undefined,
        detach: () => {
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", onUp);
          handle.removeEventListener("pointercancel", onCancel);
          if (handle.hasPointerCapture?.(e.pointerId))
            handle.releasePointerCapture(e.pointerId);
        },
      };
      if (waitForHold) {
        session.timer = window.setTimeout(() => {
          if (sessionRef.value !== session) return;
          session.phase = "ready";
          session.readyX = session.x;
          session.readyY = session.y;
        }, optionsRef.value.holdDelay);
      }
      sessionRef.value = session;
    },
  });
  /**
   * 長押しのあと・動かしている間なら true。並びの touchmove で preventDefault するのに使う。
   * その listener は指が触れる前から付けておく（触れてから付けても、ブラウザがもうスクロールを始めている）
   */
  const holdsPointer = () =>
    !!sessionRef.value && sessionRef.value.phase !== "waiting";
  return reactive({ dragging, bind, holdsPointer });
}
