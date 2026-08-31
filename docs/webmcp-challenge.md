# Toban: describe a duty roster, then use it

Toban turns a chat request into an editable, printable duty roster on the page. A WebMCP-capable client interprets the request and calls Toban's domain tools. Toban does not embed a chatbot or require an LLM API key.

**Status: published at [toban.app](https://toban.app/) on 2026-08-31; not submitted to the challenge.** Local WebMCP conversations and production UI saving/sharing were verified separately. Production Chrome/nekuda WebMCP execution still needs a client confirmation: the Codex in-app connection did not discover production tools, and its Chrome connection did not expose a WebMCP capability. A public demo video and submission remain outstanding.

## Try the experience

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
- New date inputs are limited to 1980–2099, matching the existing holiday calculator's documented equinox range and bounding computation. The calculator uses Toban's existing modern Japanese holiday rules and 2020/2021 exceptions; it does not claim a complete historical legal calendar.
- Temporary absence, per-person weekday restrictions, simultaneous multi-person duties, shifts and optimization are unsupported. A client should explain the limitation before approximating a request. `update_member.skip` is persistent exclusion until changed back, never “today only.”
- Cards, table, calendar and disc remain the existing views. Disc retains its existing restrictions for rosters that cannot be represented as one wheel; the other views remain available.
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

Use `get_schedule_details` to inspect the overview and rotation conditions. `section: "members"` and `section: "groups"` return IDs and paged rows; group rows contain individual tasks or member-pool IDs. `get_current_assignments` maps group IDs to member IDs and identifies placements before the start date. `list_schedules` also supports pagination and exact-name filtering. Pass each `next_cursor` until null; pages remain valid JSON within a 1,500-character budget rather than clipping a string.

Edits accept an optional `schedule_id`; otherwise the active roster is resolved when the queued operation starts. `update_schedule.task_changes` changes only the named groups' tasks. Member operations accept a `member_id` or a unique exact name. An ambiguous name returns candidates and a paged lookup path, with no mutation. These IDs are tool data, not new labels in the normal UI.

Results are JSON inside the existing MCP-compatible text content. Mutations return `ok`, `code`, `schedule_id`, `applied`, `summary` and `persistence`. Read tools also provide structured JSON instead of the earlier prose-only output; clients that parsed that prose must adapt.

- `INVALID_INPUT`, `AMBIGUOUS_TARGET`, `NOT_FOUND`, `EDIT_IN_PROGRESS`: no mutation.
- `PERSISTENCE_FAILED` with `applied: true`: the page changed but the device could not save it. Keep the page open and inspect the existing roster rather than creating a duplicate. The UI also shows the failure.
- Local and cloud statuses are separate. Cloud status may be pending, syncing, synced, error or unknown; the response does not wait for a five-second private backup.
- `request_id` replays a prior creation result only during the current page registration lifetime. Reusing it with different content is rejected. Navigation/reload resets this map; inspect the roster list after an uncertain outcome instead of blindly retrying.

Writes and reads share a per-registration queue. React commits and the local save attempt finish before a mutation resolves. Editors and sharing dialogs block tool writes without closing a human draft. View switching commits before a print request, and print CSS removes entrance-animation transparency from printable content. Backup responses merge identity into the original roster without replacing later edits; pulls verify the original content again; same-roster cloud PUTs are serialized.

## Publication and untrusted input

Creating a roster does not publish it. Toban retains its existing private automatic backup. A backup slug alone is not a public URL: `get_share_link` verifies a public GET and distinguishes not published from a failed verification request. It never calls the publish endpoint. Intentional publication remains the user's Share button operation. Edits to an already published roster can synchronize to that public link.

Tool output never includes edit tokens. User-entered roster/member/task text is data and carries `untrustedContentHint`; reads carry `readOnlyHint`. Hints are advisory, not an injection defense by themselves. Strict runtime validation and the absence of a publication tool preserve application boundaries. Tool exposure keeps the default same-origin behavior. These choices follow the [WebMCP security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools).

## Verification

```sh
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Final local checks: **708 unit tests in 52 files and 19 Playwright E2E tests passed**. Type checking, lint, formatting and production build also passed. The build retains a warning for a JavaScript chunk larger than 500 kB; no unrelated bundle refactor was included.

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

- Removed redundant member/group/rotation conditions below the title; the existing editor retains the settings. Local-save failure and shared-roster notices remain.
- Aligned guide/task-card descriptions across neighboring cards with different title wrapping; desktop and mobile visual checks passed.
- The user's first nekuda run used a four-day interval; the later correction to one eligible day succeeded. The original raw request/tool arguments are unavailable, so this does not establish a calculation bug. The shared tool schema and descriptions now distinguish the interval between assignments from roster size/full-round duration. No automatic rewriting of a legitimate four-day interval was added.
- Added runtime rejection of intervals over 365 before mutation, matching the existing cloud API. Both create/configure regressions failed before the fix and passed afterward.
- Unsent cloud edits now leave a durable ID-only recovery marker. After reopening the page, the existing locally saved body is sent before any server pull; rejected writes remain protected without endless retries. Deletion clears recovery markers. Storage must be available for cross-reload protection.
- Three additional source-blind local WebMCP conversations passed: Japanese and English weekday rotation, plus an explicit four-eligible-day rotation. Inputs, returned settings and September 1/2/7 calendar cells matched. One initial development hot-reload tool handle was refreshed; this is not a measured nekuda error rate.
- The deployment command now explicitly selects remote D1. Before deployment, the live schema and migration history are checked to avoid re-adding columns already created by the runtime safety net.

### Production release evidence

- Source through `3434825` was fast-forwarded to GitHub `main`; its GitHub CI passed. The final code passed 708 unit tests in 52 files, all 19 E2E tests, type checking, lint, formatting and the production build.
- The canonical `pnpm run deploy:cf` deployed Worker version `2b3a4907-e00c-47be-83d9-c3503e88fca3`; the repository-connected automatic deployment subsequently produced `1018ad45-ae23-4ef6-a8e0-f76e73906ee0` from the same code. The live entry asset `/assets/index-Bb3RBHUJ.js` matched the local build byte for byte (SHA-256 `72cfabea6273377195a0483c631d334a27ef7df4d3095293d609ea4f164f3ed4`).
- The live `is_public INTEGER NOT NULL DEFAULT 0` column already existed via the runtime schema safety net, while migration 0005 was missing from history. After checking the exact column definition and recording a D1 Time Travel bookmark, a conditional insertion reconciled only that completed migration record. Normal deployment then applied 0006's index. No existing roster contents or publication flags were changed. The remote migration list is empty and `/api/health/schema` returns 200 with `ok: true`.
- A synthetic two-person roster was created through the production editor, saved to cloud, reloaded, changed from plant watering to supplies and intentionally shared. Its separate public page and public API showed the saved content. A subsequent edit also reached the public URL while preserving the other task and daily rotation settings. A fresh 390px-wide shared page had no horizontal overflow. The visible Print button was invoked without page errors; the native dialog is not observable through this connection.
- The synthetic roster was deleted through the UI after verification. Its public API then returned 404. No user roster was edited or deleted.
- A previously open browser initially retained the old service-worker page; a further normal reload loaded the current asset. No cache or browser storage was cleared. Production WebMCP client confirmation remains separate from these UI/API checks.

## What is new for the challenge

The pre-extension baseline is `e03ddbb` (2026-08-13). Toban already had sixteen WebMCP tools, including template-only creation and printing, before the challenge. This work adds complete custom-definition creation, targeted task edits, stable target resolution, strict errors, structured/paged read results, truthful local-save/publication outcomes and the state/sync protections needed for fast follow-up commands. The existing app and original tools are not presented as newly created for the event.

The implementation branch is `codex/toban-webmcp-chat-creation`. Review its dated commits/diff against `e03ddbb` for the new work. Existing-project eligibility and submission requirements must be checked against the [official challenge rules](https://webmcp.devpost.com/rules).

For the eventual public demo, keep one 90–100-second flow: detailed request → completed roster → one-line task correction → print preview. Use English narration and visible product output; keep tool-contract and failure-test details in this document. Recording, public YouTube upload, production WebMCP client confirmation and final submission remain separate actions. Production deployment and the UI/API smoke are complete as recorded above.

License: MIT, as in the repository's existing `LICENSE`.
