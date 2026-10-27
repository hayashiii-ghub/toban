import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { LIMITS } from "../../shared/limits";

// Mock ensureSchedulesSchema to skip D1 schema checks
vi.mock("../db/ensureSchema", () => ({
  ensureSchedulesSchema: vi.fn().mockResolvedValue({ appliedColumns: [] }),
}));

// --- Helpers ---

/**
 * Response#json() は unknown を返すため、そのままではプロパティを参照できない。
 * このテストが見るのは平坦なオブジェクトのキーだけなので、ここで一度だけ絞る。
 */
async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

/** Valid schedule payload for POST/PUT requests */
function validScheduleData(overrides: Record<string, unknown> = {}) {
  return {
    name: "テスト当番表",
    rotation: 0,
    groups: [
      {
        id: "g1",
        tasks: ["掃除"],
        emoji: "🧹",
      },
    ],
    members: [
      {
        id: "m1",
        name: "田中",
        color: "#FF0000",
        bgColor: "#FFEEEE",
        textColor: "#000000",
      },
    ],
    ...overrides,
  };
}

/**
 * A fake schedule DB row using SQL column names (snake_case).
 * Drizzle ORM reads from D1 using SQL column names and maps them internally.
 * `is_public` uses integer (0/1) since D1/SQLite stores booleans as integers.
 */
function fakeScheduleRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "test-id",
    slug: "abcdefghij",
    edit_token: "",
    edit_token_hash: null as string | null,
    is_public: 0,
    name: "テスト当番表",
    rotation: 0,
    groups_json: JSON.stringify([{ id: "g1", tasks: ["掃除"], emoji: "🧹" }]),
    members_json: JSON.stringify([
      {
        id: "m1",
        name: "田中",
        color: "#FF0000",
        bgColor: "#FFEEEE",
        textColor: "#000000",
      },
    ]),
    rotation_config_json: null,
    assignment_mode: null,
    design_theme_id: null,
    font_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    calendar_accessed_at: null as string | null,
    ...overrides,
  };
}

/**
 * Creates a minimal mock D1Database.
 * `queryHandler` receives (sql, params) and should return { results: [...] } or throw.
 */
function createMockD1(
  queryHandler: (sql: string, params: unknown[]) => { results: unknown[] }
): D1Database {
  const mockStatement = (sql: string) => {
    let boundParams: unknown[] = [];
    // D1PreparedStatement は meta の全フィールドや raw のオーバーロードまで要求するが、
    // テストが見るのは戻り値の results / success だけ。型を満たすためだけにモックを
    // 膨らませても検証力は上がらないので、組み立て後に一度だけキャストする。
    const stmt = {
      bind(...params: unknown[]) {
        boundParams = params;
        return stmt;
      },
      async all() {
        const result = queryHandler(sql, boundParams);
        return { results: result.results, success: true, meta: {} };
      },
      async run() {
        queryHandler(sql, boundParams);
        return { results: [], success: true, meta: {} };
      },
      async first(_col?: string) {
        const result = queryHandler(sql, boundParams);
        return result.results[0] ?? null;
      },
      async raw(opts?: { columnNames?: boolean }) {
        const result = queryHandler(sql, boundParams);
        if (result.results.length === 0) {
          if (opts?.columnNames) return { results: [], columnNames: [] };
          return [];
        }
        const rows = result.results as Record<string, unknown>[];
        const columns = Object.keys(rows[0]);
        const dataRows = rows.map(row => columns.map(col => row[col]));
        if (opts?.columnNames)
          return { results: dataRows, columnNames: columns };
        return dataRows;
      },
    } as unknown as D1PreparedStatement;
    return stmt;
  };

  return {
    prepare(sql: string) {
      return mockStatement(sql);
    },
    async dump() {
      return new ArrayBuffer(0);
    },
    async batch(_stmts: D1PreparedStatement[]) {
      return [];
    },
    async exec(_sql: string) {
      return { count: 0, duration: 0 };
    },
  } as unknown as D1Database;
}

/**
 * Creates a Hono app with the schedule routes mounted, using the given mock D1.
 * We dynamically import scheduleRoutes after mocking ensureSchema.
 */
