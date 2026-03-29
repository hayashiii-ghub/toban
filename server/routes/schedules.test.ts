import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";

// Mock ensureSchedulesSchema to skip D1 schema checks
vi.mock("../db/ensureSchema", () => ({
  ensureSchedulesSchema: vi.fn().mockResolvedValue({ appliedColumns: [] }),
}));

// --- Helpers ---

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
      { id: "m1", name: "田中", color: "#FF0000", bgColor: "#FFEEEE", textColor: "#000000" },
    ]),
    rotation_config_json: null,
    assignment_mode: null,
    design_theme_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Creates a minimal mock D1Database.
 * `queryHandler` receives (sql, params) and should return { results: [...] } or throw.
 */
function createMockD1(
  queryHandler: (sql: string, params: unknown[]) => { results: unknown[] },
): D1Database {
  const mockStatement = (sql: string) => {
    let boundParams: unknown[] = [];
    const stmt: D1PreparedStatement = {
      bind(...params: unknown[]) {
        boundParams = params;
        return stmt;
      },
      async all() {
        const result = queryHandler(sql, boundParams);
        return { results: result.results, success: true, meta: {} } as D1Result;
      },
      async run() {
        queryHandler(sql, boundParams);
        return { results: [], success: true, meta: {} } as D1Result;
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
        const dataRows = rows.map((row) => columns.map((col) => row[col]));
        if (opts?.columnNames) return { results: dataRows, columnNames: columns };
        return dataRows;
      },
    };
    return stmt;
  };

  return {
    prepare(sql: string) {
      return mockStatement(sql);
    },
    async dump() {
      return new ArrayBuffer(0);
    },
    async batch(stmts: D1PreparedStatement[]) {
      return [];
    },
    async exec(sql: string) {
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
    const json = await res.json();
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
    const json = await res.json();
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
    const json = await res.json();
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
            { id: "m1", name: "田中", color: "red", bgColor: "#FFEEEE", textColor: "#000000" },
          ],
        }),
      ),
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
          groups: [{ id: "g1", tasks: ["掃除"], emoji: "🧹", memberIds: ["nonexistent"] }],
        }),
      ),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/schedules/:slug (Public read)", () => {
  it("returns 200 for a public schedule", async () => {
    const row = fakeScheduleRow({ is_public: 1 });
    const mockDB = createMockD1((sql) => {
      if (sql.includes("select")) return { results: [row] };
      return { results: [] };
    });
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/abcdefghij");

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.slug).toBe("abcdefghij");
    expect(json.name).toBe("テスト当番表");
    expect(json.groups).toEqual([{ id: "g1", tasks: ["掃除"], emoji: "🧹" }]);
    expect(json.members).toEqual([
      { id: "m1", name: "田中", color: "#FF0000", bgColor: "#FFEEEE", textColor: "#000000" },
    ]);
  });

  it("returns 404 for a non-public schedule", async () => {
    const row = fakeScheduleRow({ is_public: 0 });
    const mockDB = createMockD1((sql) => {
      if (sql.includes("select")) return { results: [row] };
      return { results: [] };
    });
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/abcdefghij");

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Not found");
  });

  it("returns 404 for a non-existent slug", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/abcdefghij");

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Not found");
  });

  it("returns 400 for an invalid slug format", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/bad!");

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid slug");
  });

  it("returns 400 for a slug that is too short", async () => {
    const mockDB = createMockD1(() => ({ results: [] }));
    const app = await createTestApp(mockDB);

    const res = await app.request("/api/schedules/abc");

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid slug");
  });
});

describe("PUT /api/schedules/:slug (Update)", () => {
  const validSlug = "abcdefghij";
  const editToken = "test-edit-token-1234567890123456";

  async function setupAuthenticatedApp() {
    const { hashToken } = await import("../middleware/auth");
    const tokenHash = await hashToken(editToken);

    const mockDB = createMockD1((sql) => {
      if (sql.includes("select")) {
        // Auth middleware query selects only edit_token, edit_token_hash.
        // Drizzle uses positional mapping from raw(), so the returned object
        // must contain ONLY the selected columns in the correct order.
        if (!sql.includes('"name"')) {
          return { results: [{ edit_token: "", edit_token_hash: tokenHash }] };
        }
        // Full select query (if needed)
        return { results: [fakeScheduleRow({ slug: validSlug, edit_token_hash: tokenHash })] };
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
    const json = await res.json();
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
    const json = await res.json();
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
    const json = await res.json();
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

    const mockDB = createMockD1((sql) => {
      if (sql.includes("select")) {
        return { results: [{ edit_token: "", edit_token_hash: tokenHash }] };
      }
      return { results: [] };
    });
    const app = await createTestApp(mockDB);

    const res = await app.request(`/api/schedules/${validSlug}`, {
      method: "DELETE",
      headers: { "x-edit-token": editToken },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 403 with wrong edit token", async () => {
    const { hashToken } = await import("../middleware/auth");
    const tokenHash = await hashToken(editToken);

    const mockDB = createMockD1((sql) => {
      if (sql.includes("select")) {
        return { results: [{ edit_token: "", edit_token_hash: tokenHash }] };
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
    const json = await res.json();
    expect(json.error).toBe("Edit token required");
  });
});
