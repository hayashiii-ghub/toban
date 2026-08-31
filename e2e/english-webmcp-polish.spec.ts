import { test, expect, type Page } from "@playwright/test";
import type { AppState } from "../shared/types";
import type { ScheduleData } from "../shared/schemas";

// A deterministic client harness: real registered tools, hooks, DOM and storage.
// It does not emulate an LLM, and every API request is handled by this test.
type Reply = {
  ok: boolean;
  code: string;
  applied: boolean;
  schedule_id?: string;
  items?: Record<string, unknown>[];
  [key: string]: unknown;
};
type PrintRequest = { title: string; text: string; calendar: boolean };
type Harness = {
  tobanTools: Record<
    string,
    { execute(input: unknown): Promise<{ content: { text: string }[] }> }
  >;
  printRequests: PrintRequest[];
  storageWrites: string[];
};

async function call(
  page: Page,
  name: string,
  input: object = {}
): Promise<Reply> {
  return page.evaluate(
    async ({ name, input }) => {
      const { tobanTools } = window as unknown as Harness;
      return JSON.parse(
        (await tobanTools[name].execute(input)).content[0].text
      );
    },
    { name, input }
  );
}

async function savedRoster(page: Page, scheduleId: string) {
  return page.evaluate(id => {
    const state: AppState = JSON.parse(
      localStorage.getItem("rotation-schedule-app-state")!
    );
    return state.schedules.find(schedule => schedule.id === id)!;
  }, scheduleId);
}

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
}

const definition = {
  name: "Office cleaning",
  members: ["Maya", "Leo", "Nora", "Sam"],
  task_groups: [
    "Sweep floors",
    "Take out trash",
    "Wipe desks",
    "Water plants",
  ].map(task => ({ tasks: [task] })),
  rotation: {
    mode: "date",
    start_date: "2026-09-01",
    cycle_days: 1,
    skip_saturday: true,
    skip_sunday: true,
    skip_holidays: true,
  },
};

test.use({ locale: "en-US" });

