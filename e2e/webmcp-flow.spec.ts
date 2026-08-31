import { test, expect, type Page } from "@playwright/test";

// This is a deterministic registration harness, not a conversational client.
// It invokes the real registered tools, React hooks, DOM and localStorage.
type Reply = {
  ok: boolean;
  code: string;
  applied: boolean;
  schedule_id?: string;
  [key: string]: unknown;
};
async function call(
  page: Page,
  name: string,
  input: object = {}
): Promise<Reply> {
  return page.evaluate(
    async ({ name, input }) => {
      const bridge = window as unknown as {
        tobanTools: Record<
          string,
          { execute(input: unknown): Promise<{ content: { text: string }[] }> }
        >;
      };
      return JSON.parse(
        (await bridge.tobanTools[name].execute(input)).content[0].text
      );
    },
    { name, input }
  );
}
const definition = {
  name: "オフィス掃除当番",
  members: ["葵", "蓮", "美咲", "悠"],
  task_groups: ["床掃除", "ゴミ出し", "机拭き", "植物の水やり"].map(task => ({
    tasks: [task],
  })),
  rotation: {
    mode: "date",
    start_date: "2026-09-01",
    cycle_days: 1,
    skip_saturday: true,
    skip_sunday: true,
    skip_holidays: true,
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("toban-onboarding-complete", "true");
    const tools: Record<string, unknown> = {};
    Object.defineProperty(navigator, "modelContext", {
      configurable: true,
      value: {
        registerTool(
          tool: { name: string },
          options?: { signal?: AbortSignal }
        ) {
          tools[tool.name] = tool;
          options?.signal?.addEventListener("abort", () => {
            if (tools[tool.name] === tool) delete tools[tool.name];
          });
        },
      },
    });
    Object.assign(window, { tobanTools: tools, printRequests: [] });
    window.print = () => {
      (window as unknown as { printRequests: unknown[] }).printRequests.push({
        title: document.title,
        text: document.querySelector("main")?.textContent,
        tableVisible: !!document.querySelector("main table"),
      });
      window.dispatchEvent(new Event("afterprint"));
    };
  });
  // Keep all writes inside the test. No production backend or public links.
  await page.route("**/api/schedules**", route =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"offline test"}',
    })
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      Object.keys((window as unknown as { tobanTools: object }).tobanTools)
        .length === 17
  );
});

test("one create, immediate edits, persisted reload and committed-view print", async ({
  page,
}) => {
  const created = await page.evaluate(async definition => {
    const tools = (
      window as unknown as {
        tobanTools: Record<
          string,
          { execute(input: unknown): Promise<{ content: { text: string }[] }> }
        >;
      }
    ).tobanTools;
    const start = performance.now();
    const reply = JSON.parse(
      (
        await tools.create_schedule.execute({
          definition,
          request_id: "office-flow",
        })
      ).content[0].text
    );
    return {
      reply,
      elapsed: performance.now() - start,
      heading: document.querySelector("h1")?.textContent,
      stored: JSON.parse(localStorage.getItem("rotation-schedule-app-state")!),
    };
  }, definition);
  expect(created.reply).toMatchObject({
    ok: true,
    applied: true,
    persistence: { local: "saved" },
  });
  expect(created.heading).toBe(definition.name);
  expect(
    created.stored.schedules.find(
      (s: { id: string }) => s.id === created.reply.schedule_id
    ).members
  ).toHaveLength(4);
  await test.info().attach("local-create-timing", {
    body: `${created.elapsed.toFixed(1)}ms (application operation only; not LLM latency)`,
    contentType: "text/plain",
  });
  const replay = await call(page, "create_schedule", {
    definition,
    request_id: "office-flow",
  });
  expect(replay.schedule_id).toBe(created.reply.schedule_id);
  expect(replay.replayed).toBe(true);
  const details = await call(page, "get_schedule_details", {
    section: "groups",
  });
  const jobs = details.items as { group_id: string; task: string }[];
  const watering = jobs.find(g => g.task === "植物の水やり")!;
  expect(
    await call(page, "update_schedule", {
      name: "3階の掃除当番",
      task_changes: [{ group_id: watering.group_id, tasks: ["備品補充"] }],
    })
  ).toMatchObject({ ok: true });
  expect(
    await call(page, "configure_rotation", { skip_saturday: false })
  ).toMatchObject({ ok: true });
  expect(await call(page, "change_view", { view: "table" })).toMatchObject({
    ok: true,
  });
  expect(await call(page, "print_schedule")).toMatchObject({
    code: "PRINT_REQUESTED",
    view: "table",
  });
  const printed = await page.evaluate(
    () =>
      (
        window as unknown as {
          printRequests: { tableVisible: boolean; text: string }[];
        }
      ).printRequests
  );
  expect(printed).toHaveLength(1);
  expect(printed[0].tableVisible).toBe(true);
  expect(printed[0].text).toContain("備品補充");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      Object.keys((window as unknown as { tobanTools: object }).tobanTools)
        .length === 17
  );
  expect(await call(page, "get_schedule_details")).toMatchObject({
    name: "3階の掃除当番",
    rotation: {
      mode: "date",
      start_date: "2026-09-01",
      cycle_days: 1,
      skip_saturday: false,
      skip_sunday: true,
      skip_holidays: true,
    },
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "3階の掃除当番"
  );
  await expect(
    page.getByText("備品補充", { exact: true }).first()
  ).toBeVisible();
  expect(await call(page, "get_share_link")).toMatchObject({
    code: "NOT_PUBLISHED",
    applied: false,
  });
});

