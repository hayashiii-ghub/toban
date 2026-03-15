import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { schedules } from "../db/schema";
import type { TaskGroup, Member, RotationConfig } from "../../shared/types";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// SHA-256ハッシュ（Web Crypto API）
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// トークン検証（ハッシュ優先、旧カラムフォールバック）
async function verifyToken(
  row: { editToken: string; editTokenHash: string | null },
  token: string,
): Promise<boolean> {
  if (row.editTokenHash) {
    const hashed = await hashToken(token);
    return hashed === row.editTokenHash;
  }
  // フォールバック: 旧データはプレーンテキスト比較
  return row.editToken === token;
}

const taskGroupSchema = z.object({
  id: z.string().min(1).max(100),
  tasks: z.array(z.string().min(1).max(100)).min(1).max(20),
  emoji: z.string().min(1).max(10),
});

const memberSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  color: z.string().min(1).max(100),
  bgColor: z.string().min(1).max(100),
  textColor: z.string().min(1).max(100),
  skipped: z.boolean().optional(),
});

const rotationConfigSchema = z.object({
  mode: z.enum(["manual", "date"]),
  startDate: z.string().max(20).optional(),
  cycleDays: z.number().int().min(1).max(365).optional(),
}).optional();

const createScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  rotation: z.number().int().default(0),
  groups: z.array(taskGroupSchema).min(1).max(20),
  members: z.array(memberSchema).min(1).max(50),
  rotationConfig: rotationConfigSchema,
});

const updateScheduleSchema = createScheduleSchema;

// POST /api/schedules - Create
app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const id = nanoid();
  const slug = nanoid(10);
  const editToken = nanoid(32);
  const editTokenHash = await hashToken(editToken);
  const now = new Date().toISOString();

  const db = drizzle(c.env.DB);
  await db.insert(schedules).values({
    id,
    slug,
    editToken: "", // 空文字（ハッシュのみ保存）
    editTokenHash,
    name: data.name,
    rotation: data.rotation,
    groupsJson: JSON.stringify(data.groups),
    membersJson: JSON.stringify(data.members),
    rotationConfigJson: data.rotationConfig ? JSON.stringify(data.rotationConfig) : null,
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ slug, editToken }, 201);
});

// GET /api/schedules/:slug - Read (public)
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const db = drizzle(c.env.DB);

  const [row] = await db
    .select()
    .from(schedules)
    .where(eq(schedules.slug, slug))
    .limit(1);

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({
    slug: row.slug,
    name: row.name,
    rotation: row.rotation,
    groups: JSON.parse(row.groupsJson) as TaskGroup[],
    members: JSON.parse(row.membersJson) as Member[],
    rotationConfig: row.rotationConfigJson ? JSON.parse(row.rotationConfigJson) as RotationConfig : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
});

// PUT /api/schedules/:slug - Update (requires edit token)
app.put("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const token = c.req.header("x-edit-token");

  if (!token) {
    return c.json({ error: "Edit token required" }, 401);
  }

  const db = drizzle(c.env.DB);

  const [row] = await db
    .select({
      editToken: schedules.editToken,
      editTokenHash: schedules.editTokenHash,
    })
    .from(schedules)
    .where(eq(schedules.slug, slug))
    .limit(1);

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  if (!(await verifyToken(row, token))) {
    return c.json({ error: "Invalid edit token" }, 403);
  }

  const body = await c.req.json();
  const parsed = updateScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  await db
    .update(schedules)
    .set({
      name: data.name,
      rotation: data.rotation,
      groupsJson: JSON.stringify(data.groups),
      membersJson: JSON.stringify(data.members),
      rotationConfigJson: data.rotationConfig ? JSON.stringify(data.rotationConfig) : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schedules.slug, slug));

  return c.json({ ok: true });
});

// DELETE /api/schedules/:slug - Delete (requires edit token)
app.delete("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const token = c.req.header("x-edit-token");

  if (!token) {
    return c.json({ error: "Edit token required" }, 401);
  }

  const db = drizzle(c.env.DB);

  const [row] = await db
    .select({
      editToken: schedules.editToken,
      editTokenHash: schedules.editTokenHash,
    })
    .from(schedules)
    .where(eq(schedules.slug, slug))
    .limit(1);

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  if (!(await verifyToken(row, token))) {
    return c.json({ error: "Invalid edit token" }, 403);
  }

  await db.delete(schedules).where(eq(schedules.slug, slug));

  return c.json({ ok: true });
});

export default app;