async function createTestApp(mockDB: D1Database) {
  // Dynamic import to ensure the mock is applied
  const { default: scheduleRoutes } = await import("./schedules");

  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route("/api/schedules", scheduleRoutes);

  // Helper to make requests with the mock DB env
  return {
    request(path: string, init?: RequestInit) {
      return app.request(path, init, { DB: mockDB });
    },
  };
}

// ============================================================
// Tests
// ============================================================

describe("POST /api/schedules (Create)", () => {
  it("returns 201 with slug and editToken on valid data", async () => {
    const mockDB = createMockD1((_sql, _params) => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validScheduleData()),
    });

    expect(res.status).toBe(201);
    const json = await readJson(res);
    expect(json).toHaveProperty("slug");
    expect(json).toHaveProperty("editToken");
    expect(typeof json.slug).toBe("string");
    expect(typeof json.editToken).toBe("string");
  });

  it("returns 400 for empty name", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validScheduleData({ name: "" })),
    });

    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(json).toHaveProperty("error");
  });

  it("returns 400 for missing groups", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validScheduleData({ groups: [] })),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing members", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validScheduleData({ members: [] })),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json {{{",
    });

    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 400 for invalid member color format", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        validScheduleData({
          members: [
            {
              id: "m1",
              name: "田中",
              color: "red",
              bgColor: "#FFEEEE",
              textColor: "#000000",
            },
          ],
        })
      ),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown font ID", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validScheduleData({ fontId: "comic-sans" })),
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when group references unknown member id", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        validScheduleData({
          groups: [
            {
              id: "g1",
              tasks: ["掃除"],
              emoji: "🧹",
              memberIds: ["nonexistent"],
            },
          ],
        })
      ),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/schedules/:slug (Public read)", () => {
  it("returns 200 for a public schedule", async () => {
    const row = fakeScheduleRow({
      is_public: 1,
      design_theme_id: "mochimochi/sunflower",
      font_id: "handwriting",
    });
    const mockDB = createMockD1(sql => {
      if (sql.includes("select")) return { results: [row] };
      return { results: [] };
    });
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/abcdefghij");

    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.slug).toBe("abcdefghij");
    expect(json.name).toBe("テスト当番表");
    expect(json.groups).toEqual([{ id: "g1", tasks: ["掃除"], emoji: "🧹" }]);
    expect(json.members).toEqual([
      {
        id: "m1",
        name: "田中",
        color: "#FF0000",
        bgColor: "#FFEEEE",
        textColor: "#000000",
      },
    ]);
    expect(json.designThemeId).toBe("mochimochi/sunflower");
    expect(json.fontId).toBe("handwriting");
  });

  it("returns 404 for a non-public schedule", async () => {
    const row = fakeScheduleRow({ is_public: 0 });
    const mockDB = createMockD1(sql => {
      if (sql.includes("select")) return { results: [row] };
      return { results: [] };
    });
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/abcdefghij");

    expect(res.status).toBe(404);
    const json = await readJson(res);
    expect(json.error).toBe("Not found");
  });

  it("returns 404 for a non-existent slug", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/abcdefghij");

    expect(res.status).toBe(404);
    const json = await readJson(res);
    expect(json.error).toBe("Not found");
  });

  it("returns 400 for an invalid slug format", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/bad!");

    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(json.error).toBe("Invalid slug");
  });

  it("returns 400 for a slug that is too short", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/abc");

    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(json.error).toBe("Invalid slug");
  });

  it("保存済みの配列は上限ちょうどなら返し、1件超は壊れたデータにする", async () => {
    const readPublic = async (overrides: Record<string, unknown>) => {
      const row = fakeScheduleRow({ is_public: 1, ...overrides });
      const mockDB = createMockD1(sql => {
        if (sql.includes("select")) return { results: [row] };
        return { results: [] };
      });
      const app = await createTestApp(mockDB);
      return app.request("/api/schedules/abcdefghij");
    };
    const groups = (count: number) =>
      JSON.stringify(
        Array.from({ length: count }, (_, index) => ({
          id: `g${index}`,
          tasks: ["掃除"],
          emoji: "🧹",
        }))
      );
    const members = (count: number) =>
      JSON.stringify(
        Array.from({ length: count }, (_, index) => ({
          id: `m${index}`,
          name: "田中",
          color: "#FF0000",
          bgColor: "#FFEEEE",
          textColor: "#000000",
        }))
      );
    const withMemberIds = (count: number) =>
      JSON.stringify([
        {
          id: "g1",
          tasks: ["掃除"],
          emoji: "🧹",
          memberIds: Array.from({ length: count }, (_, index) => `m${index}`),
        },
      ]);

    expect(
      (await readPublic({ groups_json: groups(LIMITS.groups) })).status
    ).toBe(200);
    const overGroups = await readPublic({
      groups_json: groups(LIMITS.groups + 1),
    });
    expect(overGroups.status).toBe(500);
    expect((await readJson(overGroups)).error).toBe("Corrupted schedule data");

    expect(
      (await readPublic({ members_json: members(LIMITS.members) })).status
    ).toBe(200);
    const overMembers = await readPublic({
      members_json: members(LIMITS.members + 1),
    });
    expect(overMembers.status).toBe(500);

    expect(
      (await readPublic({ groups_json: withMemberIds(LIMITS.members) })).status
    ).toBe(200);
    const overMemberIds = await readPublic({
      groups_json: withMemberIds(LIMITS.members + 1),
    });
    expect(overMemberIds.status).toBe(500);
  });
});

