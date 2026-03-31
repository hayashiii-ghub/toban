import { drizzle } from "drizzle-orm/d1";
import { eq, desc } from "drizzle-orm";
import { schedules } from "../db/schema";
import { ensureSchedulesSchema } from "../db/ensureSchema";
import {
  TEMPLATE_SEO_DATA,
  TEMPLATE_SEO_MAP,
  TEMPLATE_CATEGORIES,
  COMMON_FAQ,
} from "../../shared/seo-templates";

interface Env {
  ASSETS: { fetch: typeof fetch };
  DB: D1Database;
}

const BOT_UA_PATTERN =
  /facebookexternalhit|Twitterbot|LinkedInBot|Line\/|Slackbot|Discordbot|Googlebot|bingbot|Applebot/i;

export function isBot(ua: string): boolean {
  return BOT_UA_PATTERN.test(ua);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── 共有スケジュールのOGP注入 ───

export async function handleScheduleOgp(
  url: URL,
  env: Env,
  slug: string,
): Promise<Response> {
  await ensureSchedulesSchema(env.DB);
  const db = drizzle(env.DB);
  const [schedule] = await db
    .select({ name: schedules.name, isPublic: schedules.isPublic })
    .from(schedules)
    .where(eq(schedules.slug, slug))
    .limit(1);

  if (!schedule || !schedule.isPublic) {
    return new Response("Not found", { status: 404 });
  }

  const title = escapeHtml(schedule.name);
  const description = escapeHtml(`「${schedule.name}」の当番表`);
  const ogUrl = escapeHtml(url.href);

  const assetResponse = await env.ASSETS.fetch(new Request(`${url.origin}/`));
  let html = await assetResponse.text();

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${title} - toban</title>`,
  );

  const ogTags = [
    `<meta property="og:title" content="${title} - toban" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${ogUrl}" />`,
    `<meta property="og:type" content="website" />`,
  ].join("\n    ");

  html = html.replace("</head>", `    ${ogTags}\n  </head>`);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

// ─── LP のプリレンダリング (bot用) ───

export function renderLandingPageHtml(origin: string): string {
  const title = "toban（トバン）｜無料で当番表を作成・印刷・共有";
  const desc = "掃除当番・給食当番・日直のローテーション表を無料でかんたんに作成・印刷・共有できるWebアプリ。アカウント登録不要、ブラウザだけで完結します。";

  const faqHtml = COMMON_FAQ.map(
    (f) => `<dt>${escapeHtml(f.question)}</dt><dd>${escapeHtml(f.answer)}</dd>`,
  ).join("");

  const templateListHtml = TEMPLATE_SEO_DATA.slice(0, 6)
    .map(
      (t) =>
        `<li><a href="${origin}/templates/${t.slug}">${escapeHtml(t.heading)}</a></li>`,
    )
    .join("");

  const schema = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "toban",
      url: `${origin}/`,
      description: desc,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "All",
      offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: COMMON_FAQ.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ]);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="canonical" href="${origin}/">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${origin}/">
<meta property="og:type" content="website">
<meta property="og:image" content="${origin}/pwa-512.png">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="toban">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${origin}/pwa-512.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<script type="application/ld+json">${schema}</script>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(desc)}</p>
<a href="${origin}/app">当番表を作る</a>
<h2>tobanの特徴</h2>
<ul>
<li>登録不要 — アカウント不要、ブラウザだけで完結</li>
<li>印刷がきれい — カード・一覧表・カレンダーの3形式</li>
<li>URLで共有 — LINEやメールで送れる</li>
<li>完全無料 — すべての機能を無料で利用可能</li>
</ul>
<h2>すぐ使えるテンプレート</h2>
<ul>${templateListHtml}</ul>
<a href="${origin}/templates">テンプレート一覧を見る</a>
<h2>よくある質問</h2>
<dl>${faqHtml}</dl>
</main>
<footer><a href="${origin}/app">当番表を作る</a> | <a href="${origin}/templates">テンプレート一覧</a></footer>
</body>
</html>`;
}

// ─── テンプレートページのプリレンダリング (bot用) ───

export function renderTemplateListHtml(origin: string): string {
  const title = "当番表テンプレート一覧｜無料で使えるtoban（トバン）";
  const desc = `掃除当番・給食当番・日直など、すぐ使える無料テンプレートを${TEMPLATE_SEO_DATA.length}種類ご用意。テンプレートを選んで、メンバーや担当を編集するだけで当番表が完成します。`;

  const categoryHtml = TEMPLATE_CATEGORIES.map((cat) => {
    const templates = TEMPLATE_SEO_DATA.filter((t) => t.categoryId === cat.id);
    if (templates.length === 0) return "";
    const items = templates
      .map(
        (t) =>
          `<li><a href="${origin}/templates/${t.slug}">${escapeHtml(t.heading)}</a><p>${escapeHtml(t.description)}</p></li>`,
      )
      .join("\n");
    return `<section><h2>${cat.emoji} ${escapeHtml(cat.label)}</h2><p>${escapeHtml(cat.description)}</p><ul>${items}</ul></section>`;
  }).join("\n");

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: COMMON_FAQ.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  });

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="canonical" href="${origin}/templates">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${origin}/templates">
<meta property="og:type" content="website">
<meta property="og:image" content="${origin}/pwa-512.png">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="toban">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<script type="application/ld+json">${faqSchema}</script>
</head>
<body>
<header><nav><a href="${origin}/">toban</a> / <span>テンプレート一覧</span></nav></header>
<main>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(desc)}</p>
${categoryHtml}
<h2>よくある質問</h2>
<dl>${COMMON_FAQ.map((f) => `<dt>${escapeHtml(f.question)}</dt><dd>${escapeHtml(f.answer)}</dd>`).join("")}</dl>
</main>
<footer><a href="${origin}/">toban トップへ</a></footer>
</body>
</html>`;
}

