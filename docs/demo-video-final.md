# Toban WebMCP demo video — final 120-second edit

Status: final master published on YouTube; final source release verified

Demo video: [https://youtu.be/4CSxh6WW51w](https://youtu.be/4CSxh6WW51w)

Live app: [https://toban.app/](https://toban.app/)

Source: [github.com/hayashiii-ghub/toban-app](https://github.com/hayashiii-ghub/toban-app)

Duration: 2:00

Format: 1920 × 1080, 30 fps, H.264 video with AAC audio, English narration and captions

Reviewed master: `Toban-WebMCP-Challenge-final.mp4`

SHA-256: `7859a787b8de03c0176ba64584835f0693ade96e952c6fb689595ce80ac27794`

Voice: HeyGen `Annie - Lifelike`, female American English

## Creative lock

**Title**

> Toban — Turn One Request into a Complete Duty Roster with WebMCP

**Core message**

> The agent interprets. Toban validates the roster and calculates the rotation. You stay in control.

The edit uses the real Toban and WebMCP-client recording as the main visual. It keeps cause and effect in recorded order, trims waiting and window-switch frames, and adds only restrained crops, captions, a short brand intro and a short brand close.

## Final sequence

| Time      | Picture and product evidence                                                                                                                    | Principal WebMCP evidence                                                  | Narration purpose                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:05 | Toban title and product footage                                                                                                                 | —                                                                          | One plain-language request becomes a complete editable roster.                                                           |
| 0:05–0:17 | Existing Toban UI remains visible                                                                                                               | 18 typed page tools                                                        | Establish that WebMCP uses Toban's real roster actions.                                                                  |
| 0:17–0:27 | The complete classroom request and structured call are shown together                                                                           | `create_schedule`, `change_view`                                           | Plain-language intent becomes structured roster actions; Toban owns supported-input validation and rotation calculation. |
| 0:27–0:48 | `Classroom Helpers` appears as a styled Table with Alex, Maya, Leo, Zoe and four separate duties                                                | Structured members, task groups, rotation, view, appearance and task emoji | Show one-request creation as a normal editable Toban roster.                                                             |
| 0:48–1:01 | Plant Care becomes Supply Check; appearance and task eligibility are changed without replacing the roster                                       | `get_schedule_details`, `update_schedule`, `configure_appearance`          | Show narrow follow-ups that preserve unrelated fields.                                                                   |
| 1:01–1:13 | `Library Desk Rotation` appears as September 2026 Calendar; weekends and Japanese holidays remain paused                                        | `create_schedule`, `change_view`                                           | Show Toban's three-eligible-day rotation calculation.                                                                    |
| 1:13–1:22 | September 24 is queried while the roster and displayed month remain unchanged                                                                   | `get_schedule_details`, `get_current_assignments`                          | Show a read-only answer calculated from saved rules.                                                                     |
| 1:22–1:30 | `Workshop Roles` appears as a manual Wheel and advances one step, from turn 0 to turn 1                                                         | `create_schedule`, `change_view`, `advance_rotation`                       | Show a non-date workflow and a precise state change.                                                                     |
| 1:30–1:41 | Structured assignments are verified; Zoe becomes Zoey while the Wheel and current turn remain                                                   | `get_schedule_details`, `get_current_assignments`, `update_member`         | Show verification after mutation and a narrow member edit.                                                               |
| 1:41–1:53 | The agent prepares sharing; Toban displays its confirmation dialog; the recording stops before any human publish action or public-link creation | `prepare_share`, visible confirmation, then agent stop                     | Make the publication boundary visible without implying publication.                                                      |
| 1:53–2:00 | Completed product footage and Toban end card                                                                                                    | —                                                                          | Restate responsibility: agent interprets, Toban validates and calculates, person controls publication.                   |

The visible client may perform additional reads. Do not claim that each scene has a fixed number of tool calls; the submission claim is that Toban exposes 18 typed tools in total.

## Demo rosters

### Classroom Helpers — Table and refinements

- Members: Alex, Maya, Leo, Zoe
- Initial duties: Materials, Whiteboard, Recycling, Plant Care
- Start: September 1, 2026
- Rotation: every eligible weekday
- Paused dates: Saturdays, Sundays and Japanese public holidays
- Initial presentation: Table
- Initial visual intent: cheerful and friendly for an elementary classroom
- Follow-ups shown: Plant Care → Supply Check; appearance-only change; ordered eligibility pools for selected duties

### Library Desk Rotation — Calendar and read-only query

- Members: Emma, Noah, Olivia, Liam
- Duties: Welcome Desk, Returns, Shelf Check, Reading Area
- Start: September 1, 2026
- Rotation: every three eligible days
- Paused dates: Saturdays, Sundays and Japanese public holidays
- Presentation: September 2026 Calendar
- Read-only query: assignment on September 24, 2026 without changing roster state or the displayed month

### Workshop Roles — manual Wheel

- Members: Alex, Maya, Leo, Zoe
- Duties: Facilitator, Timekeeper, Note Taker, Equipment Check
- Rotation: manual
- Presentation: Wheel (`disc` in the tool contract)
- Follow-ups shown: advance one turn; verify assignments from structured reads; rename Zoe to Zoey while preserving the Wheel and current turn

Use fictional names only. Printing and templates are omitted from the final edit.

## Exact final narration

> Toban turns one plain-language request into a complete, editable duty roster.
>
> Toban is a human-first roster app. For this challenge, I extended its Web M C P surface to eighteen typed tools, letting an agent use real roster actions directly on the page.
>
> Web M C P turns that plain-language intent into Toban's structured roster actions. Toban validates the supported roster definition and calculates the actual rotation.
>
> In one request, I specify the people, four separate duties, the start date, eligible weekdays, excluded holidays, the table view, and a classroom-friendly appearance. The agent passes that complete definition to Toban. Toban validates it, calculates the rotation, saves it, and returns a normal editable table.
>
> Short follow-ups change only the requested fields. Toban preserves the people and rotation rules while updating one duty, changing the visual style, or limiting who is eligible for a task.
>
> The same tools can create a library rotation that advances every three eligible days. Toban handles weekends and Japanese holidays, and the agent can query a future assignment without changing the roster.
>
> The answer comes from two read-only tools over Toban's saved rotation rules. It checks September twenty-four while the roster and displayed month stay completely unchanged.
>
> For work without dates, the agent creates a manual wheel. One follow-up advances the complete rotation by exactly one turn.
>
> After changing state, the agent verifies every assignment from structured details. A narrow member update then preserves the wheel and current turn.
>
> Publishing stays under human control. The agent can prepare the share step, but Toban stops at a visible confirmation. Nothing is published unless the person reviews the roster and decides to share it.
>
> The agent interprets. Toban validates the roster and calculates the rotation. You stay in control.

## Truthfulness boundaries

Each sequence must preserve the real order:

```text
natural-language request
→ actual page-defined WebMCP tool
→ actual Toban result
```

For public sharing, preserve the full boundary:

```text
prepare_share
→ Toban shows confirmation; applied is still false
→ the agent stops
→ the recording ends before any person publishes or any public URL exists
```

Do not describe `prepare_share` as publication. Do not show an edit token. Do not claim that the model calculates rotation dates, that a print request proves PDF creation, or that an unverified source revision is deployed.

## Final review and publication gate

1. Review the final export at normal speed and at the exact scene boundaries above. Check for frozen footage, mismatched captions, exposed window-switch frames, stale Getting started footage, accidental client branding, dead air and cropped controls.
2. Confirm audible narration through the closing line and continuous visual coverage from 0:00 through 2:00.
3. The application verification passed locally after the Hono 4.13.5 security update. Re-run it if source changes during final cleanup:

   ```sh
   corepack enable
   pnpm install --frozen-lockfile
   pnpm format:check
   pnpm check
   pnpm lint
   pnpm test:coverage
   pnpm build
   pnpm exec playwright install chromium  # first run only
   pnpm test:e2e
   ```

4. Final release implementation commit [`31bc66b`](https://github.com/hayashiii-ghub/toban-app/commit/31bc66bdf9ab3bd66aa6821f8812cf3b8f4891f9) passed [GitHub Actions run 33730776789](https://github.com/hayashiii-ghub/toban-app/actions/runs/33730776789), including formatting, type checking, lint, 878 coverage tests in 58 files, the production build, and 25 Playwright E2E tests. The canonical `pnpm run deploy:cf` command reported Worker version `874f43f0-baa9-41e5-a018-adc36bc5dd02`; Wrangler's paired follow-up deployment made version `ea5e3eda-4ed3-47ba-825c-0bd964f72d42` active. On 2026-09-03, cache-bypassed HTML from both `toban.app` and the `workers.dev` endpoint served `/assets/index-OHhWDdLY.js` (SHA-256 `7026cd50479148711e4c9403dafc5c4679ae313d96bace5793c69507b9332229`), and `/api/health/schema` returned `200` with `ok: true`.
5. YouTube upload: complete — [watch the public demo](https://youtu.be/4CSxh6WW51w). Submit the challenge entry only after the final source release evidence and public checks are complete.
