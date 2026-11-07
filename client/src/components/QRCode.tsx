import qrcode from "qrcode-generator";
import type { CSSProperties } from "vue";
import { defineView } from "@/lib/vue";

interface QRCodeProps {
  value: string;
  size?: number;
  level?: "L" | "M" | "Q" | "H";
  bgColor?: string;
  fgColor?: string;
  title?: string;
  class?: string;
  style?: CSSProperties;
}
// Keep the same UTF-8 conversion and cell paths as the previous QR renderer.
qrcode.stringToBytes = value => Array.from(new TextEncoder().encode(value));
const QRCode = defineView<QRCodeProps>(
  ["value", "size", "level", "bgColor", "fgColor", "title", "class", "style"],
  (props, { attrs }) =>
    () => {
      const qr = qrcode(0, props.level ?? "L");
      qr.addData(props.value);
      qr.make();
      const count = qr.getModuleCount();
      const paths = (dark: boolean) =>
        Array.from({ length: count }, (_, row) =>
          Array.from({ length: count }, (_, column) =>
            qr.isDark(row, column) === dark
              ? `M ${column} ${row} l 1 0 0 1 -1 0 Z`
              : ""
          ).join(" ")
        ).join(" ");
      return (
        <svg
          {...attrs}
          height={props.size ?? 256}
          width={props.size ?? 256}
          viewBox={`0 0 ${count} ${count}`}
          xmlns="http://www.w3.org/2000/svg"
          class={props.class}
          style={props.style}
        >
          {props.title ? <title>{props.title}</title> : null}
          <path d={paths(false)} fill={props.bgColor ?? "#FFFFFF"} />
          <path d={paths(true)} fill={props.fgColor ?? "#000000"} />
        </svg>
      );
    }
);
export default QRCode;
