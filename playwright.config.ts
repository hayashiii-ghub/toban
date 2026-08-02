import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    locale: "ja-JP",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx vite --port 3000",
    port: 3000,
    // 常に自前で起動する。既存のサーバーを使い回すと、古い dev サーバーが 3000 を
    // 掴んだままのときにそれを拾ってしまい、手元の変更が反映されていない状態で
    // テストが落ちる（原因がコードに見えるので、追うのに時間を取られる）。
    // ポートが塞がっていれば起動時に明示的に失敗するので、そちらのほうが早い。
    reuseExistingServer: false,
    timeout: 30000,
  },
});
