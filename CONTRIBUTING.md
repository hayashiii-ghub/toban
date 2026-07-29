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

一覧は [README の「コマンド」](./README.md#コマンド) を参照してください。二重管理を避けるため、ここには載せていません。

## PR の出し方

1. リポジトリをフォークする
2. フィーチャーブランチを作成する（`git checkout -b feature/my-feature`）
3. 変更をコミットする（`git commit -m '機能: 〇〇を追加'`）
4. ブランチをプッシュする（`git push origin feature/my-feature`）
5. Pull Request を作成する

PR を出す前に、CI と同じ検査をローカルで通しておくとやり直しが減ります。

```bash
pnpm format:check && pnpm check && pnpm lint && pnpm test && pnpm build
```

## コーディング規約

- **TypeScript strict モード** を使用しています
- **Prettier** でコードを整形してください（`pnpm format`）。CI が `prettier --check` で検査するため、整形漏れがあると落ちます
- **ESLint** のルールに従ってください（`pnpm lint`）
- 共有型は `shared/types.ts` に定義してください
- UI の文字列はすべて日本語で記述してください
