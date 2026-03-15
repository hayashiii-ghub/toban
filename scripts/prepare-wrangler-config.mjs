import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const inputConfigPath = path.resolve(projectRoot, "wrangler.toml");
const outputConfigPath = process.env.WRANGLER_CONFIG_PATH
  ? path.resolve(process.cwd(), process.env.WRANGLER_CONFIG_PATH)
  : path.resolve(projectRoot, "wrangler.deploy.toml");
const requireDatabaseId = process.argv.includes("--require");

const DATABASE_ID_PLACEHOLDER = "__CLOUDFLARE_D1_DATABASE_ID__";
const PREVIEW_DATABASE_ID_PLACEHOLDER = "__CLOUDFLARE_D1_PREVIEW_DATABASE_ID__";

const databaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID ?? process.env.D1_DATABASE_ID;
const previewDatabaseId =
  process.env.CLOUDFLARE_D1_PREVIEW_DATABASE_ID ??
  process.env.D1_PREVIEW_DATABASE_ID ??
  databaseId;
const config = await readFile(inputConfigPath, "utf8");

if (!config.includes(DATABASE_ID_PLACEHOLDER)) {
  process.exit(0);
}

if (!databaseId) {
  if (requireDatabaseId) {
    console.error(
      [
        "Missing CLOUDFLARE_D1_DATABASE_ID.",
        "Create a D1 database with `wrangler d1 create toban-maker-db`,",
        "then set its UUID in the Cloudflare deploy environment variables.",
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

await mkdir(path.dirname(outputConfigPath), { recursive: true });
await writeFile(outputConfigPath, preparedConfig);
console.log(`Prepared ${path.relative(process.cwd(), outputConfigPath)} for deployment.`);