test("English tools edit groups, print the requested month and require a sharing confirmation", async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date("2026-08-31T03:00:00Z"));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem("toban-lang", "en");
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
    Object.assign(window, {
      tobanTools: tools,
      printRequests: [],
      storageWrites: [],
    });
    const harness = window as unknown as Harness;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage) harness.storageWrites.push(key);
      originalSetItem.call(this, key, value);
    };
    window.print = () => {
      harness.printRequests.push({
        title: document.title,
        text: document.querySelector("main")?.textContent ?? "",
        calendar: !!document.querySelector(".rotation-print-calendar-section"),
      });
      window.dispatchEvent(new Event("afterprint"));
    };
  });

  const schedules = new Map<string, ScheduleData>();
  const published = new Set<string>();
  const publishRequests: string[] = [];
  const unexpectedApiRequests: string[] = [];
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const slug = path.split("/")[3];
    if (
      request.method() === "POST" &&
      /^\/api\/schedules\/[^/]+\/publish$/.test(path)
    ) {
      publishRequests.push(slug);
      published.add(slug);
      return route.fulfill({ status: 200, json: { ok: true } });
    }
    if (request.method() === "POST" && path === "/api/schedules") {
      const newSlug = `office${String(schedules.size + 1).padStart(4, "0")}`;
      schedules.set(newSlug, request.postDataJSON());
      return route.fulfill({
        status: 200,
        json: { slug: newSlug, editToken: "synthetic-office-test-token" },
      });
    }
    if (request.method() === "PUT" && /^\/api\/schedules\/[^/]+$/.test(path)) {
      schedules.set(slug, request.postDataJSON());
      return route.fulfill({ status: 200, json: { ok: true } });
    }
    if (
      request.method() === "GET" &&
      /^\/api\/schedules\/[^/]+(?:\/edit)?$/.test(path)
    ) {
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
    }
    unexpectedApiRequests.push(`${request.method()} ${path}`);
    return route.fulfill({
      status: 400,
      json: { error: "unexpected test API" },
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => Object.keys((window as unknown as Harness).tobanTools).length === 17
  );

  const created = await call(page, "create_schedule", {
    definition,
    request_id: "english-office-create",
  });
  expect(created).toMatchObject({ ok: true, applied: true });
  const scheduleId = created.schedule_id!;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    definition.name
  );
  const initial = await savedRoster(page, scheduleId);
  const groups = (
    await call(page, "get_schedule_details", { section: "groups" })
  ).items!;
  const members = (
    await call(page, "get_schedule_details", { section: "members" })
  ).items!;
  const plantGroup = groups.find(row => row.task === "Water plants")!.group_id;
  const maya = members.find(row => row.name === "Maya")!.member_id;
  const leo = members.find(row => row.name === "Leo")!.member_id;

  const addition = {
    add_task_groups: [
      { tasks: ["Restock supplies", "Check inventory"], emoji: "📦" },
    ],
    request_id: "english-office-add-supplies",
  };
  expect(await call(page, "update_schedule", addition)).toMatchObject({
    ok: true,
    applied: true,
  });
  expect((await savedRoster(page, scheduleId)).groups).toHaveLength(5);
  expect(await call(page, "update_schedule", addition)).toMatchObject({
    ok: true,
    replayed: true,
  });
  expect((await savedRoster(page, scheduleId)).groups).toHaveLength(5);
  const addedGroups = (
    await call(page, "get_schedule_details", { section: "groups" })
  ).items!;
  const supplies = addedGroups.find(
    row => row.task === "Restock supplies"
  )!.group_id;
  expect(
    addedGroups.find(row => row.task === "Check inventory")!.group_id
  ).toBe(supplies);

  expect(
    await call(page, "update_schedule", {
      remove_group_ids: [plantGroup],
      group_member_changes: [{ group_id: supplies, member_ids: [maya, leo] }],
      assignment_mode: "task",
    })
  ).toMatchObject({ ok: true, applied: true });
  let edited = await savedRoster(page, scheduleId);
  expect(edited.groups).toHaveLength(4);
  expect(edited.groups.some(group => group.id === plantGroup)).toBe(false);
  expect(edited.groups.find(group => group.id === supplies)?.memberIds).toEqual(
    [maya, leo]
  );
  expect(
    await call(page, "update_schedule", {
      group_member_changes: [{ group_id: supplies, member_ids: null }],
    })
  ).toMatchObject({ ok: true });
  expect(
    (await savedRoster(page, scheduleId)).groups.find(
      group => group.id === supplies
    )?.memberIds
  ).toBeUndefined();
  expect(
    await call(page, "update_schedule", {
      group_member_changes: [{ group_id: supplies, member_ids: [leo] }],
    })
  ).toMatchObject({ ok: true });
  edited = await savedRoster(page, scheduleId);
  expect(edited.members).toEqual(initial.members);
  expect(edited.rotationConfig).toEqual(initial.rotationConfig);
  await expect(page.locator("main")).toContainText("Restock supplies");
  await expect(page.locator("main")).not.toContainText("Water plants");

  // No locator wait between tools: print must see September immediately.
  const immediatePrint = await page.evaluate(async () => {
    const harness = window as unknown as Harness;
    const run = async (name: string, input: object) =>
      JSON.parse(
        (await harness.tobanTools[name].execute(input)).content[0].text
      );
    const changed = await run("change_view", {
      view: "calendar",
      month: "2026-09",
    });
    const printed = await run("print_schedule", {});
    return { changed, printed, requests: harness.printRequests };
  });
  expect(immediatePrint.changed).toMatchObject({
    ok: true,
    view: "calendar",
    month: "2026-09",
  });
  expect(immediatePrint.printed).toMatchObject({
    code: "PRINT_REQUESTED",
    view: "calendar",
  });
  expect(immediatePrint.requests).toHaveLength(1);
  expect(immediatePrint.requests[0]).toMatchObject({ calendar: true });
  expect(immediatePrint.requests[0].text).toContain("September 2026");
  expect(immediatePrint.requests[0].title).toContain("Office cleaning_Start_");
  await expect(page.getByText("September 2026", { exact: true })).toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("english-webmcp-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.emulateMedia({ media: "print" });
  await page.screenshot({
    path: testInfo.outputPath("english-webmcp-print.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("english-webmcp-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });

  const datedRead = await page.evaluate(async () => {
    const harness = window as unknown as Harness;
    const snapshot = () => ({
      state: localStorage.getItem("rotation-schedule-app-state"),
      view: localStorage.getItem("toban-view-tab"),
      storageWrites: harness.storageWrites.length,
    });
    const before = snapshot();
    const reply = JSON.parse(
      (
        await harness.tobanTools.get_current_assignments.execute({
          date: "2026-09-08",
        })
      ).content[0].text
    );
    const paused = JSON.parse(
      (
        await harness.tobanTools.get_current_assignments.execute({
          date: "2026-09-05",
        })
      ).content[0].text
    );
    return { before, after: snapshot(), reply, paused };
  });
  expect(datedRead.after).toEqual(datedRead.before);
  expect(datedRead.reply).toMatchObject({
    ok: true,
    applied: false,
    date: "2026-09-08",
    phase: "scheduled",
    rotation: 1,
  });
  expect(datedRead.reply.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        group_id: groups.find(row => row.task === "Sweep floors")!.group_id,
        member_name: "Leo",
      }),
      expect.objectContaining({ group_id: supplies, member_name: "Leo" }),
    ])
  );
  expect(datedRead.paused).toMatchObject({
    ok: true,
    applied: false,
    phase: "paused",
    items: [],
  });
  await expect(page.getByText("September 2026", { exact: true })).toBeVisible();

  expect(await call(page, "prepare_share")).toMatchObject({ ok: true });
  const confirmation = page.getByRole("dialog", {
    name: "Share this schedule?",
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText("Office cleaning");
  await expect(confirmation).not.toContainText(
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u
  );
  expect(publishRequests).toEqual([]);
  await expectNoOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("english-webmcp-share-confirm-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(confirmation).not.toBeVisible();
  expect(publishRequests).toEqual([]);

  expect(await call(page, "prepare_share")).toMatchObject({ ok: true });
  await expect(confirmation).toBeVisible();
  expect(publishRequests).toEqual([]);
  await confirmation
    .getByRole("button", { name: "Share schedule", exact: true })
    .click();
  const share = page.getByRole("dialog", {
    name: "Share schedule",
    exact: true,
  });
  await expect(
    share.getByRole("button", { name: "Copy link", exact: true })
  ).toBeVisible();
  expect(publishRequests).toHaveLength(1);
  const publicRoster = schedules.get(publishRequests[0])!;
  expect(publicRoster.name).toBe(definition.name);
  expect(publicRoster.groups).toEqual(edited.groups);
  expect(publicRoster.members).toEqual(initial.members);
  expect(publicRoster.rotationConfig).toEqual(initial.rotationConfig);
  await expectNoOverflow(page);
  expect(unexpectedApiRequests).toEqual([]);
});
