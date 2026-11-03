import { readFileSync } from "node:fs";
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

import { TEMPLATE_SEO_DATA } from "../shared/seo-templates";
import { renderTemplateDetailHtml } from "./handlers/seo";

import worker, { HTML_SECURITY_HEADERS } from "./worker";

describe("撤去したページの転送（client/public/_redirects）", () => {
  // ブラウザのページ遷移は Worker を通らないので、転送は Worker ではなく静的アセットの _redirects に書く
  it("旧・順番決めページ /junban を /about へ 301 で転送する", () => {
    const rules = readFileSync("client/public/_redirects", "utf8");
    expect(rules).toMatch(/^\/junban \/about 301$/m);
  });
});

describe("ページ遷移に付けるヘッダー（client/public/_headers）", () => {
  // ブラウザのページ遷移は Worker を通らない。Worker と同じヘッダーが _headers にあるか見張る
  const rules = readFileSync("client/public/_headers", "utf8");
  const block = (path: string) =>
    rules.split(/\n(?=\S)/).find(b => b.startsWith(`${path}\n`)) ?? "";

  it("全ページに Worker と同じセキュリティヘッダーを付ける", () => {
    for (const [key, value] of Object.entries(HTML_SECURITY_HEADERS)) {
      expect(block("/*")).toContain(`  ${key}: ${value}`);
    }
  });

  it("共有ページは人が開いても noindex にする", () => {
    expect(block("/s/*")).toContain("  X-Robots-Tag: noindex");
  });
});

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

