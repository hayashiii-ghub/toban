# AGENTS.md

説明は README.md、作業指示は AGENTS.md に集約し、別の説明文書は作成前に確認する。

## 作業と検証

- 着手前に作業ツリー、worktree、最新 main、既存 PR・ブランチを確認する。同じ目的の作業を再利用し、新規は最新 main から目的別に分ける。未コミット変更や他作業のブランチを破棄・stash・削除しない。
- Node / pnpm は `package.json` に合わせ、`corepack pnpm install --frozen-lockfile` で導入する。コード・依存・設定の PR 前は次を通し、検査範囲・カバレッジ下限を下げない。

```sh
corepack pnpm format:check && corepack pnpm check && corepack pnpm lint && corepack pnpm test:coverage && corepack pnpm build && corepack pnpm test:e2e
```

- Markdown だけなら整形、コマンド・パス・参照先の照合、`git diff --check` と差分レビューを行う。最終コミットの CI を確認し、失敗・未実施を報告する。
- E2E は Vite / Worker を自前起動し、D1 は直下の `.wrangler/state` を共有する。3000 番が使用中でも既存プロセスを止めず一時設定で別ポートを使う。
- 保存・読込、QR、アニメーションなど検証対象の中核をモックせず、既存 test setup と fetch 境界を使う。必須要素の欠落でテストをスキップしない。

## 実装の制約

- 当番表の正本は localStorage、D1 は非公開バックアップ。共有操作で公開する。同期変更では `*.recovery.test.*` を含め保存・復旧を検証し、`/api/` を Workbox の `runtimeCaching` に入れない（古い応答で編集を巻き戻すため）。
- migration は `server/db/migrations/` に連番で追加し、既存 SQL は変更しない。列追加は `schema.ts` と `ensureSchema.ts` の `REQUIRED_SCHEDULE_COLUMNS` を揃える。保存期限・収集情報の変更は関連処理、i18n、`client/public/privacy.html` も更新する。
- 日付は `rotation/dateUtils.ts` の `formatIsoDateLocal` を使い、`toISOString()` で UTC にずらさない。時差のテストは `TZ` を指定する。
- `rotation/` は React / DOM 非依存、サーバーも読む `turns.ts` はブラウザ API・`@/` import 禁止。画面固有は `features/`、横断部品は `components/`、上限・共通文言・テンプレートは `shared/` を正本とする。
- UI 文言は `i18n/locales/ja.ts` と `en.ts` を揃え、保存した名前・仕事は翻訳しない。モバイル固定 UI は `--home-toolbar-space`、案内は `siteLinks.tsx`、並べ替え・シート操作は既存 hook を使う。HTML drag and drop に置換せず、タッチ操作と文字コントラスト比 4.5 以上を保つ。
- 本番 WebMCP の `hooks/useTobanTools.ts` に公開 tool を追加しない（実名の誤公開を防ぐため）。出力は 1,500 字以内の有効な JSON に分割し、入力に `untrustedContentHint`、読み取りに `readOnlyHint` を付ける。

## 配信と公開

- `/` はアプリ、`/about` は LP。共通シェル `client/index.html` に特定ページだけの meta・JSON-LD・スクリプトを置かない。Origin Trial トークンは 2026-11-17 00:00 UTC に失効するため、継続する場合は期限前に更新する。
- SPA fallback は Worker を通らない場合がある。転送は `client/public/_redirects`、ヘッダーは `_headers` と Worker の `HTML_SECURITY_HEADERS` を揃える。ルートは `App.tsx`・`server/handlers/seo.ts`・`navigateFallbackDenylist` を確認し、bot 用本文も利用者向けと揃える。配信変更は直接アクセスと更新後の Service Worker 経由を検証する。
- `client/public/googlee79602eefe9a90c4.html` は所有権確認用のため変更・削除しない。PWA は client 環境だけで生成する。
- main への squash merge は本番 Workers Builds を起動する。承認された手動公開は `CLOUDFLARE_D1_DATABASE_ID` を設定して `corepack pnpm build && corepack pnpm run deploy:cf` を使う。DB 更新を含むため `wrangler deploy` 単体で行わず、設定の ID プレースホルダーも実値で上書きしない。
- PR は `docs:` / `fix:` などの接頭辞を付け、日本語で問題・変更・検証を書く。マージ・クローズ・ブランチ削除・設定変更・公開は依頼範囲に従い、完了時に PR、コミット、CI、実施した段階を報告する。本番反映まで依頼されたら、対象コミットの `Workers Builds: toban` と本番動作も確認する。
