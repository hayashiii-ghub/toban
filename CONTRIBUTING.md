# コントリビューションガイド

toban（かんたん当番表）への貢献に興味を持っていただきありがとうございます。

## 前提条件

- **Node.js** >= 24
- **pnpm** >= 10

## セットアップ手順

```bash
# 1. リポジトリをフォーク & クローン
git clone https://github.com/<your-username>/toban-app.git
cd toban-app

# 2. 依存パッケージをインストール
pnpm install

# 3. 開発サーバーを起動
pnpm dev:full
```

## 開発コマンド

| コマンド        | 説明                                         |
| --------------- | -------------------------------------------- |
| `pnpm dev`      | Vite 開発サーバー（ポート 3000）             |
| `pnpm dev:api`  | Wrangler Workers 開発サーバー（ポート 8788） |
| `pnpm dev:full` | フロントエンド + API を同時起動              |
| `pnpm build`    | プロダクションビルド                         |
| `pnpm check`    | TypeScript 型検査                            |
| `pnpm test`     | テスト実行                                   |
| `pnpm lint`     | ESLint によるコード検査                      |
| `pnpm format`   | Prettier によるコード整形                    |

## PR の出し方

1. リポジトリをフォークする
2. フィーチャーブランチを作成する（`git checkout -b feature/my-feature`）
3. 変更をコミットする（`git commit -m '機能: 〇〇を追加'`）
4. ブランチをプッシュする（`git push origin feature/my-feature`）
5. Pull Request を作成する

## コーディング規約

- **TypeScript strict モード** を使用しています
- **Prettier** でコードを整形してください（`pnpm format`）
- **ESLint** のルールに従ってください（`pnpm lint`）
- 共有型は `shared/types.ts` に定義してください
- UI の文字列はすべて日本語で記述してください
