import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { CONTACT_CATEGORIES } from "../../shared/schemas";

// Capture the payload passed to resend.emails.send so we assert on values
// (subject / body / replyTo), never on call counts.
const sentEmails = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock("resend", () => ({
  // 通常 function 式で constructor 可能にする（new Resend(...) される）
  Resend: vi.fn(function () {
    return {
      emails: {
        send: vi.fn(async (payload: Record<string, unknown>) => {
          sentEmails.push(payload);
          return { data: { id: "test-email-id" }, error: null };
        }),
      },
    };
  }),
}));

async function makeApp() {
  const { default: contactRoutes } = await import("./contact");
  const app = new Hono();
  app.route("/api/contact", contactRoutes);
  return app;
}

function post(app: Hono, body: Record<string, unknown>) {
  return app.request(
    "/api/contact",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { RESEND_API_KEY: "test-key" }
  );
}

const valid = (overrides: Record<string, unknown> = {}) => ({
  category: "不具合の報告",
  email: "user@example.com",
  message: "ボタンが押せません",
  ...overrides,
});

beforeEach(() => {
  sentEmails.length = 0;
});

describe("POST /api/contact", () => {
  // drift guard: 公開している全種別が server に受理されること
  it.each(CONTACT_CATEGORIES)(
    "accepts advertised category %s and uses it in the email",
    async category => {
      const app = await makeApp();
      const res = await post(app, valid({ category }));

      expect(res.status).toBe(200);
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].subject).toBe(`[toban] ${category}`);
      expect(
        (sentEmails[0].text as string).startsWith(`種別: ${category}`)
      ).toBe(true);
    }
  );

  it("rejects an unknown category with 400 and sends nothing", async () => {
    const app = await makeApp();
    const res = await post(app, valid({ category: "ハッキング相談" }));

    expect(res.status).toBe(400);
    expect(sentEmails).toHaveLength(0);
  });

  it("rejects a missing category with 400", async () => {
    const app = await makeApp();
    const { category: _omit, ...withoutCategory } = valid();
    const res = await post(app, withoutCategory);

    expect(res.status).toBe(400);
  });

  it("silently drops a honeypot-filled submission with 200 and sends nothing", async () => {
    const app = await makeApp();
    const res = await post(app, valid({ url: "http://spam.example/bot" }));

    expect(res.status).toBe(200);
    expect(sentEmails).toHaveLength(0);
  });
});
