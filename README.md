# toban — 無料の当番表作成アプリ

学校・保育園・介護施設・自治会・オフィス・家庭の当番表を作成・印刷・共有できる無料の当番表作成アプリ。掃除当番からシフト・家事分担まで対応。

**URL**: https://toban.app

## 主な機能

- **ランディングページ** — サービス紹介・特徴・テンプレート紹介・Q&A・お問い合わせフォーム
- **順番決めページ（`/junban`）** — 円盤ビューで当番の順番を決める使い方を紹介する専用ページ。「当番 ルーレット / 順番 決める」の検索意図を受け、`/?view=disc` でホームの円盤ビューへ送る
- **31種類のテンプレート** — 学校・PTA・介護施設・自治会・飲食店・家庭など幅広いシーンをカバー（チェックリスト系テンプレートも対応）。ほかに空白から作る「カスタム」を用意しており、`shared/templates.ts` の要素数は32になる（カスタムは紹介ページを持たないため `TEMPLATE_SEO_DATA` は31件）
- **4つの表示形式** — カード・早見表・カレンダー・円盤（回転ディスク）を切り替え。円盤は印刷時に「全体／外円／内円」の3枚を出力し、切り抜いて中心をピンで留めれば回せる
- **日付自動ローテーション** — 土日・祝日スキップ対応。開始日と周期を設定すれば手動操作不要
- **デザインテーマ（質感 × 色）** — 質感3種（さらさら・ざらざら・もちもち）と色9種（いんさつ・こくばん・だいだい・ひまわり・あじさい・さくら・わかば・そら・よぞら）を組み合わせて27通り。テクスチャは画像を使わずSVGノイズで描くので追加ファイルなし。印刷して掲示できる品質。テンプレートごとに推奨の組み合わせを自動適用
- **共有** — URL・QRコード・LINE共有。閲覧用/編集権限付きの2種類
- **自動クラウドバックアップ** — メンバー入力後に自動でD1へ保存。ブラウザデータ消失に備える。1年間まったく編集がない当番表は自動削除される（`server/worker.ts` の `CLEANUP_RETENTION_DAYS`）
- **印刷** — ブラウザの印刷機能でそのまま印刷・PDF保存が可能
- **PWA** — ホーム画面に追加してアプリとして利用可能（iOS Safari向け案内あり）
- **言語切替（日本語 / 英語）** — UIの表示を日本語/英語で切替可能（フッターの言語ボタン、初回はブラウザ言語を判定）。テンプレート・テーマ等のコンテンツは日本語のまま
- **登録不要** — アカウント作成なしで即利用開始

## 技術スタック

| カテゴリ             | ツール                      | 選定理由                                                     |
| -------------------- | --------------------------- | ------------------------------------------------------------ |
| フレームワーク       | React (Vite)                | SPA で即座に操作可能・Vite の高速ビルドで開発体験向上        |
| ルーティング         | wouter                      | 軽量（React Router の 1/10 以下）・SPA に必要十分            |
| スタイリング         | Tailwind CSS v4             | ユーティリティファーストでUI構築が高速・印刷用スタイルも容易 |
| アニメーション       | Framer Motion               | 宣言的なAPI・レイアウトアニメーションが簡潔に書ける          |
| UIコンポーネント     | shadcn/ui                   | コピー&ペースト方式で依存を最小限に保てる                    |
| バックエンド         | Hono (Cloudflare Workers)   | 軽量・Web標準API準拠・Cloudflare Workersにネイティブ対応     |
| データベース         | Cloudflare D1 + Drizzle ORM | SQLite互換でサーバーレス・型安全なクエリ                     |
| データ永続化         | localStorage + D1           | ローカルが主データストア、D1はクラウド共有・バックアップ層   |
| テスト               | Vitest + Testing Library    | 高速な実行・React コンポーネントのDOM テストに対応           |
| パッケージマネージャ | pnpm                        | 高速・ディスク効率の良い依存管理                             |

## 構成

