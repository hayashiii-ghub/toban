# Toban: describe a duty roster, then use it

Toban turns a chat request into an editable, printable duty roster on the page. A WebMCP-capable client interprets the request and calls Toban's domain tools. Toban does not embed a chatbot or require an LLM API key.

**Status: published at [toban.app](https://toban.app/) on 2026-08-31; not submitted to the challenge.** Local WebMCP conversations and production UI saving/sharing were verified separately. The user also confirmed WebMCP works on production in Chrome/nekuda on 2026-08-31. The Codex in-app connection itself did not discover production tools, and its Chrome connection did not expose a WebMCP capability. A public demo video and submission remain outstanding.

## Try the experience

English browsers start in English. You can also use the language button at the bottom of the app. Existing rosters keep their content when you switch languages. The unedited Getting started guide also follows the selected language, without changing its saved or shared text.

With a connected WebMCP client, open Toban's home page and ask:

> Create Office duties for Alex, Sam, Riley and Jordan. Four separate duties: vacuuming, rubbish, wiping desks and watering plants. Start September 1, 2026, rotate each eligible day, and pause rotation on Saturdays, Sundays and Japanese holidays. Show it as a table.

Then:

> Replace watering plants with restocking supplies.

> Open the print preview.

The intended flow is one complete creation operation, one view change when requested, and a targeted edit. The user supplies ordinary language, not template names, tool names or JSON. Missing essential people/tasks need clarification; colors, emoji and an optional roster name have defaults.

Japanese equivalent:

> 「オフィス掃除当番」を作って。葵、蓮、美咲、悠の4人。床掃除、ゴミ出し、机拭き、植物の水やりを1人1つ。2026年9月1日から平日ごとに交代し、土日と日本の祝日は交代を進めない。早見表で見せて。

> 植物の水やりを備品補充に変えて。

## Supported boundaries

- One person per task group. Several task strings in one group stay together and are displayed on the same card. Different member/group counts can cause multiple duties or unassigned people; weighted fairness is not promised.
- Manual rotation, or date-based rotation with a start date and an integer interval of 1–365 days, matching the editor and cloud API. `cycle_days` counts eligible days between changes of assignee, not the length of a full round or the number of people/tasks. Daily or every weekday means `cycle_days: 1`, even for four people and four tasks. Five eligible days is not necessarily every Monday.
- Optional pauses on Saturdays, Sundays and Japanese holidays. Pausing does not advance the calculated turn: cards/table retain that turn, while the existing calendar presentation leaves paused dates blank. It is not an individual availability constraint.
- New date inputs are limited to 1980–2099, matching the holiday calculator's equinox range and bounding computation. The calculator applies Japanese holiday rule changes and one-off imperial holidays within that range, including the 2020/2021 Olympic exceptions. Its 1980–2027 date sets match the [Cabinet Office CSV](https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv); equinox dates after that published calendar remain formula-based predictions.
- Temporary absence, per-person weekday restrictions, simultaneous multi-person duties, shifts and optimization are unsupported. A client should explain the limitation before approximating a request. `update_member.skip` is persistent exclusion until changed back, never “today only.”
- Cards, table, calendar and wheel remain the existing views. The wheel keeps the existing `disc` tool value and its restrictions; the other views remain available.
- Print means requesting the browser dialog. A tool cannot attest that the user printed or saved a PDF; clients that block it must use the visible Print button.

## Run locally

Use Node.js 24 or newer and pnpm 10 or newer. The implementation was checked with Node 26.7.0.

```sh
pnpm install
pnpm dev
```

The frontend normally runs on `http://localhost:3000`. This is enough to create, edit and reload locally saved rosters. Cloud requests will fail without the API; that does not imply local saving failed. To exercise the local cloud layer, use the existing development setup:

```sh
pnpm db:migrate:local
pnpm dev:full
```

Cloudflare development configuration is described in the root README. Do not use production credentials/data for a demo.

In this implementation session, Codex Desktop's in-app browser discovered and called the page's actual registered WebMCP tools at `http://127.0.0.1:3011/`. This is distinct from the mocked registration used by Playwright. Opening the page in an ordinary chat client only proves page access; it does not prove that the client can invoke WebMCP tools. Other clients and production origin-trial behavior require separate verification. See the [Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) for current browser setup.

## Tool contract

The existing sixteen tool names are retained. `create_schedule` accepts exactly one of the legacy `template` name or a complete `definition`:

```json
{
  "request_id": "office-demo-1",
  "definition": {
    "name": "Office duties",
    "members": ["Alex", "Sam", "Riley", "Jordan"],
    "task_groups": [
      { "tasks": ["Vacuuming"] },
      { "tasks": ["Rubbish"] },
      { "tasks": ["Wiping desks"] },
      { "tasks": ["Watering plants"] }
    ],
    "rotation": {
      "mode": "date",
      "start_date": "2026-09-01",
      "cycle_days": 1,
      "skip_saturday": true,
      "skip_sunday": true,
      "skip_holidays": true
    }
  }
}
```

The application generates IDs/colors and validates the entire definition before inserting and selecting one complete roster. New definitions use task assignment mode. A missing rotation defaults to manual. All write inputs are validated at runtime, including unknown keys, types, empty names/tasks, limits and real calendar dates. Limits reuse `shared/limits.ts` (50 members, 20 groups, 20 tasks per group, 100 characters per name/task).

Use `get_schedule_details` to inspect the overview and rotation conditions. `section: "members"` and `section: "groups"` return IDs and paged rows; group rows contain individual tasks or member-pool IDs. `get_current_assignments` maps group IDs to member IDs. An optional `date: "YYYY-MM-DD"` queries another date without changing or saving the roster. Date mode returns `before_start` for initial placements, `paused` with no duties on excluded dates, or `scheduled` for a requested active date. Manual mode returns `manual`, since it cannot predict future manual changes. Date/month queries use the supported 1980–2099 range. `list_schedules` also supports pagination and exact-name filtering. Pass each `next_cursor` until null; pages remain valid JSON within a 1,500-character budget rather than clipping a string.

Edits accept an optional `schedule_id`; otherwise the active roster is resolved when the queued operation starts. `update_schedule.task_changes` changes only the named groups' tasks. `add_task_groups` and `remove_group_ids` add or remove independent duties in task mode, without changing the member list. `group_member_changes` sets each group's ordered eligible `member_ids`; `null` restores the default pool of all members. Empty pools, duplicate/unknown IDs, conflicting edits, removal of the final duty, and member removal/exclusion that would empty an explicit eligible pool are rejected before applying any part of the update. Member operations accept a `member_id` or a unique exact name. An ambiguous name returns candidates and a paged lookup path, with no mutation. These IDs are tool data, not new labels in the normal UI.

Results are JSON inside the existing MCP-compatible text content. Mutations return `ok`, `code`, `schedule_id`, `applied`, `summary` and `persistence`. Read tools also provide structured JSON instead of the earlier prose-only output; clients that parsed that prose must adapt.

- `INVALID_INPUT`, `AMBIGUOUS_TARGET`, `NOT_FOUND`, `EDIT_IN_PROGRESS`: no mutation.
- `PERSISTENCE_FAILED` with `applied: true`: the page changed but the device could not save it. Keep the page open and inspect the existing roster rather than creating a duplicate. The UI also shows the failure.
- Local and cloud statuses are separate. Cloud status may be pending, syncing, synced, error or unknown; the response does not wait for a five-second private backup.
- `request_id` on `create_schedule` or `update_schedule` replays a prior applied result only during the current page registration lifetime, including an applied change whose local save failed. Reusing it with different content is rejected. Navigation/reload resets this map; inspect the roster list after an uncertain outcome instead of blindly retrying.

Writes and reads share a per-registration queue. React commits and the local save attempt finish before a mutation resolves. Editors and sharing dialogs block tool writes without closing a human draft. `change_view` accepts an optional `month: "YYYY-MM"` for calendar view. Month navigation in the UI and tool calls share the same display state; neither changes roster dates or rotation. View and month switching commit before a print request, and print CSS removes entrance-animation transparency from printable content. Backup responses merge identity into the original roster without replacing later edits; pulls verify the original content again; same-roster cloud PUTs are serialized.

## Publication and untrusted input

Creating a roster does not publish it. Toban retains its existing private automatic backup. A backup slug alone is not a public URL: `get_share_link` verifies a public GET and distinguishes not published from a failed verification request. It never calls the publish endpoint. `prepare_share` opens an on-page confirmation for the active roster without saving or publishing. It returns `CONFIRMATION_REQUIRED` with `applied: false`; tool writes are blocked until that dialog closes. Only the user's explicit confirmation calls publication, after rechecking the roster ID and visible content. Canceling does not save or publish. The existing Share button remains a direct user publication action. Edits to an already published roster can synchronize to that public link.

Tool output never includes edit tokens. User-entered roster/member/task text is data and carries `untrustedContentHint`; reads carry `readOnlyHint`. Hints are advisory, not an injection defense by themselves. Strict runtime validation and the absence of a publication tool preserve application boundaries. Tool exposure keeps the default same-origin behavior. These choices follow the [WebMCP security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools).

## Verification

```sh
pnpm format:check
pnpm check
pnpm lint
pnpm test:coverage
pnpm build
pnpm test:e2e
```

Historical pre-English-polish checks: **708 unit tests in 52 files and 19 Playwright E2E tests passed**. Later candidate and production evidence is recorded below. The build retains a warning for a JavaScript chunk larger than 500 kB; no unrelated bundle refactor was included.

The deterministic tests exercise the actual hooks, registered functions, DOM, reload persistence, strict failures, duplicate-name rejection, request replay, storage failure, paused editors, late cloud responses, immediate print visibility and grouped tasks. Playwright's cloud routes and print dialog are mocked; those tests do not prove production sharing or physical printing. Desktop/mobile screenshots are written to ignored `e2e/test-results/` artifacts and must be visually inspected.

Conversational evaluation uses these six requests, each twice with a new roster, without giving the evaluator tool names, JSON or a required call sequence:

| Case         | Creation                                                                                                    | Follow-up                            |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| JA office    | 4 people, 4 separate cleaning jobs, Sep 1, daily eligible rotation, pause weekends/Japanese holidays, table | Replace plant watering with supplies |
| JA classroom | あおい・れん・そら, board/papers/sweeping, manual                                                           | Rename れん to レン, advance once    |
| JA home      | 春・夏・秋, dishes/rubbish/laundry, Sep 1, every 2 days including weekends, calendar                        | Change to every 3 days               |
| EN office    | Alex/Sam/Riley/Jordan, four cleaning jobs, same date/pauses, table                                          | Replace watering with restocking     |
| EN classroom | Emma/Noah/Mia, board/papers/sweeping, manual                                                                | Rename Noah to Noah K, advance once  |
| EN home      | Pat/Lee/Robin, dishes/rubbish/laundry, Sep 1, every 2 days including weekends, calendar                     | Change to every 3 days               |

Session observation, 2026-08-31: all 12 creation/edit flows succeeded through the actual Codex In-app Browser WebMCP connection, each with one creation call. The evaluator did not read source, implementation plans or tests. It used a new browser tab, initially containing only the guide roster; the 12 distinct new rosters and the guide remained after reload. This was a shared browser session, not 12 isolated clean profiles. Two stale tool handles were reacquired during development hot reload; the complete evaluation was not pinned to one immutable build. Deterministic regressions were rerun against the final local code. A further smoke test against the static production build on a fresh local origin verified real WebMCP creation with grouped tasks, editing, view switching and reload persistence without development hot reload. The existing first-visit guide was dismissed through its visible Skip button.

The home-calendar examples required navigating from the current month (August) to the requested start month (September) with the visible calendar arrow. Two-day and three-day boundaries, weekends included, were checked on the visible calendar. The office case also checked the September 21–23 holiday pause. The two unsupported absence/weekday requests were identified as requiring clarification, with persistent `skipped` flags unchanged.

The Codex in-app client returned `PRINT_REQUESTED`, but its interface did not expose a native print preview. The user subsequently verified creation, task replacement and an actual native Chrome print preview through nekuda WebMCP Workbench, supplying screenshots on 2026-08-31. Physical printing/PDF saving was not confirmed. The client did not expose an exact browser version. Cloud sync reported an error because no local API backend was running; local saves succeeded. That initial local evaluation did not publish a roster or contact the production backend. Do not treat those local checks as production release evidence; the later production smoke is recorded below.

## Release follow-up (2026-08-31)

- Removed redundant member/group/rotation conditions below the title; the existing editor retains the settings. Local-save failure notices remain; the shared-roster sync explanation was subsequently removed at the user's request.
- Aligned guide/task-card descriptions across neighboring cards with different title wrapping; desktop and mobile visual checks passed.
- The user's first nekuda run used a four-day interval; the later correction to one eligible day succeeded. The original raw request/tool arguments are unavailable, so this does not establish a calculation bug. The shared tool schema and descriptions now distinguish the interval between assignments from roster size/full-round duration. No automatic rewriting of a legitimate four-day interval was added.
- Added runtime rejection of intervals over 365 before mutation, matching the existing cloud API. Both create/configure regressions failed before the fix and passed afterward.
- Unsent cloud edits now leave a durable ID-only recovery marker. After reopening the page, the existing locally saved body is sent before any server pull; rejected writes remain protected without endless retries. Deletion clears recovery markers. Storage must be available for cross-reload protection.
- Three additional source-blind local WebMCP conversations passed: Japanese and English weekday rotation, plus an explicit four-eligible-day rotation. Inputs, returned settings and September 1/2/7 calendar cells matched. One initial development hot-reload tool handle was refreshed; this is not a measured nekuda error rate.
- The deployment command now explicitly selects remote D1. Before deployment, the live schema and migration history are checked to avoid re-adding columns already created by the runtime safety net.

### First production release evidence (historical)

- Source through `3434825` was fast-forwarded to GitHub `main`; its GitHub CI passed. The final code passed 708 unit tests in 52 files, all 19 E2E tests, type checking, lint, formatting and the production build.
- The canonical `pnpm run deploy:cf` deployed Worker version `2b3a4907-e00c-47be-83d9-c3503e88fca3`; the repository-connected automatic deployment subsequently produced `1018ad45-ae23-4ef6-a8e0-f76e73906ee0` from the same code. The live entry asset `/assets/index-Bb3RBHUJ.js` matched the local build byte for byte (SHA-256 `72cfabea6273377195a0483c631d334a27ef7df4d3095293d609ea4f164f3ed4`).
- The live `is_public INTEGER NOT NULL DEFAULT 0` column already existed via the runtime schema safety net, while migration 0005 was missing from history. After checking the exact column definition and recording a D1 Time Travel bookmark, a conditional insertion reconciled only that completed migration record. Normal deployment then applied 0006's index. No existing roster contents or publication flags were changed. The remote migration list is empty and `/api/health/schema` returns 200 with `ok: true`.
- A synthetic two-person roster was created through the production editor, saved to cloud, reloaded, changed from plant watering to supplies and intentionally shared. Its separate public page and public API showed the saved content. A subsequent edit also reached the public URL while preserving the other task and daily rotation settings. A fresh 390px-wide shared page had no horizontal overflow. The visible Print button was invoked without page errors; the native dialog is not observable through this connection.
- The synthetic roster was deleted through the UI after verification. Its public API then returned 404. No user roster was edited or deleted.
- A previously open browser initially retained the old service-worker page; a further normal reload loaded the current asset. No cache or browser storage was cleared. The user subsequently confirmed production WebMCP operation in Chrome/nekuda; this is user-observed evidence, distinct from the agent UI/API checks.

The values above describe the first WebMCP production release through `3434825`. They are retained as historical evidence and are not the current production identifiers.

## English UI follow-up (2026-08-31)

These English UI changes were first verified locally. The checks in this section alone do not establish production deployment.

- Localized all 32 built-in templates, including the blank starter: names, tasks and sample members are English when created in English. The picker, gallery, detail pages and template links use the same data. Saved rosters, IDs, assignments, colors and themes are preserved.
- Template-based WebMCP creation accepts both the displayed English name and the original Japanese name; the created content follows the active interface language.
- Shortened and aligned control labels, added singular/plural forms, localized theme names and the browser page title, and formatted future start dates in English. No new explanatory banners were added.
- The holiday option explicitly says Japanese public holidays. English holiday names stay readable inside narrow calendar cells. The calculator also applies historical rule changes and one-off imperial holidays across the supported range, as described under Supported boundaries.
- The built-in Getting started guide now follows language switching, including guides already saved in Japanese or the older English version. Its title, steps, descriptions, editor and print view agree; custom rosters and edited guides are not translated. Explicit edits, copies and sharing use the displayed language, while a language switch alone never writes a translation to the shared roster.
- Before the tool extensions below, local checks passed 788 unit tests in 55 files and all 22 Playwright E2E tests, along with type checking, lint, formatting and the production build. English blank/template creation, switching languages without translating saved data, one/four-day settings, calendar labels, print output and sharing were exercised. Desktop, 390px mobile and print screenshots were reviewed independently.
- The English sharing E2E uses an isolated in-memory API fixture, and printing records the dialog request plus print CSS. Those checks do not publish real schedules or prove a physical print/PDF save.
- Template categories are shared through a small module so opening the app does not load the SEO template descriptions. The main bundle is about 647 kB; the existing 500 kB chunk warning remains.

## English demo tool extensions (2026-08-31)

- `change_view.month` selects a calendar month and commits it before printing; `get_current_assignments.date` calculates a requested date without editing or saving a roster.
- `update_schedule` supports independent duty additions/removals and ordered member pools. Edits are atomic and preserve unrelated data. Page-lifetime request IDs prevent duplicate additions on retry, including after local-save failure and more than 100 intervening edits.
- `prepare_share` opens an explicit confirmation without publishing. Confirmation is bound to the visible roster and contents; cancellation, stale confirmations and concurrent edits cannot publish it. Public-success reporting remains accurate if the view changes after publication.
- English sharing puts Copy link first; Japanese button order remains unchanged. The bulk-name preview uses a count-neutral English label.
- The complete release candidate passed 859 unit tests across 57 files and all 23 E2E tests, plus type, lint, formatting and production-build checks. Native WebMCP calls on localhost verified creation, duty editing, month selection, dated reads, confirmation, blocked edits and cancellation. Desktop, 390px and print images were visually checked.
- E2E publication and print requests use isolated mocks. Local verification does not prove a public backend write or a physical print/PDF save.

### Previous production release (2026-08-31, historical)

- GitHub `main` and the deployed source are `c8639d3`. [GitHub Actions run 33386966425](https://github.com/hayashiii-ghub/toban-app/actions/runs/33386966425) passed formatting, type checking, lint, coverage tests and the production build for that exact commit. The workflow at that time skipped E2E on a direct `main` push, so the 23 E2E results above are local release evidence rather than CI evidence.
- The canonical Cloudflare deployment produced Worker version `46d5cff5-0836-4d78-b485-7636c0102d5d`. The live entry asset `/assets/index-8q8hLtrd.js` matched the local production build (SHA-256 `6e8e451a7b0f7148024ce287738e8d4f3416de61ec0346478b92d2e267c4ccd9`). `/api/health/schema` returned `200` with `ok: true`.
- Production UI smoke covered English creation, editing, local/cloud persistence, reload, calendar display, explicit sharing and a separate public page. The synthetic roster was then deleted and its public API returned 404. Existing user rosters were not changed. The user separately confirmed native WebMCP operation in Chrome/nekuda.

### Current production release (2026-09-01)

- Runtime implementation `fffe72d` is published on GitHub `main`. [GitHub Actions run 33479725803](https://github.com/hayashiii-ghub/toban-app/actions/runs/33479725803) passed formatting, type checking, lint, **871 coverage tests in 58 files**, the production build and **25 Playwright E2E tests** for that exact commit. E2E now runs on both pull requests and direct `main` pushes.
- Candidate-pool edits now reject removal or exclusion of the final eligible member atomically. An `update_schedule` retry with an omitted roster ID replays its first result even if the active tab changes, and mutation results no longer return the removed shared-roster sync note. Historical holiday dates from 1980 through 2027 match the Cabinet Office CSV.
- The canonical Cloudflare deployment produced Worker version `9c662bb0-45e7-4339-bd7f-3c163b0f31e9`. Cache-bypassed live HTML served `/assets/index-Bqcyg9Xy.js`, which matched the local production build (SHA-256 `40ef65e5c4265dbff1eba9f945981b1480e510a46d8d686600dc5666ba7407e3`). `/api/health/schema` returned `200` with `ok: true`.
- Fresh English production pages were visually checked at desktop and 390px widths with service workers blocked. The Getting started guide, `/junban` samples, FAQ, contact form and public-page layout rendered in English without horizontal overflow. This was read-only verification; no production roster was created or changed.

## What is new for the challenge

The pre-extension baseline is `e03ddbb` (2026-08-13). Toban already had sixteen WebMCP tools, including template-only creation and printing, before the challenge. This work adds complete custom-definition creation, targeted task edits, stable target resolution, strict errors, structured/paged read results, truthful local-save/publication outcomes and the state/sync protections needed for fast follow-up commands. The existing app and original tools are not presented as newly created for the event.

Review the fixed published range [`e03ddbb..fffe72d`](https://github.com/hayashiii-ghub/toban-app/compare/e03ddbb...fffe72d) for the challenge work. Existing-project eligibility and submission requirements must be checked against the [official challenge rules](https://webmcp.devpost.com/rules).

For the eventual public demo, keep one 90–100-second flow: detailed request → completed roster → one-line task correction → print preview. Use English narration and visible product output; keep tool-contract and failure-test details in this document. Recording, public YouTube upload and final submission remain separate actions. Production deployment, the UI/API smoke and user-confirmed production WebMCP operation are complete as recorded above.

License: MIT, as in the repository's existing `LICENSE`.
