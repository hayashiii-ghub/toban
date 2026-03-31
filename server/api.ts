import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import scheduleRoutes from "./routes/schedules";
import contactRoutes from "./routes/contact";
import { getSchedulesSchemaStatus } from "./db/ensureSchema";

type Env = { Bindings: { DB: D1Database; ENVIRONMENT?: string; RESEND_API_KEY: string } };

const app = new Hono<Env>();

const PROD_ORIGINS = ["https://toban.app"];
const DEV_ORIGINS = [
  "https://toban.app",
  "http://localhost:3000",
  "http://localhost:8788",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8788",
];

// CORS: デフォルトは本番ドメインのみ。ENVIRONMENT=development 時のみlocalhostも許可
app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      const isDev = c.env.ENVIRONMENT !== undefined && c.env.ENVIRONMENT === "development";
      const origins = isDev ? DEV_ORIGINS : PROD_ORIGINS;
      return origins.includes(origin) ? origin : null;
    },
  }),
);

// リクエストボディサイズ制限: 100KB
app.use("/api/*", bodyLimit({ maxSize: 100 * 1024 }));

// セキュリティヘッダー
app.use("/api/*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});

// メモリベース簡易レート制限（Workerインスタンス単位）
const MAX_RATE_LIMIT_ENTRIES = 10_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
let rateLimitRequestCount = 0;

function getMaxRequests(method: string): number {
  if (method === "POST") return 10;
  if (method === "PUT" || method === "DELETE") return 20;
  return 60; // GET
}

function cleanupRateLimitMap(now: number): void {
  rateLimitMap.forEach((v, k) => {
    if (now > v.resetAt) rateLimitMap.delete(k);
  });
}

// NOTE: レート制限はインメモリ。Cloudflare Workersの各isolate間で共有されないため、
// 分散環境では実効レートは設定値より高くなる可能性がある。
// 現在の規模では十分だが、将来的にはDurable ObjectsやKVへの移行を検討。
app.use("/api/*", async (c, next) => {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
  const method = c.req.method;
  const key = `${ip}:${method}`;
  const now = Date.now();

  // 100リクエストごと、またはエントリ数上限超過時に掃除
  if (++rateLimitRequestCount % 100 === 0 || rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    cleanupRateLimitMap(now);
  }

  let entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000 };
    rateLimitMap.set(key, entry);
  }

  entry.count++;

  if (entry.count > getMaxRequests(method)) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    c.header("Retry-After", String(retryAfter > 0 ? retryAfter : 1));
    return c.json({ error: "Too many requests" }, 429);
  }

  await next();
});

app.get("/api/health/schema", async (c) => {
  const status = await getSchedulesSchemaStatus(c.env.DB);

  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex");

  const ok = status.missingColumns.length === 0;
  return c.json({ ok }, ok ? 200 : 503);
});

app.route("/api/schedules", scheduleRoutes);
app.route("/api/contact", contactRoutes);

export default app;