```
├── client/src/
│   ├── pages/                # ページコンポーネント（ルートに対応）
│   │   ├── Home.tsx          # メインページ（/ — 当番表の作成・編集）
│   │   ├── LandingPage.tsx   # ランディングページ（/about）
│   │   ├── SharedScheduleView.tsx  # 共有リンクの閲覧ページ（/s/:slug）
│   │   ├── TemplatesPage.tsx # テンプレート一覧（/templates — SEO用LP）
│   │   ├── TemplateDetailPage.tsx # テンプレート詳細（/templates/:slug — 個別LP）
│   │   ├── JunbanPage.tsx    # 順番決めページ（/junban — 円盤ビューのSEO用LP）
│   │   ├── Transfer.tsx      # 編集権限の引き継ぎページ（/transfer）
│   │   └── NotFound.tsx      # 404ページ（/404 と、どのルートにも一致しないパス）
│   ├── features/home/        # ホーム画面の機能コンポーネント
│   ├── features/landing/     # LP・SEOページ共通のCTAと配色トークン（黒板テーマ準拠）
│   ├── components/           # モーダル等の機能コンポーネント（ui/ は shadcn/ui、settings/ は設定モーダルの部品）
│   ├── contexts/             # テーマの Context（DesignThemeContext: デザインテーマ / ThemeContext: ライト・ダーク）
│   ├── rotation/             # コア型・ユーティリティ・定数・デフォルト状態・デザインテーマ定義
│   ├── hooks/                # カスタムフック（Home の状態集約 useHomeState・useAutoSync・WebMCP登録 useTobanTools 等）
│   ├── lib/                  # APIクライアント・同期マネージャ
│   ├── i18n/                 # 多言語対応（自作i18n・辞書 ja/en、UIの枠のみ翻訳）
│   ├── types/                # 型定義（webmcp.d.ts 等）
│   └── fonts.ts              # アプリ全体のフォント設定（デザインテーマとは独立した個人設定）
├── server/
│   ├── worker.ts             # Cloudflare Workers エントリーポイント
│   ├── api.ts                # Hono APIアプリ定義
│   ├── routes/               # APIルートハンドラ（schedules, contact）
│   ├── handlers/             # bot向けプリレンダリング・sitemap・robots（seo.ts）
│   ├── middleware/           # 編集権限トークンの検証（auth.ts）
│   ├── schemas/              # APIリクエストの Zod スキーマ
│   └── db/                   # Drizzle スキーマ・マイグレーション
└── shared/                   # フロント・バックエンド共有の型定義・Zodスキーマ
    ├── types.ts              # 共有の型定義
    ├── schemas.ts            # 共有の Zod スキーマ
    ├── limits.ts             # 入力の文字数・件数上限（server / UI / WebMCP の単一の真実源）
    ├── templates.ts          # テンプレート本体のデータ（32件。うちカスタムはLPを持たない）
    ├── jsonLd.ts             # 構造化データ（FAQPage / BreadcrumbList / ItemList）の組み立て
    ├── seo-templates.ts      # テンプレLPのメタ情報（title/description/intro）と共通FAQ、/junban のメタ
    └── template-content.ts   # テンプレLPごとの本文・FAQ（ページ固有の読み物）
```

## コマンド

```sh
pnpm dev          # Vite 開発サーバー (port 3000)
pnpm dev:api      # Wrangler Workers 開発サーバー (port 8788)。dist/ が無ければ自動で build
pnpm dev:full     # フロント + API を同時起動
pnpm build        # 本番ビルド
pnpm check        # TypeScript 型チェック
pnpm test         # ユニットテスト実行 (Vitest)
pnpm test:coverage # ユニットテスト + カバレッジレポート (v8)
pnpm test:e2e     # E2Eテスト実行 (Playwright)
pnpm test:e2e:ui  # E2Eテスト (UIモード)
pnpm lint         # ESLint
pnpm format       # Prettier で整形
pnpm format:check # Prettier の整形漏れを検査（CI と同じ）
pnpm db:migrate:local  # ローカル D1 に migration を適用
pnpm run deploy:cf     # migration 適用込みで Cloudflare へデプロイ
```

## データベース運用

- 本番デプロイは `pnpm run deploy:cf` を正規ルートにしてください。
- `wrangler deploy` 単体では D1 migration が適用されず、保存や共有が 500 になることがあります。
- API には `GET /api/health/schema` を用意しており、スキーマの状態を確認できます（200: 正常 / 503: カラム不足）。
- サーバーは安全網として不足カラムを自動補完しますが、基本は migration を先に適用する運用が前提です。

## CI / 品質管理

