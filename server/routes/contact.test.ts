import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { CONTACT_CATEGORIES } from "../../shared/schemas";

const slackRequests: Array<{ url: string; payload: { text: string } }> = [];
const fetchMock = vi.fn();

async function makeApp() {
  const { default: contactRoutes } = await import("./contact");
  const app = new Hono();
  app.route("/api/contact", contactRoutes);
  return app;
}

function post(
  app: Hono,
  body: Record<string, unknown>,
  bindings: Record<string, string> = {
    SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/test/webhook",
  }
) {
  return app.request(
    "/api/contact",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    bindings
  );
}

const valid = (overrides: Record<string, unknown> = {}) => ({
  category: "不具合の報告",
  email: "user@example.com",
  message: "ボタンが押せません",
  ...overrides,
});

beforeEach(() => {
  slackRequests.length = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    async (input: string | URL | Request, init?: RequestInit) => {
      slackRequests.push({
        url: String(input),
        payload: JSON.parse(String(init?.body)) as { text: string },
      });
      return new Response("ok", { status: 200 });
    }
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/contact", () => {
  // drift guard: 公開している全種別が server に受理されること
  it.each(CONTACT_CATEGORIES)(
    "accepts advertised category %s and posts it to Slack",
    async category => {
      const app = await makeApp();
      const res = await post(app, valid({ category }));

      expect(res.status).toBe(200);
      expect(slackRequests).toHaveLength(1);
      expect(slackRequests[0].url).toBe(
        "https://hooks.slack.com/services/test/webhook"
      );
      expect(slackRequests[0].payload.text).toContain(`種別: ${category}`);
      expect(slackRequests[0].payload.text).toContain(
        "メール: user@example.com"
      );
      expect(slackRequests[0].payload.text).toContain("ボタンが押せません");
    }
  );

  it("escapes Slack control syntax in user input", async () => {
    const app = await makeApp();
    const res = await post(
      app,
      valid({
        email: "user+test@example.com",
        message: "<!channel> & <script>",
      })
    );

    expect(res.status).toBe(200);
    expect(slackRequests[0].payload.text).toContain(
      "&lt;!channel&gt; &amp; &lt;script&gt;"
    );
  });

  it("returns 500 when Slack rejects the notification", async () => {
    fetchMock.mockImplementation(
      async () => new Response("channel_not_found", { status: 404 })
    );
    const app = await makeApp();
    const res = await post(app, valid());

    expect(res.status).toBe(500);
  });

  it("returns 500 when the Slack webhook is not configured", async () => {
    const app = await makeApp();
    const res = await post(app, valid(), {});

    expect(res.status).toBe(500);
    expect(slackRequests).toHaveLength(0);
  });

  it("rejects an unknown category with 400 and sends nothing", async () => {
    const app = await makeApp();
    const res = await post(app, valid({ category: "ハッキング相談" }));

    expect(res.status).toBe(400);
    expect(slackRequests).toHaveLength(0);
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
    expect(slackRequests).toHaveLength(0);
  });
});
