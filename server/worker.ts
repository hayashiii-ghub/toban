import app from "./api";
import { drizzle } from "drizzle-orm/d1";
import { lt } from "drizzle-orm";
import { schedules } from "./db/schema";
import {
  isBot,
  handleScheduleOgp,
  renderTemplateListHtml,
  renderTemplateDetailHtml,
  handleSitemap,
  handleRobots,
} from "./handlers/seo";

interface Env {
  ASSETS: { fetch: typeof fetch };
  DB: D1Database;
}

const CLEANUP_RETENTION_DAYS = 90;

const HTML_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy":
    "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};

function withSecurityHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(HTML_SECURITY_HEADERS)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const { pathname } = url;
    const origin = url.origin;

    // API
    if (pathname.startsWith("/api/")) {
      return app.fetch(request, env, ctx);
    }

    // 動的 sitemap.xml
    if (pathname === "/sitemap.xml") {
      return handleSitemap(origin, env);
    }

    // 動的 robots.txt
    if (pathname === "/robots.txt") {
      return handleRobots(origin);
    }

    const ua = request.headers.get("user-agent") ?? "";
    const botRequest = isBot(ua);

    // 共有スケジュールページ — bot用OGP注入
    const slugMatch = pathname.match(/^\/s\/([a-zA-Z0-9_-]+)$/);
    if (slugMatch && botRequest) {
      return withSecurityHeaders(await handleScheduleOgp(url, env, slugMatch[1]));
    }

    // テンプレート一覧ページ — bot用プリレンダリング
    if (pathname === "/templates" && botRequest) {
      return withSecurityHeaders(new Response(renderTemplateListHtml(origin), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      }));
    }

    // テンプレート詳細ページ — bot用プリレンダリング
    const templateMatch = pathname.match(/^\/templates\/([a-z0-9-]+)$/);
    if (templateMatch && botRequest) {
      const html = renderTemplateDetailHtml(origin, templateMatch[1]);
      if (html) {
        return withSecurityHeaders(new Response(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        }));
      }
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    try {
      const cutoff = new Date(Date.now() - CLEANUP_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const db = drizzle(env.DB);
      await db.delete(schedules).where(lt(schedules.updatedAt, cutoff));
    } catch (error) {
      console.error("Scheduled cleanup failed:", error);
    }
  },
};
