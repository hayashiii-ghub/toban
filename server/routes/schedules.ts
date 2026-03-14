import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { schedules } from "../db/schema";
import type { TaskGroup, Member } from "../../shared/types";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

const taskGroupSchema = z.object({
  id: z.string().min(1),
  tasks: z.array(z.string().min(1)).min(1),
  emoji: z.string().min(1),
});

const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  bgColor: z.string().min(1),
  textColor: z.string().min(1),
});

const createScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  rotation: z.number().int().default(0),
  groups: z.array(taskGroupSchema).min(1),
  members: z.array(memberSchema).min(1),
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
  const now = new Date().toISOString();

  const db = drizzle(c.env.DB);
  await db.insert(schedules).values({
    id,
    slug,
    editToken,
    name: data.name,
    rotation: data.rotation,
    groupsJson: JSON.stringify(data.groups),
    membersJson: JSON.stringify(data.members),
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
    .select({ editToken: schedules.editToken })
    .from(schedules)
    .where(eq(schedules.slug, slug))
    .limit(1);

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  if (row.editToken !== token) {
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
    .select({ editToken: schedules.editToken })
    .from(schedules)
    .where(eq(schedules.slug, slug))
    .limit(1);

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  if (row.editToken !== token) {
    return c.json({ error: "Invalid edit token" }, 403);
  }

  await db.delete(schedules).where(eq(schedules.slug, slug));

  return c.json({ ok: true });
});

export default app;
