# toban

学校・保育園・介護施設・自治会・オフィス・家庭の当番表を作成・印刷・共有できるアプリ。登録不要で、localStorage が主データストア、D1 はクラウド共有・バックアップ層。

**https://toban.app**

## セットアップ

Node.js >= 24 / pnpm >= 10。

```sh
pnpm install
pnpm dev:full     # フロント(3000) + API(8788) を同時起動
```

## コマンド

```sh
pnpm dev          # Vite 開発サーバー (port 3000)
pnpm dev:api      # Wrangler 開発サーバー (port 8788)。dist/ が無ければ自動で build
pnpm build        # 本番ビルド
pnpm check        # 型チェック
pnpm lint         # ESLint
pnpm format       # Prettier で整形
pnpm test         # ユニットテスト (Vitest)
pnpm test:e2e     # E2E テスト (Playwright)
pnpm db:migrate:local  # ローカル D1 に migration を適用
pnpm run deploy:cf     # migration 適用込みで Cloudflare へデプロイ
```

PR を出す前に CI と同じ検査を通す:

```sh
pnpm format:check && pnpm check && pnpm lint && pnpm test && pnpm build
```

## 構成

```
├── client/src/
│   ├── pages/                # ルートに対応するページのみ
│   │   ├── Home.tsx          # メインページ（/ — 当番表の作成・編集）
│   │   ├── LandingPage.tsx   # ランディングページ（/about）
│   │   ├── SharedScheduleView.tsx  # 共有リンクの閲覧ページ（/s/:slug）
│   │   ├── TemplatesPage.tsx # テンプレート一覧（/templates — SEO用LP）
│   │   ├── TemplateDetailPage.tsx # テンプレート詳細（/templates/:slug）
│   │   ├── JunbanPage.tsx    # 順番決めページ（/junban — 円盤ビューのSEO用LP）
│   │   ├── Transfer.tsx      # 編集権限の引き継ぎページ（/transfer）
│   │   └── NotFound.tsx      # 404ページ
│   ├── features/home/        # ホーム画面の機能コンポーネント
│   ├── features/landing/     # LP・SEOページ共通のCTAと配色トークン
│   ├── components/           # モーダル等（ui/ は shadcn/ui、settings/ は設定モーダルの部品）
│   ├── contexts/             # DesignThemeContext: デザインテーマ / ThemeContext: ライト・ダーク
│   ├── rotation/             # コア型・ユーティリティ・定数・デフォルト状態・デザインテーマ定義
│   ├── hooks/                # useHomeState（状態集約）・useAutoSync・useTobanTools 等
│   ├── lib/                  # API クライアント・同期マネージャ
│   ├── i18n/                 # 自作 i18n・辞書 ja/en（UIの枠のみ翻訳）
│   ├── types/                # 型定義（webmcp.d.ts 等）
│   └── fonts.ts              # アプリ全体のフォント設定（デザインテーマとは独立）
├── server/
│   ├── worker.ts             # Cloudflare Workers エントリーポイント
│   ├── api.ts                # Hono API アプリ定義
│   ├── routes/               # API ルートハンドラ（schedules, contact）
│   ├── handlers/             # bot向けプリレンダリング・sitemap・robots（seo.ts）
│   ├── middleware/           # 編集権限トークンの検証（auth.ts）
│   ├── schemas/              # API リクエストの Zod スキーマ
│   └── db/                   # Drizzle スキーマ・マイグレーション
└── shared/                   # フロント・バックエンド共有
    ├── types.ts / schemas.ts # 共有の型と Zod スキーマ
    ├── limits.ts             # 入力の文字数・件数上限（単一の真実源）
    ├── templates.ts          # テンプレート本体（32件。カスタムはLPを持たない）
    ├── jsonLd.ts             # 構造化データの組み立て
    ├── seo-templates.ts      # テンプレLPのメタ情報と共通FAQ、/junban のメタ
    └── template-content.ts   # テンプレLPごとの本文・FAQ
```

## 規約

- 入力の文字数・件数上限は `shared/limits.ts` が単一の真実源（server スキーマ / UI の maxLength / WebMCP 検証が共有する）
- UI 文字列は `client/src/i18n` の辞書（ja / en）を通す。翻訳するのは UI の枠だけで、テンプレート・テーマ等のコンテンツは日本語のまま
- 新規の機能コンポーネントは `client/src/features/<機能名>/` に置く。`components/` は横断的に再利用するものだけ
- 共有型は `shared/types.ts` に定義する
- TypeScript strict。整形は Prettier、静的検査は ESLint（どちらも CI が検査する）
- コミットは `feat:` / `fix:` / `chore:` / `docs:` などの接頭辞 + 日本語の要約

## デプロイと D1

- 本番デプロイは `pnpm run deploy:cf` が正規ルート（`--remote` で本番 D1 に migration を適用）
- `wrangler deploy` 単体では D1 migration が適用されず、**保存や共有が 500 になる**
- `GET /api/health/schema` でスキーマの状態を確認できる（200: 正常 / 503: カラム不足）
- サーバーは安全網として不足カラムを自動補完するが、migration を先に適用する運用が前提

Cloudflare 側で設定する環境変数:

