import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.resolve(projectRoot, "client/public/og-image.png");

// ブランドフェイスは Kiwi Maru（やわらかい明朝系・300/400/500 のみ）。
// resvg はシステムフォント依存のため、Kiwi Maru を確実に描画できるよう
// フォントファイルを明示ロードする。リポジトリには含めず（軽量優先）、
// 無ければ Google Fonts から取得して scripts/fonts/ にキャッシュする。
const fontDir = path.resolve(__dirname, "fonts");
const fontPath = path.resolve(fontDir, "KiwiMaru-Medium.ttf");
const FONT_URL =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/kiwimaru/KiwiMaru-Medium.ttf";

async function ensureFont() {
  try {
    await access(fontPath);
  } catch {
    await mkdir(fontDir, { recursive: true });
    const res = await fetch(FONT_URL);
    if (!res.ok)
      throw new Error(`Kiwi Maru font download failed: ${res.status}`);
    await writeFile(fontPath, Buffer.from(await res.arrayBuffer()));
    console.log(
      "Downloaded Kiwi Maru Medium to scripts/fonts/ (cached, gitignored)"
    );
  }
}

await ensureFont();

// 1200x630 OGP image. ブランドカラー: ダークグリーン #2D4A3E / クリーム #FFF8E7。
// Kiwi Maru は太字がないため weight は 500（Medium）で統一。
const FF = "'Kiwi Maru','Hiragino Sans','Yu Gothic',serif";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="20" r="1.5" fill="#2D4A3E" opacity="0.08"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="#FFF8E7"/>
  <rect width="1200" height="630" fill="url(#dots)"/>

  <text x="80" y="300" font-family="${FF}" font-weight="500" font-size="180" fill="#2D4A3E" letter-spacing="-0.02em">toban</text>

  <text x="80" y="404" font-family="${FF}" font-weight="500" font-size="52" fill="#1F2937">当番表を、かんたんに作って</text>
  <text x="80" y="468" font-family="${FF}" font-weight="500" font-size="52" fill="#1F2937">そのまま、きれいに印刷。</text>

  <text x="1120" y="582" text-anchor="end" font-family="${FF}" font-weight="500" font-size="28" fill="#2D4A3E">toban.app</text>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    fontFiles: [fontPath],
    loadSystemFonts: true,
    defaultFontFamily: "Kiwi Maru",
  },
  background: "#FFF8E7",
});

const png = resvg.render().asPng();
await writeFile(outputPath, png);

const { width, height } = resvg.innerBBox() ?? { width: 1200, height: 630 };
console.log(
  `Generated ${path.relative(projectRoot, outputPath)} (${png.length} bytes, target 1200x630, content bbox ${width}x${height})`
);