test("queued writes and a read observe the newly created roster", async ({
  page,
}) => {
  const replies = await page.evaluate(async definition => {
    const tools = (
      window as unknown as {
        tobanTools: Record<
          string,
          { execute(input: unknown): Promise<{ content: { text: string }[] }> }
        >;
      }
    ).tobanTools;
    const inputs = [
      tools.create_schedule.execute({ definition }),
      tools.update_schedule.execute({ name: "連続更新" }),
      tools.configure_rotation.execute({ cycle_days: 2 }),
      tools.get_schedule_details.execute({}),
    ];
    return Promise.all(
      inputs.map(async result => JSON.parse((await result).content[0].text))
    );
  }, definition);
  expect(replies.every(reply => reply.ok)).toBe(true);
  expect(replies[3]).toMatchObject({
    name: "連続更新",
    rotation: { cycle_days: 2 },
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("連続更新");
});

test("editor blocks tools without closing or overwriting its draft", async ({
  page,
}) => {
  await page.getByRole("button", { name: "当番表を編集する" }).click();
  const dialog = page.getByRole("dialog");
  const input = dialog.locator("input").first();
  await input.fill("未保存の下書き");
  const before = await page.evaluate(() =>
    localStorage.getItem("rotation-schedule-app-state")
  );
  expect(await call(page, "create_schedule", { definition })).toMatchObject({
    code: "EDIT_IN_PROGRESS",
    applied: false,
  });
  expect(
    await call(page, "update_schedule", { name: "上書きしない" })
  ).toMatchObject({ code: "EDIT_IN_PROGRESS", applied: false });
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue("未保存の下書き");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("rotation-schedule-app-state")
    )
  ).toBe(before);
});

test("invalid input has no partial effects and storage failure is visible", async ({
  page,
}) => {
  const before = await page.evaluate(() =>
    localStorage.getItem("rotation-schedule-app-state")
  );
  expect(
    await call(page, "create_schedule", {
      definition: {
        ...definition,
        rotation: { ...definition.rotation, start_date: "2026-02-30" },
      },
    })
  ).toMatchObject({ code: "INVALID_INPUT", applied: false });
  expect(
    await call(page, "update_schedule", { name: "変更しない", pinned: "false" })
  ).toMatchObject({ code: "INVALID_INPUT", applied: false });
  expect(
    await page.evaluate(() =>
      localStorage.getItem("rotation-schedule-app-state")
    )
  ).toBe(before);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "rotation-schedule-app-state")
        throw new DOMException("quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  const failed = await call(page, "create_schedule", {
    definition,
    request_id: "quota",
  });
  expect(failed).toMatchObject({
    code: "PERSISTENCE_FAILED",
    applied: true,
    persistence: { local: "failed" },
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    definition.name
  );
  await expect(page.getByRole("alert")).toContainText(
    "端末に保存できませんでした"
  );
  expect(
    (await call(page, "create_schedule", { definition, request_id: "quota" }))
      .schedule_id
  ).toBe(failed.schedule_id);
});