| 変数                                | 用途                                               |
| ----------------------------------- | -------------------------------------------------- |
| `CLOUDFLARE_D1_DATABASE_ID`         | D1 データベースID                                  |
| `CLOUDFLARE_D1_PREVIEW_DATABASE_ID` | プレビュー用（任意）                               |
| `SLACK_WEBHOOK_URL`                 | お問い合わせのSlack通知用（`wrangler secret put`） |
| `VITE_SENTRY_DSN`                   | Sentry DSN（任意。ビルド時に `.env` か CI で設定） |

## CI

- **GitHub Actions** — push（main）/ PR で 整形・型・lint・ユニットテスト・ビルドを実行。E2E は PR のときのみ
- **Lighthouse CI** — 毎週月曜 3:00 UTC と手動実行でパフォーマンス・アクセシビリティ・SEO を計測
- **Sentry** — 本番のランタイムエラーを収集（`VITE_SENTRY_DSN` 設定時のみ）
- 一括整形コミットは `.git-blame-ignore-revs` に登録済み

## WebMCP 対応（実験的）

チャットでメンバー・仕事・交代条件を伝えると、独自の当番表を一度に作成し、一言で部分修正して印刷へ進める。Toban内にチャットやLLM接続は追加せず、WebMCP対応クライアントを使う。

[英語の実行手順・対応範囲・応募用差分](docs/webmcp-challenge.md)を参照。実装ブランチの検証と、本番公開・応募の完了は区別する。

AIエージェントがブラウザ上で当番表を操作できるよう [WebMCP](https://developer.chrome.com/docs/ai/webmcp) のツールを公開している。対応ブラウザでのみ有効化され、非対応環境では何も登録しない。実装は `client/src/hooks/useTobanTools.ts`、型は `client/src/types/webmcp.d.ts`。公開しているツールは `buildTobanTools()` を参照。

**共有（外部公開）の実行は tool に含めていない。** 実名を含む当番表を公開 URL 化する操作は、誤発火による意図しない公開を避けるため、ユーザの明示操作（共有ボタン）に限定している。`get_share_link` は既存リンクの参照のみ。

[tool security](https://developer.chrome.com/docs/ai/webmcp/secure-tools) の指針に沿って以下を守る。テストで検査しているので、tool を足すときも自動的に効く。

- **詳細一覧は1,500字以内の有効なJSONへ分割。** `next_cursor`で続きを取得し、JSONを文字列の途中で切らない。更新結果も短いJSONで、反映と保存の結果を分けて返す
- **ユーザ入力（当番表名・メンバー名）を返す tool には `untrustedContentHint`。** 共有リンク経由で他人が作った表を開けるため、間接プロンプトインジェクションの持ち込み口になりうる
- **状態を変えない tool には `readOnlyHint`。** エージェントが確認を挟むかの判断に使う
- **`exposedTo` は使わない。** 既定ではクロスオリジンから観測・実行されない

Chrome の WebMCP には Imperative API（JS から `registerTool` する）と Declarative API（フォームに`toolname`等の属性を付ける）の2系統がある。toban は状態を持つ操作を公開するため Imperative API を使っている。

**Cloudflare が提供する同名の WebMCP 機能とは別物。** あちらはダッシュボードのトグルでエッジから `/.webmcp/bridge.js` を注入し、汎用ツール（画像の Content Credentials、`/mcp` エンドポイントの中継）を登録する代行サービス。toban はドメイン固有のツールを公開するため `useTobanTools` で自前に `registerTool` している。Cloudflare 側のトグルは有効にしていない（toban に `/mcp` も対象画像も無く、有効にしても何も登録されない）。

### 動作確認

ローカル開発では Chrome の flag を使う（Chrome 公式が local development 用と位置づけているもの）。

1. `chrome://flags/#enable-webmcp-testing` を Enabled にして Chrome を再起動
2. `pnpm dev` で Home 画面を開き、`navigator.modelContext` を確認
3. 実際にWebMCPを呼べるクライアントから操作を確認。ページを読めるだけのチャットではツール呼び出しは保証されない

**通常の対応Chromeで利用するため、toban.appにはOrigin Trialのトークンを設定している。** `client/index.html` の `<head>` に `<meta http-equiv="origin-trial">` として登録済み。これが無いと `navigator.modelContext` 自体が生えず、`useTobanTools` は no-op になる。

|          |                                             |
| -------- | ------------------------------------------- |
| 対象     | Chrome 149〜156                             |
| 期限     | **2026-11-17**                              |
| オリジン | `https://toban.app`（サブドメインは対象外） |

**期限切れはエラーにならず無言で無効化される。** 近づいたら [Chrome Origin Trials](https://developer.chrome.com/origintrials) で再発行して `client/index.html` のトークンを差し替える。トライアルが Chrome 156 で終わるため、それ以降は正式リリースを待つか再度延長を確認する。トークンはオリジンに紐づく公開値で、秘密情報ではない。

有効かどうかは、**flag を切った通常の Chrome** で `https://toban.app/` を開き `navigator.modelContext` が存在するかで判定する（flag を有効にした Chrome では常に存在するため、確認にならない）。

## ライセンス

[MIT License](./LICENSE)
