# toban（無料の当番表作成アプリ）

学校・保育園・介護施設・自治会・オフィス・家庭の当番表を作成・印刷・共有できる無料の当番表作成アプリ。掃除当番からシフト・家事分担まで対応。

## Philosophy

- **シンプルさ最優先** — 編集要素をむやみに増やさない。機能よりわかりやすさを優先
- **軽量** — 重いDB不要。localStorageが主データストア、D1はクラウド永続化層
- **印刷品質** — 印刷/PDF出力がきれいであることが最重要価値
- **ターゲットユーザー**: 20-30代女性、小中規模組織（学校・PTA・部署等）の非技術者
- **やらないこと**: 通知・リマインダー / 変更履歴・監査ログ / リアルタイム共同編集 / 交代リクエスト / メンバー検索 / 公平性ダッシュボード / Undo / 印刷プレビューモーダル

## Key Conventions

- Client/server共有の型は `shared/types.ts`、Zodスキーマは `shared/schemas.ts`
- 入力の文字数・件数上限は `shared/limits.ts` が単一の真実源（server スキーマ / UI maxLength / WebMCP 検証が共有）
- クライアントのimportは `@/*`（client/src）と `@shared/*`（shared）エイリアスを使用
- 新規の機能コンポーネントは `client/src/features/<機能名>/` に置く。`components/` は横断的に再利用するものだけ（`components/ui/` は shadcn/ui）。`pages/` はルートに対応するページのみ、hook は `hooks/` に置く
- localStorage が主データストア。D1 はクラウド永続化層
- UIは全て日本語
- コードや構成を変更した場合は README.md も合わせて更新すること

## hikizan Conventions

このセクションは hikizan plugin の基本 routing / safety です。詳細な判断は skill、block / warning は hook に従う。

### Routing

- 設計判断 / 計画 / 実装 / バグ調査は `kouchiku`
- 情報取得 / 全体像把握 / 影響範囲調査 / 用語すり合わせは `tansaku`
- TDD / 回帰テストが必要な実装は `shiken`
- code review / 整理観点の確認は `sadoku`
- PR 本文ドラフト / PR 提出は `teishutsu`

### Safety

- 破壊的操作は、ユーザの明示確認なしに進めない
- submodule を含む repo では、cwd と対象 repo を確認してから PR / commit / push に進む
