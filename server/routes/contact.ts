import { Hono } from "hono";
import { Resend } from "resend";
import { z } from "zod";

type Env = { Bindings: { RESEND_API_KEY: string } };

const contactSchema = z.object({
  name: z.string().trim().min(1).max(50),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(1000),
  // ハニーポット: bot はこのフィールドを埋めてしまう
  url: z.string().max(0).optional(),
});

/** メール subject に使用する文字列から制御文字を除去 */
function sanitizeForSubject(str: string): string {
  return str.replace(/[\r\n\t\x00-\x1f]/g, " ").trim();
}

const app = new Hono<Env>();

app.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "入力内容を確認してください", details: parsed.error.flatten().fieldErrors }, 400);
  }

  // ハニーポットに値がある場合は bot とみなして静かに成功を返す
  if (parsed.data.url) {
    return c.json({ ok: true });
  }

  const { name, email, message } = parsed.data;
  const safeName = sanitizeForSubject(name);

  const resend = new Resend(c.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: "toban お問い合わせ <noreply@send.shigoto.dev>",
    to: "hay@shigoto.dev",
    replyTo: email,
    subject: `[toban] お問い合わせ: ${safeName}`,
    text: `名前: ${safeName}\nメール: ${email}\n\n${message}`,
  });

  if (error) {
    console.error("Resend error:", error);
    return c.json({ error: "送信に失敗しました。しばらくしてからお試しください。" }, 500);
  }

  return c.json({ ok: true });
});

export default app;
