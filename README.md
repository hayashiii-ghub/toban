# toban

学校・職場・家庭などの当番表を、登録不要で作成・印刷・共有できるアプリ。

**[toban.app を開く](https://toban.app)**

当番表はブラウザに保存し、サーバーへ非公開で自動バックアップします。ブラウザのデータ削除で編集権限を失う場合があります。共有後はリンクを知る人が閲覧でき、編集用リンクは編集権限も渡します。保存期限などは[プライバシーポリシー](https://toban.app/privacy)を参照してください。

## 開発を始める

Node.js 24 以上と Corepack を用意し、リポジトリ直下で実行します。pnpm のバージョンは `package.json` の指定に従います。

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm db:migrate:local
corepack pnpm dev
```

通常は http://localhost:3000 で開きます。変更・検証・公開の手順は [AGENTS.md](./AGENTS.md)、コマンド一覧は [package.json](./package.json) を参照してください。

[MIT License](./LICENSE) — Copyright (c) 2026 hayashiii-ghub
