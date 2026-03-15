# toban-maker

[![version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/hayashiii-ghub/toban-maker)

掃除当番、給食当番、日直などのローテーション表を簡単に作成・印刷できる Web アプリ。

## 必要な環境

- **Node.js** 18+
- **pnpm**（推奨）または **npm**

## セットアップ

```bash
# Node.js 18+ を使用（.nvmrc あり: nvm use）
nvm use   # nvm 利用時

# 依存関係のインストール
pnpm install
# pnpm がグローバルにない場合: npx pnpm install または ./node_modules/.bin/pnpm install
# npm の場合（peer 依存の競合があるため --legacy-peer-deps を推奨）
npm install --legacy-peer-deps

# 開発サーバー起動（Vite）
pnpm dev
# または
npm run dev
```

ブラウザで **http://localhost:3000/** を開く。

## スクリプト

| コマンド | 説明 |
|----------|------|
| `pnpm dev` / `npm run dev` | 開発サーバー起動（ホットリロード） |
| `pnpm build` / `npm run build` | 本番ビルド（静的ファイルを `dist/` に出力） |
| `pnpm preview` / `npm run preview` | ビルド結果のプレビュー |
| `pnpm check` / `npm run check` | TypeScript 型チェック |
| `pnpm format` / `npm run format` | Prettier でフォーマット |

## 構成

- **client/** — React + Vite フロントエンド
- **shared/** — 共通の定数・型
- **ideas.md** — デザイン案（和モダン・ネオブルータリズム等）

## Webアプリとして公開する

### 1. 本番ビルドの確認

```bash
pnpm build
# または: npm run build
```

`dist/` に静的ファイルが出力されていればOK。`client/public/_redirects` も一緒にコピーされ、SPA 用ルーティングが有効になります。

### 2. Cloudflare Pages で公開（推奨）

1. [Cloudflare Dashboard](https://dash.cloudflare.com) にログイン → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. GitHub 等のリポジトリを選択
3. ビルド設定を次のように指定:
   - **Build command**: `npm run build`（npm の場合）または `pnpm build`（pnpm の場合）
   - **Build output directory**: `dist`
   - **Root directory**: 空のまま（リポジトリルートでビルド）
4. **Save and Deploy**。完了後、`*.pages.dev` の URL で公開されます
5. （任意）**Custom domains** で独自ドメインを追加可能

**補足**

- npm の場合、**Environment variables** で `NODE_VERSION` を `18` 以上にすると安定します
- 環境変数（`VITE_*` など）が必要な場合は、プロジェクトの **Settings → Environment variables** で設定
- `wrangler.toml` を追加しているので、CLI を使う場合も `dist` をそのまま Cloudflare Pages にデプロイできます

### 3. その他のホスティング

- **Vercel**: リポジトリの `vercel.json` をそのまま利用可能。Import 後 Deploy するだけ
- **Netlify**: ビルドコマンド `npm run build`、公開ディレクトリ `dist`、SPA 用リダイレクト `/index.html` を設定
- **自前サーバー**: `npm run build` のあと `dist` を nginx 等で静的配信

## ライセンス

MIT