describe("bot とそれ以外の振り分け", () => {
  const assetsResponse = () => new Response("asset", { status: 200 });

  function envWithAssets() {
    const assets = { fetch: vi.fn(async () => assetsResponse()) };
    return {
      env: { ASSETS: assets, DB: {}, SLACK_WEBHOOK_URL: "" } as never,
      assets,
    };
  }

  function get(path: string, userAgent: string) {
    return new Request(`https://toban.app${path}`, {
      headers: { "User-Agent": userAgent },
    });
  }

  it.each([
    "Mediapartners-Google",
    "Mozilla/5.0 (compatible; Google-Display-Ads-Bot/1.0; +http://www.google.com/bot.html)",
  ])("AdSense crawler %s receives the existing article HTML", async ua => {
    const { env, assets } = envWithAssets();
    for (const seo of TEMPLATE_SEO_DATA) {
      const response = await worker.fetch(
        get(`/templates/${seo.slug}`, ua),
        env,
        {} as ExecutionContext
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(
        renderTemplateDetailHtml("https://toban.app", seo.slug)
      );
    }
    expect(assets.fetch).not.toHaveBeenCalled();
    const missing = await worker.fetch(
      get("/templates/missing", ua),
      env,
      {} as ExecutionContext
    );
    expect(missing.status).toBe(404);
  });

  it("bot には /about をプリレンダリングした HTML で返す", async () => {
    const { env, assets } = envWithAssets();
    const res = await worker.fetch(
      get("/about", "Googlebot"),
      env,
      {} as ExecutionContext
    );
    expect(res.headers.get("Content-Type")).toContain("text/html");
    expect(await res.text()).toContain("<h1");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it("bot が知らないページを踏んだら 404 を返す（SPA の 200 で soft-404 にしない）", async () => {
    const { env, assets } = envWithAssets();
    const res = await worker.fetch(
      get("/no-such-page", "Googlebot"),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(404);
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it("拡張子付きのパス（ads.txt など）は bot にも静的ファイルとして渡す", async () => {
    const { env, assets } = envWithAssets();
    const res = await worker.fetch(
      get("/ads.txt", "Mediapartners-Google"),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    expect(assets.fetch).toHaveBeenCalledOnce();
  });

  it("静的ページの /privacy は bot にも 404 を返さず静的ファイルに渡す", async () => {
    const { env, assets } = envWithAssets();
    const res = await worker.fetch(
      get("/privacy", "Mediapartners-Google"),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    expect(assets.fetch).toHaveBeenCalledOnce();
  });

  it("人には知らないページも SPA に任せる", async () => {
    const { env, assets } = envWithAssets();
    const res = await worker.fetch(
      get("/no-such-page", "Mozilla/5.0"),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    expect(assets.fetch).toHaveBeenCalledOnce();
  });
});

describe("存在しないファイルと画面のパス", () => {
  const indexHtml = "<!doctype html><title>toban</title>";

  function envWithFiles(files: Record<string, () => Response>) {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const file = files[new URL(url).pathname];
      return file ? file() : new Response("missing", { status: 404 });
    });
    return {
      env: { ASSETS: { fetch }, DB: {}, SLACK_WEBHOOK_URL: "" } as never,
      fetch,
    };
  }

  function pathsOf(fetch: ReturnType<typeof vi.fn>): string[] {
    return fetch.mock.calls.map(call => {
      const input = call[0] as RequestInfo | URL;
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return new URL(url).pathname;
    });
  }

  const index = () =>
    new Response(indexHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

  it.each([
    "/backend/.env",
    "/.git/config",
    "/wp-login.php",
    "/package.json",
    "/assets/does-not-exist.js",
    "/.well-known/missing.txt",
  ])("未知のドット付きパス %s は 404", async path => {
    const { env, fetch } = envWithFiles({ "/": index });
    const res = await worker.fetch(
      new Request(`https://toban.app${path}`),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("missing");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(pathsOf(fetch)).toEqual([path]);
  });

  it("bot が未知のファイルを踏んでも index.html の 200 にしない", async () => {
    const { env, fetch } = envWithFiles({ "/": index });
    const res = await worker.fetch(
      new Request("https://toban.app/missing-file.txt", {
        headers: { "User-Agent": "Googlebot" },
      }),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(404);
    expect(pathsOf(fetch)).toEqual(["/missing-file.txt"]);
  });

  it.each(["/no-such-page", "/about", "/templates/office-cleaning"])(
    "ドットの無い未知の画面パス %s は index.html",
    async path => {
      const { env, fetch } = envWithFiles({ "/": index });
      const res = await worker.fetch(
        new Request(`https://toban.app${path}`),
        env,
        {} as ExecutionContext
      );
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(indexHtml);
      expect(res.headers.get("Content-Type")).toContain("text/html");
      expect(pathsOf(fetch)).toEqual([path, "/"]);
    }
  );

  it("HEAD の画面パスも index.html を返す", async () => {
    const { env, fetch } = envWithFiles({ "/": index });
    const res = await worker.fetch(
      new Request("https://toban.app/about", { method: "HEAD" }),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    expect(pathsOf(fetch)).toEqual(["/about", "/"]);
  });

  it("画面パスへの POST は index.html にしない", async () => {
    const { env, fetch } = envWithFiles({ "/": index });
    const res = await worker.fetch(
      new Request("https://toban.app/about", { method: "POST" }),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(404);
    expect(pathsOf(fetch)).toEqual(["/about"]);
  });

  it("共有ページはファイルが無くても SPA で、noindex のまま", async () => {
    const { env, fetch } = envWithFiles({ "/": index });
    const res = await worker.fetch(
      new Request("https://toban.app/s/abcdefghij"),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(indexHtml);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(pathsOf(fetch)).toEqual(["/s/abcdefghij", "/"]);
  });

  it("実在する静的ファイルは 200", async () => {
    const { env, fetch } = envWithFiles({
      "/favicon.svg": () =>
        new Response("<svg></svg>", {
          headers: { "Content-Type": "image/svg+xml" },
        }),
    });
    const res = await worker.fetch(
      new Request("https://toban.app/favicon.svg"),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<svg></svg>");
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
    expect(pathsOf(fetch)).toEqual(["/favicon.svg"]);
  });

  it("実在する /.well-known/ は 200、無いものは 404", async () => {
    const { env } = envWithFiles({
      "/.well-known/security.txt": () =>
        new Response("Contact: mailto:hello@example.com", {
          headers: { "Content-Type": "text/plain" },
        }),
    });
    const present = await worker.fetch(
      new Request("https://toban.app/.well-known/security.txt"),
      env,
      {} as ExecutionContext
    );
    expect(present.status).toBe(200);
    expect(await present.text()).toBe("Contact: mailto:hello@example.com");

    const missing = await worker.fetch(
      new Request("https://toban.app/.well-known/assetlinks.json"),
      env,
      {} as ExecutionContext
    );
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("missing");
  });

  it("拡張子付きの API（calendar.ics）は API のまま", async () => {
    const { env, fetch } = envWithFiles({ "/": index });
    const res = await worker.fetch(
      new Request("https://toban.app/api/schedules/abcdefghij/calendar.ics"),
      env,
      {} as ExecutionContext
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(res.status).not.toBe(200);
    expect(res.headers.get("Content-Type") ?? "").not.toContain("text/html");
    expect(await res.text()).not.toContain("<!doctype html");
  });

  it("API の入力エラーはこれまでどおり JSON の 400", async () => {
    const { env, fetch } = envWithFiles({ "/": index });
    const res = await worker.fetch(
      new Request("https://toban.app/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://toban.app",
        },
        body: "not-json",
      }),
      env,
      {} as ExecutionContext
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toContain("application/json");
  });

  it("sitemap.xml は静的ファイルの 404 にしない", async () => {
    const { env, fetch } = envWithFiles({});
    const res = await worker.fetch(
      new Request("https://toban.app/sitemap.xml"),
      env,
      {} as ExecutionContext
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    expect(await res.text()).toContain("<urlset");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("not_found_handling は single-page-application ではない", () => {
    const config = readFileSync("wrangler.jsonc", "utf8");
    expect(config).toMatch(/"not_found_handling":\s*"none"/);
    expect(config).not.toMatch(
      /"not_found_handling":\s*"single-page-application"/
    );
  });
});

describe("1 年使われていない当番表の削除（scheduled）", () => {
  it("編集が 1 年なくても、カレンダーから読まれている表は消さない", async () => {
    const statements: { sql: string; params: unknown[] }[] = [];
    const DB = {
      prepare(sql: string) {
        const stmt = {
          params: [] as unknown[],
          bind(...params: unknown[]) {
            stmt.params = params;
            return stmt;
          },
          async run() {
            statements.push({ sql, params: stmt.params });
            return { results: [], success: true, meta: { changes: 0 } };
          },
        };
        return stmt;
      },
    } as unknown as D1Database;

    await worker.scheduled(
      {} as ScheduledEvent,
      { DB } as Parameters<typeof worker.scheduled>[1],
      {} as ExecutionContext
    );

    expect(statements).toHaveLength(1);
    const [{ sql, params }] = statements;
    expect(sql).toMatch(/^delete from "schedules"/);
    expect(sql).toContain('"updated_at" < ?');
    expect(sql).toContain('"calendar_accessed_at" is null');
    expect(sql).toContain('"calendar_accessed_at" < ?');
    // どちらも同じ「1 年前」で比べる
    expect(params[0]).toBe(params[1]);
  });
});
