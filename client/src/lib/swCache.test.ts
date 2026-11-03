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

describe("PWA のナビゲーション", () => {
  const config = readFileSync(
    resolve(import.meta.dirname, "../../../vite.config.ts"),
    "utf-8"
  );

  // SW は遷移を index.html で返すので、静的ページを外さないと
  // アプリを一度開いた人には /privacy が SPA の 404 になる
  it("静的ページ /privacy への遷移を index.html で横取りしない", () => {
    expect(config).toMatch(/navigateFallbackDenylist:\s*\[[^\]]*privacy/);
  });

  // Workbox は pathname + search に正規表現を当てる。クエリのドットでは外さない。
  it("ドットを含むパスへの遷移を index.html で横取りしない", () => {
    expect(config).toContain("/^[^?]*\\./");
    const dotInPath = /^[^?]*\./;
    expect(dotInPath.test("/package.json")).toBe(true);
    expect(dotInPath.test("/.git/config")).toBe(true);
    expect(dotInPath.test("/backend/.env")).toBe(true);
    expect(dotInPath.test("/.well-known/security.txt")).toBe(true);
    expect(dotInPath.test("/about")).toBe(false);
    expect(dotInPath.test("/about?v=1.2")).toBe(false);
    expect(dotInPath.test("/templates/office-cleaning")).toBe(false);
    expect(dotInPath.test("/privacy")).toBe(false);
  });
});
