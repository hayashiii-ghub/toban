import { test, expect, type Page } from "@playwright/test";
import type { AppState } from "../shared/types";

async function readBackupIdentity(page: Page) {
  return page.evaluate(() => {
    const state = JSON.parse(
      localStorage.getItem("rotation-schedule-app-state") ?? "null"
    ) as AppState | null;
    const active = state?.schedules.find(
      schedule => schedule.id === state.activeScheduleId
    );
    return active?.slug && active.editToken
      ? { slug: active.slug, editToken: active.editToken }
      : null;
  });
}

test("CLI で準備した D1 に非公開で保存し、画面で共有すると再読込後も表示できる", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("toban-onboarding-complete", "true");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "当番表を編集する" })
  ).toBeVisible();

  const name = "D1 保存・共有の実データ確認";
  await page.getByRole("button", { name: "当番表を編集する" }).click();
  const editor = page.getByRole("dialog");
  await expect(editor).toBeVisible();
  await editor.getByLabel("当番表の名前").fill(name);
  await editor.getByRole("button", { name: "保存する" }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);

  // API を差し替えると、CLI と Vite が別の D1 を読んでいても通ってしまう。
  await expect
    .poll(async () => Boolean(await readBackupIdentity(page)), {
      timeout: 20_000,
    })
    .toBe(true);
  const identity = await readBackupIdentity(page);
  if (!identity) throw new Error("非公開バックアップが作成されませんでした。");

  const endpoint = `/api/schedules/${identity.slug}`;
  await expect
    .poll(
      async () => {
        const response = await page.request.get(`${endpoint}/edit`, {
          headers: { "x-edit-token": identity.editToken },
        });
        if (!response.ok()) return null;
        const stored = (await response.json()) as { name: string };
        return stored.name;
      },
      { timeout: 20_000 }
    )
    .toBe(name);
  const privateResponse = await page.request.get(endpoint);
  expect(privateResponse.status()).toBe(404);

  await page.getByRole("button", { name: "共有" }).click();
  const sharing = page.getByRole("dialog", { name: "共有", exact: true });
  await expect(sharing).toBeVisible();
  await expect(
    sharing.getByText(`/s/${identity.slug}`, { exact: false })
  ).toBeVisible();

  await expect
    .poll(
      async () => {
        const response = await page.request.get(endpoint);
        if (!response.ok()) return null;
        const stored = (await response.json()) as { name: string };
        return stored.name;
      },
      { timeout: 15_000 }
    )
    .toBe(name);

  await page.goto(`/s/${identity.slug}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});