for (const locale of ["ja", "en"] as const) {
  test(`${locale} responsive roster conditions and four views`, async ({
    page,
  }, testInfo) => {
    await page.evaluate(
      locale => localStorage.setItem("toban-lang", locale),
      locale
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        Object.keys((window as unknown as { tobanTools: object }).tobanTools)
          .length === 17
    );
    const custom =
      locale === "en"
        ? {
            ...definition,
            name: "Office duties",
            members: ["Alex", "Sam", "Riley", "Jordan"],
            task_groups: [
              "Clean floors",
              "Take out trash",
              "Wipe desks",
              "Water plants",
            ].map(task => ({ tasks: [task] })),
          }
        : definition;
    expect(
      await call(page, "create_schedule", { definition: custom })
    ).toMatchObject({ ok: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: testInfo.outputPath(`${locale}-desktop.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const view of ["cards", "table", "calendar", "disc"]) {
      expect(await call(page, "change_view", { view })).toMatchObject({
        ok: true,
      });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        custom.name
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth
        )
      ).toBe(true);
    }
    await call(page, "change_view", { view: "cards" });
    // Detailed conditions remain available in the existing editor, without
    // repeating the roster content below its title.
    await page
      .getByRole("button", {
        name: locale === "ja" ? "当番表を編集する" : "Edit schedule",
      })
      .click();
    const editor = page.getByRole("dialog");
    await editor
      .getByRole("button", { name: /基本設定|Basic settings/ })
      .click();
    await expect(
      editor.getByLabel(locale === "ja" ? "開始日" : "Start date")
    ).toHaveValue("2026-09-01");
    await expect(
      editor.getByLabel(
        locale === "ja"
          ? "何日ごとに交代するか"
          : "How many days between rotations"
      )
    ).toHaveValue("1");
    for (const label of locale === "ja"
      ? ["土曜はお休み", "日曜はお休み", "祝日はお休み"]
      : ["Skip Saturdays", "Skip Sundays", "Skip Japanese public holidays"]) {
      await expect(editor.getByLabel(label)).toBeChecked();
    }
    await editor
      .getByRole("button", {
        name: locale === "ja" ? "閉じる" : "Close",
        exact: true,
      })
      .click();
    await expect(editor).not.toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`${locale}-mobile.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
}

test("printing immediately after a view change includes visible content", async ({
  page,
}) => {
  await call(page, "create_schedule", { definition });
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => {
    window.print = () => {
      const cards = [...document.querySelectorAll(".rotation-print-card")];
      const visible =
        cards.length > 0 &&
        cards.every(card => getComputedStyle(card).opacity === "1");
      Object.assign(window, { printedContentVisible: visible });
      window.dispatchEvent(new Event("afterprint"));
    };
  });
  for (const view of ["table", "calendar", "cards"]) {
    expect(await call(page, "change_view", { view })).toMatchObject({
      ok: true,
    });
    expect(await call(page, "print_schedule")).toMatchObject({
      code: "PRINT_REQUESTED",
    });
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { printedContentVisible: boolean })
            .printedContentVisible
      )
    ).toBe(true);
  }
});

test("multiple jobs grouped for one person remain visible on cards and paper", async ({
  page,
}) => {
  expect(
    await call(page, "create_schedule", {
      definition: {
        name: "まとめた仕事",
        members: ["葵"],
        task_groups: [{ tasks: ["床掃除", "ゴミ出し"] }],
      },
    })
  ).toMatchObject({ ok: true });
  await call(page, "change_view", { view: "cards" });
  await expect(page.locator(".rotation-print-card")).toHaveCount(1);
  await expect(page.locator(".rotation-print-card")).toContainText("床掃除");
  await expect(page.locator(".rotation-print-card")).toContainText("ゴミ出し");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: test.info().outputPath("grouped-tasks-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".rotation-print-card")).toContainText("ゴミ出し");
  await page.screenshot({
    path: test.info().outputPath("grouped-tasks-print.png"),
    fullPage: true,
    animations: "disabled",
  });
});
