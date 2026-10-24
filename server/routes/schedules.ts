import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { FONT_IDS } from "../../shared/appearance";
import { LIMITS } from "../../shared/limits";
import { schedules } from "../db/schema";
import { ensureSchedulesSchema } from "../db/ensureSchema";
import {
  hashToken,
  authenticateEditRequest,
  SLUG_PATTERN,
} from "../middleware/auth";
import {
  taskGroupSchema,
  memberSchema,
  rotationConfigObjectSchema,
  createScheduleSchema,
  updateScheduleSchema,
} from "../schemas/schedule";
import { buildCalendar } from "../calendar";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// スキーマの初期化をミドルウェアで一元管理
app.use("*", async (c, next) => {
  await ensureSchedulesSchema(c.env.DB);
  await next();
});

function logDatabaseError(
  scope: string,
  error: unknown,
  context: Record<string, unknown> = {}
) {
  const serializedError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
  console.error(`[schedules:${scope}]`, { ...context, error: serializedError });
}

async function parseJsonBody(c: {
  req: { json(): Promise<unknown> };
  json: (data: unknown, status: number) => Response;
}): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  try {
    return { ok: true, data: await c.req.json() };
  } catch {
    return { ok: false, response: c.json({ error: "Invalid JSON" }, 400) };
  }
}

function serializeSchedule(row: typeof schedules.$inferSelect) {
  try {
    // 保存済み JSON も作成時と同じ件数で切る
    const groups = z
      .array(taskGroupSchema)
      .max(LIMITS.groups)
      .parse(JSON.parse(row.groupsJson));
    const members = z
      .array(memberSchema)
      .max(LIMITS.members)
      .parse(JSON.parse(row.membersJson));
    const rotationConfig = row.rotationConfigJson
      ? rotationConfigObjectSchema.parse(JSON.parse(row.rotationConfigJson))
      : undefined;
    const assignmentMode = row.assignmentMode
      ? z.enum(["member", "task"]).parse(row.assignmentMode)
      : undefined;
    const fontId = row.fontId ? z.enum(FONT_IDS).parse(row.fontId) : undefined;

    return {
      slug: row.slug,
      name: row.name,
      rotation: row.rotation,
      groups,
      members,
      rotationConfig,
      assignmentMode,
      designThemeId: row.designThemeId ?? undefined,
      fontId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (error) {
    logDatabaseError("serialize", error, { slug: row.slug });
    throw error;
  }
}

// POST /api/schedules - Create
app.post("/", async c => {
  const body = await parseJsonBody(c);
  if (!body.ok) return body.response;

  const parsed = createScheduleSchema.safeParse(body.data);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      400
    );
  }

  const data = parsed.data;
  const editToken = nanoid(32);
  const editTokenHash = await hashToken(editToken);
  const now = new Date().toISOString();
  const db = drizzle(c.env.DB);

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const id = nanoid();
      const slug = nanoid(10);
      try {
        await db.insert(schedules).values({
          id,
          slug,
          editToken: "",
          editTokenHash,
          isPublic: false,
          name: data.name,
          rotation: data.rotation,
          groupsJson: JSON.stringify(data.groups),
          membersJson: JSON.stringify(data.members),
          rotationConfigJson: data.rotationConfig
            ? JSON.stringify(data.rotationConfig)
            : null,
          assignmentMode: data.assignmentMode ?? null,
          designThemeId: data.designThemeId ?? null,
          fontId: data.fontId ?? null,
          createdAt: now,
          updatedAt: now,
        });
        return c.json({ slug, editToken }, 201);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("UNIQUE"))
          throw error;
      }
    }
  } catch (error) {
    logDatabaseError("create", error, { name: data.name });
    return c.json({ error: "Database error" }, 500);
  }

  return c.json({ error: "Failed to generate unique slug" }, 500);
});

// GET /api/schedules/:slug/edit - Read (requires edit token)
app.get("/:slug/edit", async c => {
  const auth = await authenticateEditRequest(c);
  if ("error" in auth) return auth.error;
  const { slug, db } = auth;

  try {
    const [row] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.slug, slug))
      .limit(1);
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(serializeSchedule(row));
  } catch (error) {
    logDatabaseError("edit-read", error, { slug });
    return c.json({ error: "Corrupted schedule data" }, 500);
  }
});