export function renderTemplateDetailHtml(origin: string, slug: string): string | null {
  const seo = TEMPLATE_SEO_MAP.get(slug);
  if (!seo) return null;

  const cat = TEMPLATE_CATEGORIES.find((c) => c.id === seo.categoryId);
  const fullTitle = `${seo.title}｜toban（トバン）`;

  const faqAndBreadcrumb = JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: COMMON_FAQ.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "toban", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: "テンプレート一覧", item: `${origin}/templates` },
        { "@type": "ListItem", position: 3, name: seo.heading },
      ],
    },
  ]);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${escapeHtml(seo.description)}">
<link rel="canonical" href="${origin}/templates/${slug}">
<meta property="og:title" content="${escapeHtml(fullTitle)}">
<meta property="og:description" content="${escapeHtml(seo.description)}">
<meta property="og:url" content="${origin}/templates/${slug}">
<meta property="og:type" content="article">
<meta property="og:image" content="${origin}/pwa-512.png">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="toban">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<script type="application/ld+json">${faqAndBreadcrumb}</script>
</head>
<body>
<header><nav><a href="${origin}/">toban</a> / <a href="${origin}/templates">テンプレート一覧</a> / <span>${escapeHtml(seo.heading)}</span></nav></header>
<main>
${cat ? `<p>${cat.emoji} ${escapeHtml(cat.label)}</p>` : ""}
<h1>${escapeHtml(seo.heading)}</h1>
<p>${escapeHtml(seo.intro)}</p>
<a href="${origin}/app?template=${seo.templateIndex}">このテンプレートで当番表を作る</a>
<h2>よくある質問</h2>
<dl>${COMMON_FAQ.map((f) => `<dt>${escapeHtml(f.question)}</dt><dd>${escapeHtml(f.answer)}</dd>`).join("")}</dl>
</main>
<footer><a href="${origin}/templates">テンプレート一覧に戻る</a> | <a href="${origin}/">toban トップへ</a></footer>
</body>
</html>`;
}

// ─── 動的 sitemap.xml ───

export async function handleSitemap(origin: string, env: Env): Promise<Response> {
  const today = new Date().toISOString().split("T")[0];

  let urls = `  <url>
    <loc>${origin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${origin}/templates</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`;

  for (const tpl of TEMPLATE_SEO_DATA) {
    urls += `
  <url>
    <loc>${origin}/templates/${tpl.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  try {
    await ensureSchedulesSchema(env.DB);
    const db = drizzle(env.DB);
    const recentSchedules = await db
      .select({ slug: schedules.slug, updatedAt: schedules.updatedAt })
      .from(schedules)
      .where(eq(schedules.isPublic, true))
      .orderBy(desc(schedules.updatedAt))
      .limit(200);

    for (const s of recentSchedules) {
      const lastmod = s.updatedAt ? s.updatedAt.split("T")[0] : today;
      urls += `
  <url>
    <loc>${origin}/s/${s.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
    }
  } catch {
    // DB障害時はスケジュールなしで返す
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

// ─── 動的 robots.txt ───

export function handleRobots(origin: string): Response {
  const text = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /app
Disallow: /transfer

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
