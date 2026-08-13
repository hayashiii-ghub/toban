import { Hono } from "hono";
import { z } from "zod";
import { contactCategorySchema } from "../../shared/schemas";
import { LIMITS } from "../../shared/limits";

type Env = { Bindings: { SLACK_WEBHOOK_URL: string } };

const SLACK_TIMEOUT_MS = 5_000;

const contactSchema = z.object({
  category: contactCategorySchema,
  email: z.string().trim().email().max(LIMITS.contactEmail),
  message: z.string().trim().min(1).max(LIMITS.contactMessage),
  // ハニーポット: bot はこのフィールドを埋めてしまう。
  // 値があれば下で静かに 200 を返すため、ここでは長さ制約を掛けない
  // （max(0) だと非空 url が 400 になり honeypot 分岐に到達しない）
  url: z.string().optional(),
});

/** 通知用文字列から制御文字を除去 */
function sanitizeControlChars(str: string): string {
  // eslint-disable-next-line no-control-regex -- 意図的に制御文字を除去している
  return str.replace(/[\r\n\t\x00-\x1f]/g, " ").trim();
}

/** Slack がメンションやリンクとして解釈する制御記法を無効化する */
function escapeSlackText(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const app = new Hono<Env>();

app.post("/", async c => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: "入力内容を確認してください",
        details: parsed.error.flatten().fieldErrors,
      },
      400
    );
  }

  // ハニーポットに値がある場合は bot とみなして静かに成功を返す
  if (parsed.data.url) {
    return c.json({ ok: true });
  }

  const { category, email, message } = parsed.data;
  // category は enum の固定値なので sanitize 不要
  const safeEmail = sanitizeControlChars(email);
  const safeMessage = sanitizeControlChars(message);

  if (!c.env.SLACK_WEBHOOK_URL) {
    console.error("Slack webhook is not configured");
    return c.json(
      { error: "送信に失敗しました。しばらくしてからお試しください。" },
      500
    );
  }

  const text = [
    ":incoming_envelope: [toban] 新しいお問い合わせ",
    `種別: ${category}`,
    `メール: ${escapeSlackText(safeEmail)}`,
    "",
    escapeSlackText(safeMessage),
  ].join("\n");

  try {
    const response = await fetch(c.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    });

    if (response.ok) {
      return c.json({ ok: true });
    }

    console.error("Slack webhook rejected notification:", response.status);
  } catch (error) {
    console.error(
      "Slack webhook failed:",
      error instanceof Error ? error.name : "UnknownError"
    );
  }

  return c.json(
    { error: "送信に失敗しました。しばらくしてからお試しください。" },
    500
  );
});

export default app;
