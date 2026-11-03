import app from "./api";
import { drizzle } from "drizzle-orm/d1";
import { and, isNull, lt, or } from "drizzle-orm";
import { schedules } from "./db/schema";
import {
  isBot,
  isKnownAppRoute,
  handleScheduleOgp,
  renderLandingPageHtml,
  renderTemplateListHtml,
  renderTemplateDetailHtml,
  handleSitemap,
  handleRobots,
} from "./handlers/seo";

interface Env {
  ASSETS: { fetch: typeof fetch };
  DB: D1Database;
  SLACK_WEBHOOK_URL: string;
}

// クラウド保存の保持期間。この日数だけ更新がなく、カレンダーからも読まれていない行は scheduled で削除する。
// 変更したら利用者への告知（i18n の share.retention / shared.error.notFoundHint / client/public/privacy.html）も合わせること。
const CLEANUP_RETENTION_DAYS = 365;

// ブラウザのページ遷移には client/public/_headers が同じ値を付ける（Worker を通らないため）
export const HTML_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy":
    "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function withSecurityHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(HTML_SECURITY_HEADERS)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}

// 画面の URL（/about、/templates/office-cleaning、/s/xxxx）にはドットが無い。
// ドットがあるパスはファイル（拡張子、ドットファイル、.well-known、.git）。
function pathnameHasDot(pathname: string): boolean {
  return pathname.split("/").some(segment => segment.includes("."));
}

// not_found_handling は none。無いパスは ASSETS が 404 を返す。
// ドットの無い GET / HEAD だけ index.html に落とす。ファイルらしいパスは 404 のまま。
async function serveStaticOrSpa(request: Request, env: Env): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404) return assetResponse;

  const { pathname } = new URL(request.url);
  if (
    pathnameHasDot(pathname) ||
    (request.method !== "GET" && request.method !== "HEAD")
  ) {
    return assetResponse;
  }

  const indexUrl = new URL(request.url);
  indexUrl.pathname = "/";
  indexUrl.search = "";
  return env.ASSETS.fetch(new Request(indexUrl, request));
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

    // LP — bot用プリレンダリング
    if (pathname === "/about" && botRequest) {
      return withSecurityHeaders(
        new Response(renderLandingPageHtml(origin), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        })
      );
    }

    // 共有スケジュールページ — bot用OGP注入
    const slugMatch = pathname.match(/^\/s\/([a-zA-Z0-9_-]+)$/);
    if (slugMatch) {
      const response = botRequest
        ? await handleScheduleOgp(url, env, slugMatch[1])
        : await serveStaticOrSpa(request, env);
      const securedResponse = withSecurityHeaders(response);
      securedResponse.headers.set("X-Robots-Tag", "noindex");
      return securedResponse;
    }

    // テンプレート一覧ページ — bot用プリレンダリング
    if (pathname === "/templates" && botRequest) {
      return withSecurityHeaders(
        new Response(renderTemplateListHtml(origin), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        })
      );
    }

    // テンプレート詳細ページ — bot用プリレンダリング
    const templateMatch = pathname.match(/^\/templates\/([a-z0-9-]+)$/);
    if (templateMatch && botRequest) {
      const html = renderTemplateDetailHtml(origin, templateMatch[1]);
      if (html) {
        return withSecurityHeaders(
          new Response(html, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "public, max-age=86400",
            },
          })
        );
      }
    }

    // bot×未知の画面パスは 404（SPA の 200 による soft-404 を防ぐ）。
    // ドットを含むパスはファイルなので下の静的配信へ。無いファイルは 404。
    // 人の画面パスは、ファイルが無ければ index.html。
    if (botRequest && !pathnameHasDot(pathname) && !isKnownAppRoute(pathname)) {
      return withSecurityHeaders(new Response("Not found", { status: 404 }));
    }

    return withSecurityHeaders(await serveStaticOrSpa(request, env));
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    try {
      const cutoff = new Date(
        Date.now() - CLEANUP_RETENTION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      const db = drizzle(env.DB);
      const result = await db
        .delete(schedules)
        .where(
          and(
            lt(schedules.updatedAt, cutoff),
            or(
              isNull(schedules.calendarAccessedAt),
              lt(schedules.calendarAccessedAt, cutoff)
            )
          )
        );
      console.log(
        `Scheduled cleanup completed: cutoff=${cutoff}, deleted=${result.meta?.changes ?? "unknown"}`
      );
    } catch (error) {
      console.error("Scheduled cleanup failed:", error);
    }
  },
};