describe("GET /api/schedules/:slug/calendar.ics (Calendar feed)", () => {
  const dateRow = (overrides: Partial<Record<string, unknown>> = {}) =>
    fakeScheduleRow({
      is_public: 1,
      rotation_config_json: JSON.stringify({
        mode: "date",
        startDate: "2026-01-05",
        cycleDays: 7,
      }),
      ...overrides,
    });

  function dbWith(row: unknown) {
    const writes: { sql: string; params: unknown[] }[] = [];
    const mockDB = createMockD1((sql, params) => {
      if (sql.startsWith("select")) return { results: row ? [row] : [] };
      writes.push({ sql, params });
      return { results: [] };
    });
    return { mockDB, writes };
  }

  it("共有している、日付で交代する表を iCalendar で返し、読まれた日を残す", async () => {
    const { mockDB, writes } = dbWith(dateRow());
    const app = await createTestApp(mockDB);

    const res = await app.request(
      "/api/schedules/abcdefghij/calendar.ics?member=m1"
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "text/calendar; charset=utf-8"
    );
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("X-WR-CALNAME:テスト当番表（田中）");
    expect(body).toContain("SUMMARY:テスト当番表：掃除");
    expect(writes).toHaveLength(1);
    expect(writes[0].sql).toMatch(
      /update "schedules" set "calendar_accessed_at"/
    );
    // 編集の新しさ（updated_at）は変えない
    expect(writes[0].sql).not.toContain("updated_at");
  });

  it("1 日以内に読まれていれば、書き込まない", async () => {
    const { mockDB, writes } = dbWith(
      dateRow({ calendar_accessed_at: new Date().toISOString() })
    );
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/abcdefghij/calendar.ics");

    expect(res.status).toBe(200);
    expect(writes).toHaveLength(0);
  });

  it.each(["\r\n", "\r", "\n"])(
    "保存済みメンバー ID に %j があってもカレンダーの行を挿入しない",
    async separator => {
      const id = `m${separator}X-INJECTED:yes`;
      const { mockDB } = dbWith(
        dateRow({
          name: "当番\rX-INJECTED:yes",
          members_json: JSON.stringify([
            {
              id,
              name: "田中",
              color: "#FF0000",
              bgColor: "#FFEEEE",
              textColor: "#000000",
            },
          ]),
        })
      );
      const app = await createTestApp(mockDB);
      const res = await app.request(
        `/api/schedules/abcdefghij/calendar.ics?member=${encodeURIComponent(id)}`
      );
      expect(res.status).toBe(200);
      const body = (await res.text()).replace(/\r\n /g, "");
      expect(body).toContain("SUMMARY:当番\\nX-INJECTED:yes：掃除");
      expect(body).not.toMatch(/(?:^|[\r\n])X-INJECTED:/);
    }
  );

  it("共有していない表は 404", async () => {
    const { mockDB } = dbWith(dateRow({ is_public: 0 }));
    const app = await createTestApp(mockDB);
    const res = await app.request("/api/schedules/abcdefghij/calendar.ics");
    expect(res.status).toBe(404);
  });

  it("手で交代する表は 404", async () => {
    const { mockDB } = dbWith(dateRow({ rotation_config_json: null }));
    const app = await createTestApp(mockDB);
    const res = await app.request("/api/schedules/abcdefghij/calendar.ics");
    expect(res.status).toBe(404);
  });

  it("当番表にいない人は 404", async () => {
    const { mockDB } = dbWith(dateRow());
    const app = await createTestApp(mockDB);
    const res = await app.request(
      "/api/schedules/abcdefghij/calendar.ics?member=nobody"
    );
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/schedules/:slug (Update)", () => {
  const validSlug = "abcdefghij";
  const editToken = "test-edit-token-1234567890123456";

  async function setupAuthenticatedApp() {
    const { hashToken } = await import("../middleware/auth");
    const tokenHash = await hashToken(editToken);

    const mockDB = createMockD1(sql => {
      if (sql.includes("select")) {
        // Auth middleware query selects only edit_token_hash.
        // Drizzle uses positional mapping from raw(), so the returned object
        // must contain ONLY the selected columns in the correct order.
        if (!sql.includes('"name"')) {
          return { results: [{ edit_token_hash: tokenHash }] };
        }
        // Full select query (if needed)
        return {
          results: [
            fakeScheduleRow({ slug: validSlug, edit_token_hash: tokenHash }),
          ],
        };
      }
      return { results: [] };
    });
    return createTestApp(mockDB);
  }

  it("returns 200 on valid data with correct edit token", async () => {
    const app = await setupAuthenticatedApp();

    const res = await app.request(`/api/schedules/${validSlug}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-edit-token": editToken,
      },
      body: JSON.stringify(validScheduleData({ name: "更新後の名前" })),
    });

    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.ok).toBe(true);
  });

  it("returns 403 with wrong edit token", async () => {
    const app = await setupAuthenticatedApp();

    const res = await app.request(`/api/schedules/${validSlug}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-edit-token": "wrong-token-that-is-long-enough!",
      },
      body: JSON.stringify(validScheduleData()),
    });

    expect(res.status).toBe(403);
    const json = await readJson(res);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 with missing edit token", async () => {
    const app = await setupAuthenticatedApp();

    const res = await app.request(`/api/schedules/${validSlug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validScheduleData()),
    });

    expect(res.status).toBe(401);
    const json = await readJson(res);
    expect(json.error).toBe("Edit token required");
  });

  it("returns 400 for invalid request body after auth", async () => {
    const app = await setupAuthenticatedApp();

    const res = await app.request(`/api/schedules/${validSlug}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-edit-token": editToken,
      },
      body: JSON.stringify({ name: "" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/schedules/:slug", () => {
  const validSlug = "abcdefghij";
  const editToken = "test-edit-token-1234567890123456";

  it("returns 200 with valid edit token", async () => {
    const { hashToken } = await import("../middleware/auth");
    const tokenHash = await hashToken(editToken);

    const mockDB = createMockD1(sql => {
      if (sql.includes("select")) {
        return { results: [{ edit_token_hash: tokenHash }] };
      }
      return { results: [] };
    });
    const app = await createTestApp(mockDB);

    const res = await app.request(`/api/schedules/${validSlug}`, {
      method: "DELETE",
      headers: { "x-edit-token": editToken },
    });

    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.ok).toBe(true);
  });

  it("returns 403 with wrong edit token", async () => {
    const { hashToken } = await import("../middleware/auth");
    const tokenHash = await hashToken(editToken);

    const mockDB = createMockD1(sql => {
      if (sql.includes("select")) {
        return { results: [{ edit_token_hash: tokenHash }] };
      }
      return { results: [] };
    });
    const app = await createTestApp(mockDB);

    const res = await app.request(`/api/schedules/${validSlug}`, {
      method: "DELETE",
      headers: { "x-edit-token": "wrong-token-that-is-long-enough!" },
    });

    expect(res.status).toBe(403);
  });

  it("returns 401 without edit token", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request(`/api/schedules/${validSlug}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(401);
    const json = await readJson(res);
    expect(json.error).toBe("Edit token required");
  });
});
