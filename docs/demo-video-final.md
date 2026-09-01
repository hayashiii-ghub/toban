# Toban WebMCP demo video — final shooting plan

Status: production-ready shooting plan, not yet recorded  
Verified against: `main` at `f8ec0d6` and the production ChatGPT in-app browser on 2026-09-01  
Target duration: 1:54 (acceptable range: 1:51–1:57)  
Format: 1920 × 1080, 16:9, English UI, English narration and captions

## Creative lock

**Title**

> Toban — Turn One Request into a Complete Duty Roster with WebMCP

**Core message**

> The agent interprets. Toban validates. You stay in control.

**Demo roster**

- Name: `Classroom Helpers`
- Members: Alex, Maya, Leo, Zoe
- Duties: Materials, Whiteboard, Recycling, Plant Care
- Start: September 1, 2026
- Rotation: every eligible weekday
- Paused dates: Saturdays, Sundays and Japanese public holidays
- Initial view: Table
- Appearance intent: cheerful and friendly for an elementary classroom
- Expected agent choice: Handwriting / Sunflower / Soft
- Follow-up edit: Plant Care → Supply Check

Use fictional names only. Do not introduce a second roster, printing, templates, the wheel view, implementation internals or test counts.

## Exact prompts

### 1. Create the roster

> Create a roster called Classroom Helpers for Alex, Maya, Leo, and Zoe. Use four separate duties, one per person each turn: Materials, Whiteboard, Recycling, and Plant Care. Start on September 1, 2026, rotate every eligible weekday, pause on Saturdays, Sundays, and Japanese holidays, and show it as a table. Choose a cheerful, friendly visual style for an elementary classroom, including the font, color, and texture.

Expected minimum sequence:

```text
create_schedule
→ change_view
```

The client may perform additional reads. Do not claim a fixed number of tool calls.

### 2. Make one targeted change

> Replace Plant Care with Supply Check.

Expected minimum sequence:

```text
get_schedule_details
→ update_schedule
```

### 3. Show the date calculation

> Show this roster as a calendar for September 2026.

Expected call:

```text
change_view
```

The call should select `calendar` with month `2026-09`.

### 4. Prepare sharing

> Share this roster with the class.

Expected call:

```text
prepare_share
```

The tool only opens confirmation. The person recording must click **Share schedule** in Toban.

### 5. Verify publication

> Verify the public link.

Expected call:

```text
get_share_link
```

## Timeline

| Time      | Picture and action                                                                                                                                                                                                                 | Evidence retained                                                                                  | Narration                                                                                                                                                                                         | Proof overlay                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 0:00–0:08 | Start with the clean English Toban page and a new English-only ChatGPT task. The first request is pasted but not yet sent.                                                                                                         | Existing Toban product and a clean first request                                                   | **Toban is a human-first duty-roster app. For this challenge, I exposed its live domain model to agents through WebMCP.**                                                                         | `Human-first app + typed WebMCP domain tools`                                      |
| 0:08–0:18 | Hold on the complete request for two seconds, then send it.                                                                                                                                                                        | People, duties, date, rotation, excluded days, view and visual intent are readable                 | **In one request, I describe the people, duties, rotation rules, view, and the feeling the roster should have.**                                                                                  | `One natural-language request`                                                     |
| 0:18–0:32 | Keep the real `create_schedule` and `change_view` tool cards and the resulting Table view in one continuous cause-and-effect sequence. Briefly reveal the structured `members`, `task_groups`, `rotation` and `appearance` fields. | Real typed calls and the completed styled, editable roster                                         | **The agent chooses a fitting font, color, and texture along with the roster definition. Toban validates everything, calculates the rotation, saves it, and renders the result.**                 | `Agent · interprets intent` then `Toban · validates · calculates · saves`          |
| 0:32–0:42 | Hold on the completed Table long enough to read the four people, four duties and rotation columns.                                                                                                                                 | `Classroom Helpers` as a normal Toban roster                                                       | **This is not a generated answer. It is the same roster people can still inspect and edit in the app.**                                                                                           | `A normal, editable Toban roster`                                                  |
| 0:42–0:58 | Send the edit request. Retain `get_schedule_details` and `update_schedule`, then zoom briefly to the changed row.                                                                                                                  | Plant Care alone becomes Supply Check; people, dates and rotation remain unchanged                 | **For the follow-up, the agent reads the roster's structured details and replaces only Plant Care. The people, dates, and rotation rules stay unchanged.**                                        | `Structured read → targeted update` then `Plant Care → Supply Check`               |
| 0:58–1:16 | Send the calendar request. Show `change_view`, then zoom to September 18–24. September 21–23 have holiday labels and no assignments; September 24 resumes at the next eligible turn.                                               | Toban's calendar calculation and the three-day Japanese holiday pause                              | **When I ask for September, Toban—not the model—computes the calendar. Weekends and Japan's September twenty-first through twenty-third holidays pause the rotation without advancing the turn.** | `Schedule logic runs in Toban—not in the model` then `Sep 21–23 · rotation paused` |
| 1:16–1:34 | Send the sharing request and show `prepare_share`. Keep the confirmation and the result `CONFIRMATION_REQUIRED`, `applied: false` visible. Without a cut, move the human cursor to **Share schedule** and click.                   | The agent requests sharing, but publication remains unchanged until the visible human confirmation | **Public sharing has a different boundary. The WebMCP tool opens this confirmation, but it does not publish. I review the roster and choose Share schedule in the page.**                         | `Agent · requests sharing` then `Human · publishes in the page`                    |
| 1:34–1:46 | Ask to verify the link. Show the real `get_share_link` card, `publication: public` and the verified view-only URL.                                                                                                                 | Publication verification occurs only after the human action                                        | **Only after that human action can the agent verify that the public link is live.**                                                                                                               | `Website · public link verified`                                                   |
| 1:46–1:54 | Keep the finished `Classroom Helpers` roster visible and add the restrained Toban end card.                                                                                                                                        | Final product state                                                                                | **The agent interprets. Toban validates. You stay in control.**                                                                                                                                   | `The agent interprets.` / `Toban validates.` / `You stay in control.`              |

