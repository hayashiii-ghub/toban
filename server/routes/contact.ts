import { Hono } from "hono";
import { Resend } from "resend";
import { z } from "zod";
import { contactCategorySchema } from "../../shared/schemas";
import { LIMITS } from "../../shared/limits";

type Env = { Bindings: { RESEND_API_KEY: string } };

const contactSchema = z.object({
  category: contactCategorySchema,
  email: z.string().trim().email().max(LIMITS.contactEmail),
  message: z.string().trim().min(1).max(LIMITS.contactMessage),
  // ハニーポット: bot はこのフィールドを埋めてしまう。
  // 値があれば下で静かに 200 を返すため、ここでは長さ制約を掛けない
  // （max(0) だと非空 url が 400 になり honeypot 分岐に到達しない）
  url: z.string().optional(),
});

/** メール用文字列から制御文字を除去 */
function sanitizeControlChars(str: string): string {
  // eslint-disable-next-line no-control-regex -- 意図的に制御文字を除去している
  return str.replace(/[\r\n\t\x00-\x1f]/g, " ").trim();
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

  const resend = new Resend(c.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: "toban お問い合わせ <noreply@send.shigoto.dev>",
    to: "hay@shigoto.dev",
    replyTo: safeEmail,
    subject: `[toban] ${category}`,
    text: `種別: ${category}\nメール: ${safeEmail}\n\n${safeMessage}`,
  });

  if (error) {
    console.error("Resend error:", error);
    return c.json(
      { error: "送信に失敗しました。しばらくしてからお試しください。" },
      500
    );
  }

  return c.json({ ok: true });
});

export default app;
