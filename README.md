# toban-maker（当番表メーカー）

掃除当番・給食当番・日直などのローテーション表を作成・印刷・共有できる無料 Web アプリ。登録不要、ブラウザだけですぐ使えます。

## 機能

- ローテーション表の作成・編集（メンバー・当番の自由なカスタマイズ）
- 印刷用レイアウト
- URL による共有（編集トークンで閲覧/編集を制御）
- レスポンシブ対応

## 技術スタック

- **Frontend**: React (Vite) + Tailwind CSS v4 + Framer Motion
- **Backend**: Hono on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Routing**: wouter

## セットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発サーバー起動
pnpm dev
```

ブラウザで http://localhost:3000/ を開きます。

## 開発コマンド

| コマンド | 説明 |
|---|---|
| `pnpm dev` | Vite 開発サーバー (port 3000) |
| `pnpm dev:api` | Wrangler Pages dev サーバー (port 8788) |
| `pnpm dev:full` | フロント + API を同時起動 |
| `pnpm build` | 本番ビルド |
| `pnpm check` | TypeScript 型チェック |
| `pnpm db:generate` | Drizzle マイグレーション生成 |
| `pnpm db:migrate:local` | ローカル D1 にマイグレーション適用 |

## デプロイ (Cloudflare Workers + D1)

1. D1 データベースを作成:
   ```bash
   wrangler d1 create toban-maker-db
   ```
2. 取得した D1 の UUID を Cloudflare の環境変数 `CLOUDFLARE_D1_DATABASE_ID` に設定する
   - プレビュー用 DB を分ける場合は `CLOUDFLARE_D1_PREVIEW_DATABASE_ID` も設定
   - `wrangler.toml` はテンプレートのまま使い、deploy 時に `wrangler.deploy.toml` を自動生成します
3. マイグレーション適用:
   ```bash
   wrangler d1 migrations apply toban-maker-db --remote
   ```
4. デプロイ:
   ```bash
   pnpm build && pnpm run deploy:cf
   ```

## ライセンス

[MIT](LICENSE)
