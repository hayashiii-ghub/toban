# toban — かんたん当番表

掃除当番・給食当番・日直などのローテーション表を作成・印刷・共有できる無料Webアプリ。

**URL**: https://toban.app

## 主な機能

- **ランディングページ** — サービス紹介・特徴・テンプレート紹介・Q&A・お問い合わせフォーム
- **32種類のテンプレート** — 学校・PTA・介護施設・自治会・飲食店・家庭など幅広いシーンをカバー（チェックリスト系テンプレートも対応）
- **3つの表示形式** — カード・早見表・カレンダーを切り替え
- **日付自動ローテーション** — 土日・祝日スキップ対応。開始日と周期を設定すれば手動操作不要
- **9種類のデザインテーマ** — こくばん・クレヨン・さくらなど、印刷して掲示できる品質。テンプレートごとに推奨テーマを自動適用
- **共有** — URL・QRコード・LINE共有。閲覧用/編集権限付きの2種類
- **自動クラウドバックアップ** — メンバー入力後に自動でD1へ保存。ブラウザデータ消失に備える
- **印刷** — ブラウザの印刷機能でそのまま印刷・PDF保存が可能
- **PWA** — ホーム画面に追加してアプリとして利用可能（iOS Safari向け案内あり）
- **登録不要** — アカウント作成なしで即利用開始

## 技術スタック

| カテゴリ | ツール | 選定理由 |
|---------|--------|---------|
| フレームワーク | React (Vite) | SPA で即座に操作可能・Vite の高速ビルドで開発体験向上 |
| ルーティング | wouter | 軽量（React Router の 1/10 以下）・SPA に必要十分 |
| スタイリング | Tailwind CSS v4 | ユーティリティファーストでUI構築が高速・印刷用スタイルも容易 |
| アニメーション | Framer Motion | 宣言的なAPI・レイアウトアニメーションが簡潔に書ける |
| UIコンポーネント | shadcn/ui | コピー&ペースト方式で依存を最小限に保てる |
| バックエンド | Hono (Cloudflare Workers) | 軽量・Web標準API準拠・Cloudflare Workersにネイティブ対応 |
| データベース | Cloudflare D1 + Drizzle ORM | SQLite互換でサーバーレス・型安全なクエリ |
| データ永続化 | localStorage + D1 | ローカルが主データストア、D1はクラウド共有・バックアップ層 |
| テスト | Vitest + Testing Library | 高速な実行・React コンポーネントのDOM テストに対応 |
| パッケージマネージャ | pnpm | 高速・ディスク効率の良い依存管理 |

## 構成

```
├── client/src/
│   ├── pages/                # ページコンポーネント
│   │   ├── Home.tsx          # メインページ（/ — 当番表の作成・編集）
│   │   ├── useHomeState.ts   # Homeページの状態管理・hook集約
│   │   ├── LandingPage.tsx   # ランディングページ（/about）
│   │   ├── SharedScheduleView.tsx  # 共有リンクの閲覧ページ
│   │   ├── TemplatesPage.tsx # テンプレート一覧（SEO用LP）
│   │   ├── TemplateDetailPage.tsx # テンプレート詳細（個別LP）
│   │   └── Transfer.tsx      # 編集権限の引き継ぎページ
│   ├── features/home/        # ホーム画面の機能コンポーネント
│   ├── components/           # 共通UIコンポーネント（shadcn/ui）
│   ├── rotation/             # コア型・ユーティリティ・定数・デフォルト状態
│   ├── hooks/                # カスタムフック（useAutoSync等）
│   └── lib/                  # APIクライアント・同期マネージャ
├── server/
│   ├── worker.ts             # Cloudflare Workers エントリーポイント
│   ├── api.ts                # Hono APIアプリ定義
│   ├── routes/               # APIルートハンドラ（schedules, contact）
│   └── db/                   # Drizzle スキーマ・マイグレーション
├── shared/                   # フロント・バックエンド共有の型定義・Zodスキーマ
└── functions/                # Cloudflare Pages Functions エントリーポイント
```

## コマンド

```sh
pnpm dev          # Vite 開発サーバー (port 3000)
pnpm dev:api      # Wrangler Pages dev サーバー (port 8788)
pnpm dev:full     # フロント + API を同時起動
pnpm build        # 本番ビルド
pnpm check        # TypeScript 型チェック
pnpm test         # ユニットテスト実行 (Vitest)
pnpm test:coverage # ユニットテスト + カバレッジレポート (v8)
pnpm test:e2e     # E2Eテスト実行 (Playwright)
pnpm test:e2e:ui  # E2Eテスト (UIモード)
pnpm lint         # ESLint
pnpm db:migrate:local  # ローカル D1 に migration を適用
pnpm run deploy:cf     # migration 適用込みで Cloudflare へデプロイ
```

## データベース運用

- 本番デプロイは `pnpm run deploy:cf` を正規ルートにしてください。
- `wrangler deploy` 単体では D1 migration が適用されず、保存や共有が 500 になることがあります。
- API には `GET /api/health/schema` を用意しており、スキーマの状態を確認できます（200: 正常 / 503: カラム不足）。
- サーバーは安全網として不足カラムを自動補完しますが、基本は migration を先に適用する運用が前提です。

## CI / 品質管理

- **GitHub Actions CI** — push / PR で lint・型チェック・ユニットテスト・ビルド・E2Eテストを自動実行
- **Lighthouse CI** — push / PR でパフォーマンス・アクセシビリティ・SEO のスコアを自動計測
- **Sentry** — 本番環境でのランタイムエラーを自動収集（`VITE_SENTRY_DSN` 設定時のみ有効）

## 環境変数（Cloudflare側で設定）

- `CLOUDFLARE_D1_DATABASE_ID` — D1 データベースID
- `CLOUDFLARE_D1_PREVIEW_DATABASE_ID` — プレビュー用 D1 データベースID（任意）
- `RESEND_API_KEY` — Resend APIキー（お問い合わせフォーム送信用、`wrangler secret put RESEND_API_KEY`）
- `VITE_SENTRY_DSN` — Sentry DSN（任意、エラートラッキング用。ビルド時に `.env` または CI で設定）

## ライセンス

[MIT License](./LICENSE)