- **GitHub Actions CI** — push（main）/ PR で 整形チェック・型チェック・lint・ユニットテスト・ビルドを自動実行。E2Eテストは PR のときのみ実行
- **Prettier** — `pnpm format` で整形し、CI が `prettier --check` で検査。生成物は `.prettierignore` で除外。一括整形コミットは `.git-blame-ignore-revs` に登録してあり、GitHub の blame では自動的に読み飛ばされる
- **Lighthouse CI** — 毎週月曜 3:00 UTC の定期実行と手動実行（`workflow_dispatch`）でパフォーマンス・アクセシビリティ・SEO のスコアを計測
- **Sentry** — 本番環境でのランタイムエラーを自動収集（`VITE_SENTRY_DSN` 設定時のみ有効）

## 環境変数（Cloudflare側で設定）

- `CLOUDFLARE_D1_DATABASE_ID` — D1 データベースID
- `CLOUDFLARE_D1_PREVIEW_DATABASE_ID` — プレビュー用 D1 データベースID（任意）
- `RESEND_API_KEY` — Resend APIキー（お問い合わせフォーム送信用、`wrangler secret put RESEND_API_KEY`）
- `VITE_SENTRY_DSN` — Sentry DSN（任意、エラートラッキング用。ビルド時に `.env` または CI で設定）

## WebMCP 対応（実験的）

AIエージェントがブラウザ上で当番表を直接操作できるよう、[WebMCP](https://developer.chrome.com/docs/ai/webmcp) のツールを公開しています。対応ブラウザでのみ有効化され、非対応環境では何も登録しません（既存の動作に影響なし）。データは既存の localStorage / state 経路をそのまま使うため、ツール経由の変更も通常操作と同じく自動保存されます。

公開ツール（Home画面 `/` で登録）:

| ツール                    | 種別     | 内容                                                                            |
| ------------------------- | -------- | ------------------------------------------------------------------------------- |
| `list_schedules`          | 読み取り | 全当番表の一覧（名前・人数・グループ数、表示中を明示）                          |
| `get_current_assignments` | 読み取り | 表示中の当番表の担当割り当てと回転状況                                          |
| `get_schedule_details`    | 読み取り | 表示中の当番表の設定（メンバー・グループ・回転モード）                          |
| `get_share_link`          | 読み取り | 共有済みなら公開 URL を返す（**公開はしない**。共有はユーザが共有ボタンで実施） |
| `switch_schedule`         | 操作     | 名前を指定して表示する当番表を切り替え                                          |
| `advance_rotation`        | 操作     | 回転を1つ進める/戻す（手動モードのみ。日付モードは自動のため不可）              |
| `set_rotation`            | 操作     | 回転を指定の回数に設定（手動モードのみ）                                        |
| `change_view`             | 操作     | 表示形式を切り替え（カード / 早見表 / カレンダー / 円盤）                       |
| `create_schedule`         | 操作     | テンプレート名から新しい当番表を作成                                            |
| `duplicate_schedule`      | 操作     | 表示中の当番表を複製                                                            |
| `update_schedule`         | 操作     | 表の設定を更新（名前 / ピン留め / 担当者⇄タスク。部分更新）                     |
| `add_member`              | 操作     | 名前を指定してメンバーを追加（色は自動割当）                                    |
| `remove_member`           | 操作     | 名前を指定してメンバーを削除（最後の1人は不可）                                 |
| `update_member`           | 操作     | メンバーの改名 / 休み(skip)・復帰（名前指定、部分更新）                         |
| `configure_rotation`      | 操作     | 回転方式の設定（手動⇄日付・開始日・周期・土日祝スキップ）                       |
| `print_schedule`          | 操作     | 現在の表示形式で印刷ダイアログを開く                                            |

> 共有（外部公開）の実行はエージェントの tool に含めていません。実名を含む当番表を公開 URL 化する操作は、誤発火による意図しない公開を避けるため、ユーザの明示操作（共有ボタン）に限定しています。`get_share_link` は既存リンクの参照のみ。

実装は `client/src/hooks/useTobanTools.ts` に集約、型は `client/src/types/webmcp.d.ts`（`navigator.modelContext` / `document.modelContext` の差異もここで吸収）。

### 動作確認（ローカル）

1. Chrome Canary で `chrome://flags/#enable-webmcp-testing` を Enabled にして再起動
2. `pnpm dev` で起動し Home画面（`/`）を開く
3. 「Model Context Tool Inspector」拡張、または `navigator.modelContext` 対応エージェントからツール一覧・実行を確認（`console.log(navigator.modelContext)` でAPI有無を確認できる）

## ライセンス

[MIT License](./LICENSE)
