import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * ensureSchedulesSchema は結果を module スコープにキャッシュする。
 * 失敗した promise までキャッシュしてしまうと、D1 の一時エラー1回で
 * その isolate が生きている間ずっと同じエラーを返し続ける（DB が回復しても
 * 再試行されない）ため、失敗時にキャッシュを捨てることを固定する。
 */

type FakeDb = {
  prepare: (sql: string) => {
    all: () => Promise<{ results: { name: string }[] }>;
    run: () => Promise<unknown>;
  };
};

/** PRAGMA table_info を failures 回だけ失敗させ、以降は columns を返す D1 の偽物 */
function makeDb(failures: number, columns: string[] = []) {
  let remaining = failures;
  const runCalls: string[] = [];
  const db = {
    prepare(sql: string) {
      return {
        all: async () => {
          if (remaining > 0) {
            remaining--;
            throw new Error("D1_ERROR: network failure");
          }
          return { results: columns.map(name => ({ name })) };
        },
        run: async () => {
          runCalls.push(sql);
          return {};
        },
      };
    },
  } satisfies FakeDb;
  return { db: db as unknown as D1Database, runCalls };
}

beforeEach(() => {
  // module スコープのキャッシュを毎回まっさらにする
  vi.resetModules();
});

describe("ensureSchedulesSchema", () => {
  it("一時エラーの後、次の呼び出しで回復する", async () => {
    const { ensureSchedulesSchema } = await import("./ensureSchema");
    const { db, runCalls } = makeDb(1);

    await expect(ensureSchedulesSchema(db)).rejects.toThrow("D1_ERROR");

    // DB は回復しているので、2回目は成功して不足列を補える
    await expect(ensureSchedulesSchema(db)).resolves.toEqual({
      appliedColumns: [
        "edit_token_hash",
        "rotation_config_json",
        "assignment_mode",
        "design_theme_id",
        "font_id",
        "is_public",
      ],
    });
    expect(runCalls).toHaveLength(6);
  });

  it("成功後は PRAGMA も ALTER も再実行しない", async () => {
    const { ensureSchedulesSchema } = await import("./ensureSchema");
    const { db, runCalls } = makeDb(0, [
      "edit_token_hash",
      "rotation_config_json",
      "assignment_mode",
      "design_theme_id",
      "font_id",
      "is_public",
    ]);

    await ensureSchedulesSchema(db);
    await ensureSchedulesSchema(db);

    expect(runCalls).toHaveLength(0);
  });

  it("同時に呼ばれた場合、失敗は両方へ伝わりキャッシュは残らない", async () => {
    const { ensureSchedulesSchema } = await import("./ensureSchema");
    const { db } = makeDb(1);

    const [first, second] = await Promise.allSettled([
      ensureSchedulesSchema(db),
      ensureSchedulesSchema(db),
    ]);
    expect(first.status).toBe("rejected");
    expect(second.status).toBe("rejected");

    // 失敗を握ったままにしていないこと
    await expect(ensureSchedulesSchema(db)).resolves.toBeDefined();
  });
});
