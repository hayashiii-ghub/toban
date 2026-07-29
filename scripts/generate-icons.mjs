import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

// アイコンの SVG ソース（client/public/favicon.svg・pwa-icon.svg）は
// Kiwi Maru のグリフをパス化済み＝フォント非依存。ここでは各サイズの PNG を
// resvg でラスタライズするだけ。
//   favicon.svg  = 「t」モノグラム・角丸（ブラウザタブ）
//   pwa-icon.svg = 「toban」ワードマーク・正方形（アプリ／PWA）
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(__dirname, "..", "client/public");

async function rasterize(srcSvg, outPng, size) {
  const svg = await readFile(path.resolve(pub, srcSvg), "utf8");
  const r = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  await writeFile(path.resolve(pub, outPng), r.render().asPng());
  console.log(`  ${outPng} (${size}x${size})`);
}

await rasterize("favicon.svg", "favicon-32.png", 32);
await rasterize("pwa-icon.svg", "apple-touch-icon.png", 180);
await rasterize("pwa-icon.svg", "pwa-192.png", 192);
await rasterize("pwa-icon.svg", "pwa-512.png", 512);
console.log(
  "Generated favicon-32 / apple-touch-icon / pwa-192 / pwa-512 from SVG sources"
);
