import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = process.env.WRANGLER_CONFIG_PATH
  ? path.resolve(process.cwd(), process.env.WRANGLER_CONFIG_PATH)
  : path.resolve(__dirname, "../wrangler.toml");

const DATABASE_ID_PLACEHOLDER = "__CLOUDFLARE_D1_DATABASE_ID__";
const PREVIEW_DATABASE_ID_PLACEHOLDER = "__CLOUDFLARE_D1_PREVIEW_DATABASE_ID__";

const databaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID ?? process.env.D1_DATABASE_ID;
const previewDatabaseId =
  process.env.CLOUDFLARE_D1_PREVIEW_DATABASE_ID ??
  process.env.D1_PREVIEW_DATABASE_ID ??
  databaseId;
const isCi =
  ["1", "true"].includes((process.env.CI ?? "").toLowerCase()) ||
  Boolean(process.env.CF_PAGES) ||
  Boolean(process.env.CF_PAGES_COMMIT_SHA);

const config = await readFile(configPath, "utf8");

if (!config.includes(DATABASE_ID_PLACEHOLDER)) {
  process.exit(0);
}

if (!databaseId) {
  if (isCi) {
    console.error(
      [
        "Missing CLOUDFLARE_D1_DATABASE_ID.",
        "Create a D1 database with `wrangler d1 create toban-maker-db`,",
        "then set its UUID in the Cloudflare build/deploy environment variables.",
      ].join(" "),
    );
    process.exit(1);
  }

  console.warn(
    "Skipping Wrangler D1 config injection because CLOUDFLARE_D1_DATABASE_ID is not set.",
  );
  process.exit(0);
}

const preparedConfig = config
  .replaceAll(DATABASE_ID_PLACEHOLDER, databaseId)
  .replaceAll(PREVIEW_DATABASE_ID_PLACEHOLDER, previewDatabaseId);

await writeFile(configPath, preparedConfig);
console.log(`Prepared ${path.relative(process.cwd(), configPath)} for deployment.`);
