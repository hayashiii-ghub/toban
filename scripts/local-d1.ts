import { chmod, link, lstat, mkdtemp, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LEGACY_DATABASE_ID = "__CLOUDFLARE_D1_PREVIEW_DATABASE_ID__";
const databaseDirectory = (statePath: string) =>
  path.join(statePath, "v3/d1/miniflare-D1DatabaseObject");

interface LocalMiniflare {
  getD1Database(name: string): Promise<{
    prepare(sql: string): { first(): Promise<unknown> };
  }>;
  dispose(): Promise<void>;
}

interface MiniflareModule {
  Miniflare: new (options: unknown) => LocalMiniflare;
}

const databaseFilenames = new Map<string, Promise<string>>();

function databaseFilename(id: string): Promise<string> {
  const existing = databaseFilenames.get(id);
  if (existing) return existing;
  const pending = discoverDatabaseFilename(id).catch(error => {
    databaseFilenames.delete(id);
    throw error;
  });
  databaseFilenames.set(id, pending);
  return pending;
}

// Let cf's own Miniflare version determine its storage identity. Discovery only
// opens isolated temporary stores, never the user's existing local database.
async function discoverDatabaseFilename(id: string): Promise<string> {
  const temporary = await mkdtemp(path.join(tmpdir(), "toban-d1-identity-"));
  let mf: LocalMiniflare | undefined;
  try {
    const require = createRequire(import.meta.url);
    const cfRequire = createRequire(require.resolve("cf/package.json"));
    const moduleUrl = pathToFileURL(cfRequire.resolve("miniflare")).href;
    const { Miniflare } = (await import(moduleUrl)) as MiniflareModule;
    mf = new Miniflare({
      cf: false,
      telemetry: { enabled: false },
      enableDevRegistry: false,
      logRequests: false,
      resourcePersistencePath: path.join(temporary, "v3"),
      workers: [
        {
          config: {
            name: "toban-d1-identity",
            compatibilityDate: "2025-04-01",
            env: { DB: { type: "d1", id } },
            manifest: {
              mainModule: "worker.mjs",
              modules: {
                "worker.mjs": {
                  type: "esm",
                  contents:
                    "export default { fetch() { return new Response(); } };",
                },
              },
            },
          },
        },
      ],
    });
    const db = await mf.getD1Database("DB");
    await db.prepare("SELECT 1").first();
    const files = (await readdir(databaseDirectory(temporary))).filter(
      file => file.endsWith(".sqlite") && file !== "metadata.sqlite"
    );
    if (files.length !== 1) {
      throw new Error("Could not determine the local D1 database filename.");
    }
    return files[0];
  } finally {
    try {
      await mf?.dispose();
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function exists(file: string): Promise<boolean> {
  return lstat(file).then(
    () => true,
    error => {
      if (isMissing(error)) return false;
      throw error;
    }
  );
}

async function rejectOrphanedSidecars(target: string): Promise<void> {
  if (await exists(target)) return;
  const sidecars = await Promise.all(
    ["-wal", "-shm"].map(suffix => exists(target + suffix))
  );
  if (sidecars.some(Boolean) && !(await exists(target))) {
    throw new Error(
      "The local D1 destination has sidecar files without a database. Keep those files and resolve the destination before copying."
    );
  }
}

/** Copy legacy local D1 storage once, keeping its original database and WAL. */
export async function preserveLegacyLocalDatabase(
  statePath: string,
  newId: string
): Promise<boolean> {
  const root = path.resolve(statePath);
  const directory = databaseDirectory(root);
  const files = await readdir(directory, { withFileTypes: true }).catch(
    error => {
      if (isMissing(error)) return [];
      throw error;
    }
  );
  if (
    !files.some(
      file =>
        file.isFile() &&
        file.name.endsWith(".sqlite") &&
        file.name !== "metadata.sqlite"
    )
  ) {
    return false;
  }

  const legacyFilename = await databaseFilename(LEGACY_DATABASE_ID);
  if (!files.some(file => file.isFile() && file.name === legacyFilename)) {
    return false;
  }
  const target = path.join(directory, await databaseFilename(newId));
  if (await exists(target)) return false;
  await rejectOrphanedSidecars(target);

  // The stage is private and on the same filesystem as the final database.
  const temporary = await mkdtemp(path.join(root, ".d1-preserve-"));
  const staged = path.join(temporary, "database.sqlite");
  try {
    // Loading this only for an actual copy avoids SQLite warnings during config
    // evaluation and on fresh local installs. SQLite backup includes live WAL.
    const { DatabaseSync, backup } = await import("node:sqlite");
    const source = new DatabaseSync(path.join(directory, legacyFilename), {
      readOnly: true,
    });
    try {
      await backup(source, staged);
    } finally {
      source.close();
    }
    await chmod(staged, 0o600);
    const check = new DatabaseSync(staged, { readOnly: true });
    try {
      const result = check.prepare("PRAGMA integrity_check").all();
      if (result.length !== 1 || result[0].integrity_check !== "ok") {
        throw new Error(
          "The preserved local D1 database failed integrity checking."
        );
      }
    } finally {
      check.close();
    }

    // A hard link publishes the complete file atomically and fails if another
    // process created the target. Removing our stage never removes that target.
    await rejectOrphanedSidecars(target);
    try {
      await link(staged, target);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        return false;
      }
      throw error;
    }
    return true;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
