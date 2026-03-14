# toban-maker（当番表メーカー）

## Overview
掃除当番・給食当番・日直などのローテーション表を作成・印刷・共有できるWebアプリ。

## Stack
- **Frontend**: React SPA (Vite, wouter, Tailwind CSS v4, Framer Motion, shadcn/ui)
- **Backend**: Hono on Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Auth**: Edit token (no user auth) — URL + token controls view/edit access

## Directory Structure
```
client/           # React SPA source
  src/
    rotation/     # Core types, utils, constants, default state
    features/     # Feature components (home/)
    pages/        # Page components
    lib/          # API client, utilities
    components/   # Shared UI components (shadcn/ui)
server/           # Hono API
  routes/         # API route handlers
  db/             # Drizzle schema & migrations
shared/           # Shared TypeScript types (frontend & backend)
functions/        # Cloudflare Pages Functions entry point
```

## Development Commands
```bash
pnpm dev          # Vite dev server (port 3000)
pnpm dev:api      # Wrangler Pages dev server (port 8788)
pnpm dev:full     # Both in parallel
pnpm build        # Production build
pnpm check        # TypeScript type check
```

## Key Conventions
- Types shared between client/server live in `shared/types.ts`
- Client imports shared types via `@shared/*` alias
- Client internal imports use `@/*` alias
- localStorage is the primary data store; D1 is the cloud persistence layer
- Japanese UI — all user-facing strings are in Japanese
