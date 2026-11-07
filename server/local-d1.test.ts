import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const helper = pathToFileURL(path.resolve("scripts/local-d1.ts")).href;
// These fixture paths were produced by the pinned cf Miniflare API. The helper
// discovers them independently, so a storage mapping change fails the regression.
const legacyFile =
  "ce8e11912a6f198d781784820d6a59e32b0653cf2433bfec451c3ed967465103.sqlite";
const targetFile =
  "f01b41a1ee11bef526847f83706dbb4b29544c081e7039f403d0179921a41aa0.sqlite";
const localId = "227db439-619b-427b-a12f-a58fe5b071a6";

function runCase(body: string) {
  const temporary = mkdtempSync(path.join(tmpdir(), "toban-local-d1-test-"));
  const script = path.join(temporary, "case.mjs");
  writeFileSync(
    script,
    `
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { preserveLegacyLocalDatabase } from ${JSON.stringify(helper)};
const state = ${JSON.stringify(path.join(temporary, "state"))};
const directory = path.join(state, "v3/d1/miniflare-D1DatabaseObject");
const legacy = path.join(directory, ${JSON.stringify(legacyFile)});
const target = path.join(directory, ${JSON.stringify(targetFile)});
const id = ${JSON.stringify(localId)};
const checksum = file => createHash("sha256").update(readFileSync(file)).digest("hex");
function runCf(args) {
  const require = createRequire(${JSON.stringify(helper)});
  const cli = path.join(path.dirname(require.resolve("cf/package.json")), "bin/cf");
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: path.dirname(state),
    encoding: "utf8",
    timeout: 15000,
    input: "y\\n",
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
let writer;
function createLegacyFixture() {
  mkdirSync(directory, { recursive: true });
  writer = new DatabaseSync(legacy);
  writer.exec(\`
    PRAGMA journal_mode=WAL;
    PRAGMA wal_autocheckpoint=0;
    CREATE TABLE schedules (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE);
    CREATE TABLE _cf_METADATA (key TEXT PRIMARY KEY, value BLOB);
    CREATE INDEX schedule_payload ON schedules (payload);
    CREATE VIEW saved_schedules AS SELECT id, payload FROM schedules;
    INSERT INTO schedules VALUES ('fixture-1', 'first');
    INSERT INTO d1_migrations (name) VALUES ('0001_fixture.sql');
    INSERT INTO _cf_METADATA VALUES ('fixture', x'010203');
    PRAGMA wal_checkpoint(TRUNCATE);
    INSERT INTO schedules VALUES ('fixture-2', 'wal-only');
    INSERT INTO d1_migrations (name) VALUES ('0002_fixture.sql');
  \`);
}
function noStagesRemain() {
  assert.ok(!readdirSync(state).some(name => name.startsWith(".d1-preserve-")));
}
try {
  ${body}
} finally {
  writer?.close();
}
`
  );
  try {
    // Native Node keeps Miniflare and SQLite outside the browser test globals.
    const result = spawnSync(process.execPath, [script], {
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr || result.stdout).toBe(0);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

describe("legacy local D1 preservation", () => {
  it("WAL 内の更新と全テーブル・移行履歴を保ち、元ファイルを残す", () => {
    runCase(`
      createLegacyFixture();
      const originalHash = checksum(legacy);
      const walHash = checksum(legacy + "-wal");
      const expectedSchema = writer.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY name").all();
      assert.equal(await preserveLegacyLocalDatabase(state, id), true);
      assert.equal(checksum(legacy), originalHash);
      assert.equal(checksum(legacy + "-wal"), walHash);
      assert.equal(statSync(target).mode & 0o777, 0o600);
      assert.equal(existsSync(target + "-wal"), false);
      noStagesRemain();
      const copy = new DatabaseSync(target, { readOnly: true });
      try {
        assert.deepEqual(copy.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY name").all(), expectedSchema);
        for (const table of ["schedules", "d1_migrations", "sqlite_sequence", "_cf_METADATA"]) {
          assert.deepEqual(copy.prepare('SELECT * FROM "' + table + '" ORDER BY rowid').all(), writer.prepare('SELECT * FROM "' + table + '" ORDER BY rowid').all());
        }
        assert.equal(copy.prepare("SELECT count(*) AS n FROM schedules").get().n, 2);
        assert.equal(copy.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
      } finally { copy.close(); }
    `);
  });

  it("新しい保存先があれば元データで上書きしない", () => {
    runCase(`
      createLegacyFixture();
      const current = new DatabaseSync(target);
      current.exec("CREATE TABLE current_data (id INTEGER PRIMARY KEY); INSERT INTO current_data VALUES (42);");
      current.close();
      const targetHash = checksum(target);
      const originalHash = checksum(legacy);
      assert.equal(await preserveLegacyLocalDatabase(state, id), false);
      assert.equal(checksum(target), targetHash);
      assert.equal(checksum(legacy), originalHash);
      noStagesRemain();
    `);
  });

  it.each(["-wal", "-shm"])(
    "保存先に %s だけ残っていたら、両方のデータを保持して停止する",
    suffix => {
      runCase(`
        createLegacyFixture();
        const sidecar = target + ${JSON.stringify(suffix)};
        writeFileSync(sidecar, "orphaned SQLite sidecar fixture");
        const originalHash = checksum(legacy);
        const sidecarHash = checksum(sidecar);
        await assert.rejects(preserveLegacyLocalDatabase(state, id), /sidecar files without a database/);
        assert.equal(checksum(legacy), originalHash);
        assert.equal(checksum(sidecar), sidecarHash);
        assert.equal(existsSync(target), false);
        noStagesRemain();
      `);
    }
  );

  it("実際の cf migrations apply が引き継いだ DB を更新し、履歴で再適用を防ぐ", () => {
    runCase(`
      createLegacyFixture();
      const originalHash = checksum(legacy);
      const walHash = checksum(legacy + "-wal");
      assert.equal(await preserveLegacyLocalDatabase(state, id), true);
      const migrations = path.join(path.dirname(state), "migrations");
      mkdirSync(migrations);
      writeFileSync(path.join(migrations, "0003_after_preservation.sql"), \
        "ALTER TABLE schedules ADD COLUMN migrated INTEGER NOT NULL DEFAULT 1;\\n" + \
        "INSERT INTO schedules (id, payload) VALUES ('fixture-3', 'after-migration');\\n");
      const args = ["d1", "migrations", "apply", id, "--local", "--persist-to", state, "--dir", migrations];
      runCf(args);
      runCf(args);
      assert.equal(checksum(legacy), originalHash);
      assert.equal(checksum(legacy + "-wal"), walHash);
      const copy = new DatabaseSync(target, { readOnly: true });
      try {
        assert.equal(copy.prepare("SELECT count(*) AS n FROM schedules").get().n, 3);
        assert.deepEqual(copy.prepare("SELECT id, payload FROM schedules WHERE id != 'fixture-3' ORDER BY id").all(), writer.prepare("SELECT id, payload FROM schedules ORDER BY id").all());
        assert.deepEqual(copy.prepare("SELECT name FROM d1_migrations ORDER BY id").all().map(row => row.name), ["0001_fixture.sql", "0002_fixture.sql", "0003_after_preservation.sql"]);
        assert.equal(copy.prepare("SELECT migrated FROM schedules WHERE id = 'fixture-3'").get().migrated, 1);
      } finally { copy.close(); }
      noStagesRemain();
    `);
  });

  it("保存領域が無い新規環境では何も作らない", () => {
    runCase(`
      assert.equal(await preserveLegacyLocalDatabase(state, id), false);
      assert.equal(existsSync(state), false);
    `);
  });

  it("同時に実行しても一度だけ複製し、完成した保存先を残す", () => {
    runCase(`
      createLegacyFixture();
      const results = await Promise.all([
        preserveLegacyLocalDatabase(state, id),
        preserveLegacyLocalDatabase(state, id),
      ]);
      assert.deepEqual(results.sort(), [false, true]);
      noStagesRemain();
      const copy = new DatabaseSync(target, { readOnly: true });
      try { assert.equal(copy.prepare("SELECT count(*) AS n FROM schedules").get().n, 2); }
      finally { copy.close(); }
    `);
  });

  it("破損した元データは削除せず、保存先の公開を止める", () => {
    runCase(`
      mkdirSync(directory, { recursive: true });
      writeFileSync(legacy, "not a SQLite database");
      const originalHash = checksum(legacy);
      await assert.rejects(preserveLegacyLocalDatabase(state, id));
      assert.equal(checksum(legacy), originalHash);
      assert.equal(existsSync(target), false);
      noStagesRemain();
    `);
  });
});