## Final narration

> Toban is a human-first duty-roster app. For this challenge, I exposed its live domain model to agents through WebMCP.
>
> In one request, I describe the people, duties, rotation rules, view, and the feeling the roster should have.
>
> The agent chooses a fitting font, color, and texture along with the roster definition. Toban validates everything, calculates the rotation, saves it, and renders the result.
>
> This is not a generated answer. It is the same roster people can still inspect and edit in the app.
>
> For the follow-up, the agent reads the roster's structured details and replaces only Plant Care. The people, dates, and rotation rules stay unchanged.
>
> When I ask for September, Toban—not the model—computes the calendar. Weekends and Japan's September twenty-first through twenty-third holidays pause the rotation without advancing the turn.
>
> Public sharing has a different boundary. The WebMCP tool opens this confirmation, but it does not publish. I review the roster and choose Share schedule in the page.
>
> Only after that human action can the agent verify that the public link is live.
>
> The agent interprets. Toban validates. You stay in control.

The narration is 183 spoken words. Read calmly and leave short silent gaps for the viewer to inspect each result.

## Recording setup

- Record the production site at `https://toban.app/`.
- Record in a new, clean ChatGPT task with Toban open in the in-app browser. Do not record the implementation or debugging task.
- Use English for the UI, roster content, agent conversation, narration and captions.
- Use a clean browser state. Close onboarding and remove any earlier `Classroom Helpers` roster before recording.
- Keep the Getting started guide only if removing it would make the starting state look unnatural; do not open it during the demo.
- Use 1920 × 1080, browser zoom 100%, hidden bookmark bar and disabled notifications.
- Set the ChatGPT window to 1512 × 850 before capture. The Cap Window export was locally verified at 1920 × 1080, 30 fps with this geometry; the current preparation task is not final footage.
- Keep Toban at roughly 70–75% of the frame and the agent/tool evidence at 25–30%.
- Keep the full natural-language request, the real WebMCP tool name and the resulting Toban change contiguous in every beat.
- Record creation through link verification as one continuous master session. Capture two or three complete takes, choose the most stable one, and trim only inactive waits in Cap so roster identity, publication state and tool history stay consistent.
- Cut waiting time and long agent prose. Do not replace real tool execution with fabricated JSON or a simulated success state.
- The production ChatGPT in-app browser is the primary recording path. It was verified with the previous 17-tool release and a successful real WebMCP call on `f8ec0d6`; re-verify the new 18-tool appearance release before recording. Chrome with nekuda remains the fallback.
- Reload the production tab twice, or close and reopen it, before the preflight check so an older service-worker asset cannot survive into the take.
- In a separate preflight task, run `list_schedules` without making changes. Start the take only when `Getting started` is the sole roster and `Classroom Helpers` does not exist.
- Keep client branding, logos and mascots outside the final frame. If the verified client cannot be framed or cropped without retaining an unlicensed third-party mark, obtain permission or use another verified client.
- Keep full narration subtitles in a fixed lower-third area, at no more than two lines. Show at most one proof overlay at a time in a separate upper area; use proof overlays only for real tool names, the changed duty and the paused-date result.
- Use no unlicensed music, third-party logos or mascots. Do not add a fake client label or fabricated interface.
- Use only the default view-only sharing tab. Never expose or select the edit-link tab or edit token.

## Rehearsal acceptance checks

- `Classroom Helpers` does not already exist before the first take.
- Creation produces four separate rows and four members in Table view.
- The Start column is Materials=Alex, Whiteboard=Maya, Recycling=Leo, Plant Care=Zoe.
- The targeted edit changes only Plant Care to Supply Check.
- September 21, 22 and 23 show English Japanese-holiday labels and no assignments.
- September 24 resumes one turn after September 18; the paused dates do not advance the rotation.
- `prepare_share` reports confirmation required and does not publish before the click.
- The human click on **Share schedule** is visible in the uninterrupted footage.
- `get_share_link` runs only after confirmation and reports a public view-only URL.
- The verified public URL is opened and shows the same `Classroom Helpers` roster.
- The resulting public roster remains available through the judging period if its URL is shown in the video.
- The final export targets 1:54 and remains within 1:51–1:57.
- The final export includes audible English narration and contains no unlicensed third-party trademarks or copyrighted music.

## Editing boundaries

Permitted edits: trim inactive waits, add gentle crops or push-ins, add concise captions, normalize narration volume and remove accidental dead air.

Do not reorder cause and effect. Each sequence must remain visibly truthful:

```text
natural-language request
→ actual WebMCP tool name
→ actual Toban result
```

For sharing, preserve the full boundary:

```text
prepare_share
→ confirmation appears
→ person clicks Share schedule
→ get_share_link verifies publication
```
