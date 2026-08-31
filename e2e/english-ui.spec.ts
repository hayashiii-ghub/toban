import { test, expect } from "@playwright/test";
import { DEFAULT_APP_STATE } from "../client/src/rotation/defaultState";

test.use({ locale: "en-US" });

// All schedules and sharing stay inside the test; no public backend is used.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-08-31T03:00:00Z"));
  await page.addInitScript(() => {
    localStorage.setItem("toban-onboarding-complete", "true");
    Object.assign(window, { printedTitles: [] });
    window.print = () => {
      (window as unknown as { printedTitles: string[] }).printedTitles.push(
        document.title
      );
      window.dispatchEvent(new Event("afterprint"));
    };
  });
});

test("English first visit, blank creation and language switch preserve roster content", async ({
  page,
}) => {
  await page.route("**/api/schedules**", route =>
    route.fulfill({ status: 400, body: "{}" })
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Getting started"
  );
  await expect(page).toHaveTitle(/Free Duty Roster/);
  await expect(page.locator("main")).not.toContainText(
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u
  );
  await page
    .getByRole("button", { name: "Add a new schedule", exact: true })
    .click();
  const picker = page.getByRole("dialog");
  await expect(picker).not.toContainText(
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u
  );
  await picker.getByRole("button", { name: /Start from scratch/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Untitled roster"
  );
  await expect(page.getByText("Task 1", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Member 1", { exact: true }).first()
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit schedule", exact: true })
    .click();
  const editor = page.getByRole("dialog");
  await editor.getByRole("button", { name: /Members and tasks/ }).click();
  await expect(editor).toContainText("1 person · 1 group");
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(editor).not.toBeVisible();
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Untitled roster"
  );
  await expect(page.getByText("Task 1", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "当番表を編集する" })
  ).toBeVisible();
});

test("English template, date settings, calendar, print and shared view", async ({
  page,
}, testInfo) => {
  const schedules = new Map<string, Record<string, unknown>>();
  const published = new Set<string>();
  await page.route("**/api/schedules**", async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const slug = path.split("/")[3];
    if (req.method() === "POST" && path.endsWith("/publish")) {
      published.add(slug);
      return route.fulfill({ status: 200, json: { ok: true } });
    }
    if (req.method() === "POST") {
      const createdSlug = `test${String(schedules.size + 1).padStart(6, "0")}`;
      schedules.set(createdSlug, req.postDataJSON());
      return route.fulfill({
        status: 200,
        json: { slug: createdSlug, editToken: "synthetic-test-token" },
      });
    }
    if (req.method() === "PUT") {
      schedules.set(slug, req.postDataJSON());
      return route.fulfill({ status: 200, json: { ok: true } });
    }
    const schedule = schedules.get(slug);
    if (!schedule || (!path.endsWith("/edit") && !published.has(slug))) {
      return route.fulfill({ status: 404, json: { error: "not found" } });
    }
    return route.fulfill({
      status: 200,
      json: {
        ...schedule,
        slug,
        createdAt: "2026-08-31T03:00:00Z",
        updatedAt: "2026-08-31T03:00:00Z",
      },
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Add a new schedule", exact: true })
    .click();
  const picker = page.getByRole("dialog");
  await picker.getByRole("button", { name: /Office$/, exact: false }).click();
  await picker.getByRole("button", { name: /Office cleaning/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Office cleaning"
  );
  await expect(page.locator("main")).not.toContainText(
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u
  );

  await page
    .getByRole("button", { name: "Edit schedule", exact: true })
    .click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Group 4 task 1").fill("Restock supplies");
  await editor.getByRole("button", { name: /Basic settings/ }).click();
  await editor.getByRole("button", { name: "Automatic", exact: true }).click();
  await editor.getByLabel("Start date", { exact: true }).fill("2026-09-01");
  await editor.getByLabel("How many days between rotations").fill("1");
  await expect(editor.getByText("day", { exact: true })).toBeVisible();
  await editor.getByLabel("How many days between rotations").fill("4");
  await expect(editor.getByText("days", { exact: true })).toBeVisible();
  await editor.getByLabel("How many days between rotations").fill("1");
  for (const name of [
    "Skip Saturdays",
    "Skip Sundays",
    "Skip Japanese public holidays",
  ]) {
    await editor.getByLabel(name, { exact: true }).check();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await editor
    .getByRole("button", { name: /Basic settings/ })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("english-settings-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).not.toBeVisible();
  await expect(
    page.getByText("Starting assignments · Starts Sep 1, 2026", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Restock supplies", { exact: true })
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("english-cards-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });

  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await page.getByRole("button", { name: "▶", exact: true }).click();
  await expect(page.getByText("September 2026", { exact: true })).toBeVisible();
  await expect(
    page.getByTitle("Respect for the Aged Day").first()
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("english-calendar-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: testInfo.outputPath("english-calendar-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });

  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "Task", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Print", exact: true }).click();
  const titles = await page.evaluate(
    () => (window as unknown as { printedTitles: string[] }).printedTitles
  );
  expect(titles).toHaveLength(1);
  expect(titles[0]).toContain("Office cleaning_Start_");
  expect(titles[0]).not.toMatch(
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u
  );
  await page.emulateMedia({ media: "print" });
  await page.screenshot({
    path: testInfo.outputPath("english-table-print.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.emulateMedia({ media: "screen" });

  await page.getByRole("button", { name: "Share", exact: true }).click();
  const share = page.getByRole("dialog", {
    name: "Share schedule",
    exact: true,
  });
  await expect(
    share.getByRole("button", { name: "Copy link", exact: true })
  ).toBeVisible();
  await expect(share).toContainText(
    'Anyone with this link can view "Office cleaning".'
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("english-share-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  const slug = [...published][0];
  expect(slug).toBeTruthy();
  await page.goto(`/s/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Office cleaning"
  );
  await expect(
    page.getByRole("button", { name: "Make a copy", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Restock supplies", { exact: true })
  ).toBeVisible();
  await expect(page).toHaveTitle("Office cleaning - toban");
  await page.screenshot({
    path: testInfo.outputPath("english-shared-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("saved Japanese guide follows the UI language until its text is edited", async ({
  page,
}, testInfo) => {
  await page.route("**/api/schedules**", route =>
    route.fulfill({ status: 400, body: "{}" })
  );
  await page.addInitScript(state => {
    localStorage.setItem("toban-lang", "ja");
    localStorage.setItem("rotation-schedule-app-state", JSON.stringify(state));
  }, DEFAULT_APP_STATE);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "はじめてガイド"
  );
  const savedBefore = await page.evaluate(() =>
    localStorage.getItem("rotation-schedule-app-state")
  );
  await page.getByRole("button", { name: /^(Language|言語)$/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Getting started"
  );
  await expect(
    page.getByText("Select + to choose a template or start from scratch", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    page.getByText("Print your schedule, save a PDF, or share a link", {
      exact: true,
    })
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u
  );
  await page.screenshot({
    path: testInfo.outputPath("english-guide-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });

  await page
    .getByRole("button", { name: "Edit schedule", exact: true })
    .click();
  const editor = page.getByRole("dialog");
  await expect(editor.getByLabel("Task 1 name", { exact: true })).toHaveValue(
    "Pick a template"
  );
  await expect(editor.getByLabel("Task 4 name", { exact: true })).toHaveValue(
    "Print or share"
  );
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(editor).not.toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByText("Edit members & tasks", { exact: true })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("english-guide-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Print", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { printedTitles: string[] }).printedTitles.at(
            -1
          ) ?? ""
      )
    )
    .toContain("Getting started_Start_");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ media: "print" });
  await page.screenshot({
    path: testInfo.outputPath("english-guide-print.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.emulateMedia({ media: "screen" });

  await page.getByRole("button", { name: /^(Language|言語)$/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "はじめてガイド"
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("rotation-schedule-app-state")
    )
  ).toBe(savedBefore);

  await page.getByRole("button", { name: /^(Language|言語)$/ }).click();
  await page
    .getByRole("button", { name: "Edit schedule", exact: true })
    .click();
  await editor
    .getByLabel("Task 1 name", { exact: true })
    .fill("Our onboarding");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).not.toBeVisible();
  await page.getByRole("button", { name: /^(Language|言語)$/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Getting started"
  );
  await expect(page.getByText("Our onboarding", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Print your schedule, save a PDF, or share a link", {
      exact: true,
    })
  ).toBeVisible();
});
