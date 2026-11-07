import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { preserveLegacyLocalDatabase } from "./local-d1.ts";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const clientRoot = path.join(projectRoot, "client");
export const LOCAL_STATE_PATH = path.join(projectRoot, ".wrangler/state");
export const PRODUCTION_DATABASE_ID_PLACEHOLDER =
  "__CLOUDFLARE_D1_DATABASE_ID__";
// cf が求める UUID をローカル用に固定し、本番の ID と分離する。
const LOCAL_DATABASE_ID = "227db439-619b-427b-a12f-a58fe5b071a6";
const migrationsDirectory = path.join(projectRoot, "server/db/migrations");

export function productionDatabaseId(env: NodeJS.ProcessEnv = process.env) {
  return env.CLOUDFLARE_D1_DATABASE_ID ?? env.D1_DATABASE_ID;
}

export function localDatabaseId(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.CLOUDFLARE_D1_PREVIEW_DATABASE_ID ??
    env.D1_PREVIEW_DATABASE_ID ??
    LOCAL_DATABASE_ID
  );
}

export function requireProductionDatabaseId(
  env: NodeJS.ProcessEnv = process.env
) {
  const id = productionDatabaseId(env);
  if (
    !id ||
    !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
      id
    )
  ) {
    throw new Error("Set CLOUDFLARE_D1_DATABASE_ID to the production D1 UUID.");
  }
  return id;
}

export function assertDeploymentTarget(databaseId: string, root = clientRoot) {
  const output = path.join(root, ".cloudflare/output/v0");
  const build = JSON.parse(
    readFileSync(path.join(output, "config.json"), "utf8")
  );
  const worker = JSON.parse(
    readFileSync(
      path.join(output, "workers/default/worker.config.json"),
      "utf8"
    )
  );
  if (
    build.buildContext?.mode !== "production" ||
    build.buildContext?.isPreview ||
    worker.name !== "toban" ||
    worker.env?.DB?.id !== databaseId ||
    worker.env?.ENVIRONMENT?.value !== "production"
  ) {
    throw new Error(
      "Build Output does not match this production D1 target. Run pnpm build with the same CLOUDFLARE_D1_DATABASE_ID before deployment."
    );
  }
}

function runCf(args: string[], cwd = projectRoot) {
  const require = createRequire(import.meta.url);
  const cli = path.join(
    path.dirname(require.resolve("cf/package.json")),
    "bin/cf"
  );
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`cf command failed (${result.status ?? result.signal}).`);
  }
}

export async function runCommand(args: string[]) {
  const [command, ...flags] = args;
  if (flags.some(flag => flag !== "--dry-run")) {
    throw new Error("Only --dry-run is supported.");
  }
  const dryRun = flags.includes("--dry-run") ? ["--dry-run"] : [];
  if (command === "migrate-local") {
    if (dryRun.length === 0) {
      await preserveLegacyLocalDatabase(LOCAL_STATE_PATH, localDatabaseId());
    }
    runCf([
      "d1",
      "migrations",
      "apply",
      localDatabaseId(),
      "--local",
      "--persist-to",
      LOCAL_STATE_PATH,
      "--dir",
      migrationsDirectory,
      ...dryRun,
    ]);
    return;
  }
  if (command !== "deploy") throw new Error("Use migrate-local or deploy.");
  const id = requireProductionDatabaseId();
  // DB を更新する前に、ビルド成果物も同じ DB を指すことを確認する。
  assertDeploymentTarget(id);
  runCf([
    "d1",
    "migrations",
    "apply",
    id,
    "--dir",
    migrationsDirectory,
    "--mode",
    "production",
    ...dryRun,
  ]);
  // Vite の root に生成された Build Output を、そのまま公開する。
  runCf(
    [
      "deploy",
      "--prebuilt",
      "--mode",
      "production",
      "--no-provision",
      ...dryRun,
    ],
    clientRoot
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await runCommand(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
