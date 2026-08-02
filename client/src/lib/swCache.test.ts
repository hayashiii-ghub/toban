import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Service Worker が /api/ の応答をキャッシュしていないことを固定する。
 *
 * Cache Storage は cache-control: no-store を尊重しないため、/api/ を
 * runtimeCaching に載せると、通信できないときに古い応答が 200 として返る。
 * useAutoSync の引き直し（usePullFromServer）は fetch が throw したときしか
 * 退避しないので、それを最新のサーバ内容として取り込み、ローカルの新しい編集を
 * 巻き戻したうえでサーバへ書き戻してしまう。
 *
 * 設定ファイルなので実行時テストで守れない。文字列として見張る。
 */
describe("PWA の runtimeCaching", () => {
  const config = readFileSync(
    resolve(import.meta.dirname, "../../../vite.config.ts"),
    "utf-8"
  );

  it("/api/ をキャッシュ対象にしていない", () => {
    const runtimeCaching = config.match(/runtimeCaching:\s*\[[\s\S]*?\n\s*\]/);
    expect(runtimeCaching?.[0] ?? "").not.toMatch(/api/);
  });

  it("api-cache という名前のキャッシュを作っていない", () => {
    expect(config).not.toMatch(/cacheName:\s*["'`]api-cache["'`]/);
  });
});
