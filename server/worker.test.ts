import { describe, expect, it, vi } from "vitest";

vi.mock("./handlers/seo", async importOriginal => {
  const actual = await importOriginal<typeof import("./handlers/seo")>();
  return {
    ...actual,
    handleScheduleOgp: vi.fn().mockResolvedValue(
      new Response("<html><head></head><body>shared</body></html>", {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    ),
  };
});

import worker from "./worker";

describe("SEO response policy", () => {
  it("Googlebot へ返す共有スケジュールを noindex にする", async () => {
    const request = new Request("https://toban.app/s/test-schedule", {
      headers: { "User-Agent": "Googlebot" },
    });
    const env = {
      ASSETS: { fetch: vi.fn() },
      DB: {},
      SLACK_WEBHOOK_URL: "",
    } as never;

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("通常ブラウザへ返す共有スケジュールも noindex にする", async () => {
    const request = new Request("https://toban.app/s/test-schedule", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const env = {
      ASSETS: {
        fetch: vi
          .fn()
          .mockImplementation(() =>
            fetch("data:text/html,<html><body>shared</body></html>")
          ),
      },
      DB: {},
      SLACK_WEBHOOK_URL: "",
    } as never;

    const response = await worker.fetch(request, env, {} as ExecutionContext);

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });
});
