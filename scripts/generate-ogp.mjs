import { readFileSync, renameSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "client", "public");
const svgPath = join(outDir, "ogp.svg");
const pngPath = join(outDir, "ogp.png");

// Verify source SVG exists
readFileSync(svgPath);

// Convert SVG to PNG using qlmanage (macOS)
try {
  execSync(`qlmanage -t -s 1200 -o "${outDir}" "${svgPath}"`, {
    stdio: "pipe",
  });
  // qlmanage outputs as ogp.svg.png
  renameSync(join(outDir, "ogp.svg.png"), pngPath);
  console.log("OGP image generated as PNG (via qlmanage)");
} catch {
  console.log(
    "PNG conversion not available. Convert ogp.svg to ogp.png (1200x630px) manually."
  );
}
