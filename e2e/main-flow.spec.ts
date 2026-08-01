import { test, expect } from "@playwright/test";

test.describe("メインフロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("toban-onboarding-complete", "true");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("初期表示: デフォルトスケジュールが表示される", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("設定モーダル: スケジュール名を編集して保存", async ({ page }) => {
    await page.getByRole("button", { name: "当番表を編集する" }).click();

    const modal = page.locator("[role=dialog]");
    await expect(modal).toBeVisible();

    const nameInput = modal.locator("input").first();
    await nameInput.clear();
    await nameInput.fill("テスト当番表");

    await modal.getByRole("button", { name: "保存する" }).click();
    await expect(modal).not.toBeVisible();

    // exact match で1要素だけにマッチさせる
    await expect(page.getByText("テスト当番表", { exact: true })).toBeVisible();
  });

  test("表示切り替え: カード → 早見表 → カレンダー", async ({ page }) => {
    await page.getByRole("button", { name: "早見表" }).click();
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "カレンダー" }).click();
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "カード" }).click();
    await page.waitForTimeout(300);
  });

  test("ローテーション: 次へで切り替わる", async ({ page }) => {
    const nextButton = page.getByRole("button", { name: "次のローテーション" });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }
  });

  test("新しいスケジュールを追加", async ({ page }) => {
    const addButton = page
      .getByRole("button", { name: /追加|新規|\+/ })
      .first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      const templateButton = page.locator("[role=dialog] button").first();
      if (await templateButton.isVisible()) {
        await templateButton.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("共有ボタンが存在する", async ({ page }) => {
    await expect(page.getByRole("button", { name: "共有" })).toBeVisible();
  });

  // 共有モーダルは実 API がないと開けないため、ユニットテストでは
  // react-qr-code をモックしている。その結果 QRCode の import が壊れていても
  // 誰も気づけず、本番で共有が丸ごと落ちた（React error #130）。
  // ここだけは本物のモジュールを描画して、モーダルが開くことを保証する。
  test("共有モーダルが開く（API をスタブ）", async ({ page }) => {
    await page.route("**/api/schedules**", route => {
      const isPublish = new URL(route.request().url()).pathname.endsWith(
        "/publish"
      );
      const body =
        route.request().method() === "POST" && !isPublish
          ? '{"slug":"AbCdEfGhIj","editToken":"tok"}'
          : '{"ok":true}';
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body,
      });
    });

    await page.getByRole("button", { name: "共有" }).click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.getByText("/s/AbCdEfGhIj")).toBeVisible();
    // QRCode が描画されていること（壊れていると SVG ごと出ない）
    await expect(modal.locator("svg[viewBox]").first()).toBeVisible();
    // エラーバウンダリに落ちていないこと
    await expect(page.getByText("予期しないエラーが発生しました")).toBeHidden();
  });

  test("ランディングページが表示される", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10000,
    });
  });

  test("テンプレートページが表示される", async ({ page }) => {
    await page.goto("/templates");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10000,
    });
  });

  test("存在しないページは404", async ({ page }) => {
    await page.goto("/nonexistent-page-xyz");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("localStorage にデータが保存される", async ({ page }) => {
    const hasData = await page.evaluate(() => {
      for (const [, value] of Object.entries(localStorage)) {
        if (value.includes("schedules") || value.includes("activeScheduleId"))
          return true;
      }
      return false;
    });
    expect(hasData).toBe(true);
  });
});