// GET /api/schedules/:slug/calendar.ics - カレンダーの購読（共有している、日付で交代する表だけ）
// ?member=<id> でその人の当番だけ、省けば全員。?lang=en で英語の区切り
app.get("/:slug/calendar.ics", async c => {
  const slug = c.req.param("slug");
  if (!SLUG_PATTERN.test(slug)) return c.text("Invalid slug", 400);
  const memberId = c.req.query("member") || undefined;
  const lang = c.req.query("lang") === "en" ? "en" : "ja";

  const db = drizzle(c.env.DB);
  let row: typeof schedules.$inferSelect | undefined;
  let schedule: ReturnType<typeof serializeSchedule>;
  try {
    [row] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.slug, slug))
      .limit(1);
    if (!row || !row.isPublic) return c.text("Not found", 404);
    schedule = serializeSchedule(row);
  } catch (error) {
    logDatabaseError("calendar", error, { slug });
    return c.text("Corrupted schedule data", 500);
  }
  if (schedule.rotationConfig?.mode !== "date") {
    return c.text("Not found", 404);
  }
  if (memberId && !schedule.members.some(m => m.id === memberId)) {
    return c.text("Not found", 404);
  }

  // 読まれている表は 1 年の削除から外す（worker.ts の scheduled）。書くのは 1 日に 1 回まで。
  // updated_at は変えない（編集の新しさを表す値なので）
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  if (!row.calendarAccessedAt || row.calendarAccessedAt < dayAgo) {
    try {
      await db
        .update(schedules)
        .set({ calendarAccessedAt: now.toISOString() })
        .where(eq(schedules.id, row.id));
    } catch (error) {
      // 記録に失敗しても、カレンダーは返す
      logDatabaseError("calendar-access", error, { slug });
    }
  }

  const body = buildCalendar(schedule, {
    memberId,
    lang,
    origin: new URL(c.req.url).origin,
    now,
  });
  return c.body(body, 200, {
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "max-age=3600",
    "Content-Disposition": 'inline; filename="toban.ics"',
  });
});

// GET /api/schedules/:slug - Read (public)
app.get("/:slug", async c => {
  const slug = c.req.param("slug");
  if (!SLUG_PATTERN.test(slug)) return c.json({ error: "Invalid slug" }, 400);

  const db = drizzle(c.env.DB);

  try {
    const [row] = await db
      .select()
      .from(schedules)
      .where(eq(schedules.slug, slug))
      .limit(1);
    if (!row || !row.isPublic) return c.json({ error: "Not found" }, 404);
    return c.json(serializeSchedule(row));
  } catch (error) {
    logDatabaseError("public-read", error, { slug });
    return c.json({ error: "Corrupted schedule data" }, 500);
  }
});

// POST /api/schedules/:slug/publish - Publish schedule
app.post("/:slug/publish", async c => {
  const auth = await authenticateEditRequest(c);
  if ("error" in auth) return auth.error;
  const { slug, db } = auth;

  try {
    await db
      .update(schedules)
      .set({ isPublic: true, updatedAt: new Date().toISOString() })
      .where(eq(schedules.slug, slug));
  } catch (error) {
    logDatabaseError("publish", error, { slug });
    return c.json({ error: "Database error" }, 500);
  }
  return c.json({ ok: true });
});

// PUT /api/schedules/:slug - Update (requires edit token)
app.put("/:slug", async c => {
  const auth = await authenticateEditRequest(c);
  if ("error" in auth) return auth.error;
  const { slug, db } = auth;

  const body = await parseJsonBody(c);
  if (!body.ok) return body.response;

  const parsed = updateScheduleSchema.safeParse(body.data);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      400
    );
  }

  const data = parsed.data;
  try {
    await db
      .update(schedules)
      .set({
        name: data.name,
        rotation: data.rotation,
        groupsJson: JSON.stringify(data.groups),
        membersJson: JSON.stringify(data.members),
        rotationConfigJson: data.rotationConfig
          ? JSON.stringify(data.rotationConfig)
          : null,
        assignmentMode: data.assignmentMode ?? null,
        designThemeId: data.designThemeId ?? null,
        fontId: data.fontId ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schedules.slug, slug));
  } catch (error) {
    logDatabaseError("update", error, { slug, name: data.name });
    return c.json({ error: "Database error" }, 500);
  }
  return c.json({ ok: true });
});

// DELETE /api/schedules/:slug - Delete (requires edit token)
app.delete("/:slug", async c => {
  const auth = await authenticateEditRequest(c);
  if ("error" in auth) return auth.error;
  const { slug, db } = auth;

  try {
    await db.delete(schedules).where(eq(schedules.slug, slug));
  } catch (error) {
    logDatabaseError("delete", error, { slug });
    return c.json({ error: "Database error" }, 500);
  }
  return c.json({ ok: true });
});

export default app;
