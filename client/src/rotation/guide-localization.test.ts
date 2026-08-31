import { describe, expect, it } from "vitest";
import type { AppState, Schedule } from "./types";
import { DEFAULT_APP_STATE, DEFAULT_APP_STATE_EN } from "./defaultState";
import {
  applyLocalizedGuideUpdate,
  isOriginalGuide,
  localizeGuide,
  localizeGuideState,
} from "./guide-localization";

const guideJa = DEFAULT_APP_STATE.schedules[0];
const guideEn = DEFAULT_APP_STATE_EN.schedules[0];

function oldEnglishGuide(): Schedule {
  const guide = structuredClone(guideEn);
  guide.name = "Getting Started";
  guide.groups[0].tasks[1] = "Choose any roster from the Template button";
  guide.groups[1].tasks[1] = "Tap a name or task to change it freely";
  guide.groups[3].tasks[1] =
    "When you're done, print, save as PDF, or share by URL";
  return guide;
}

function withoutText(schedule: Schedule) {
  return {
    ...schedule,
    name: "",
    groups: schedule.groups.map(group => ({ ...group, tasks: [] })),
    members: schedule.members.map(member => ({ ...member, name: "" })),
  };
}

describe("original guide localization", () => {
  it.each([
    ["Japanese", guideJa],
    ["English", guideEn],
    ["historical English", oldEnglishGuide()],
  ] as const)(
    "projects the complete %s guide into either language",
    (_, source) => {
      const before = structuredClone(source);
      expect(isOriginalGuide(source)).toBe(true);
      expect(localizeGuide(source, "ja")).toEqual(guideJa);
      expect(localizeGuide(source, "en")).toEqual(guideEn);
      expect(source).toEqual(before);
    }
  );

  it("keeps the reference when the guide is already in the selected language", () => {
    expect(localizeGuide(guideJa, "ja")).toBe(guideJa);
    expect(localizeGuide(guideEn, "en")).toBe(guideEn);
  });

  it("preserves cloud identity, appearance and rotation without mutating the saved guide", () => {
    const source = structuredClone(guideJa);
    source.rotation = 3;
    source.pinned = true;
    source.slug = "shared-guide";
    source.editToken = "synthetic-token";
    source.assignmentMode = "member";
    source.designThemeId = "mochimochi/sakura";
    source.rotationConfig = {
      mode: "date",
      startDate: "2026-09-01",
      cycleDays: 4,
      skipSaturday: true,
      skipSunday: true,
      skipHolidays: true,
    };
    source.groups[0].emoji = "🌟";
    source.members[0].color = "#000000";
    source.members[0].bgColor = "#eeeeee";
    source.members[0].textColor = "#111111";
    source.members[0].skipped = true;
    const before = structuredClone(source);

    const projected = localizeGuide(source, "en");
    expect(isOriginalGuide(source)).toBe(true);
    expect(projected.name).toBe("Getting started");
    expect(projected.groups[0].tasks).toEqual(guideEn.groups[0].tasks);
    expect(projected.members[0].name).toBe("Step 1");
    expect(withoutText(projected)).toEqual(withoutText(source));
    expect(localizeGuide(projected, "ja")).toEqual(source);
    expect(source).toEqual(before);
  });

  const customizations: Array<[string, (schedule: Schedule) => void]> = [
    [
      "a copied or ordinary roster ID",
      s => {
        s.id = "s_copy";
      },
    ],
    [
      "a custom title",
      s => {
        s.name = "My own guide";
      },
    ],
    [
      "a changed task heading",
      s => {
        s.groups[0].tasks[0] = "My task";
      },
    ],
    [
      "a changed task description",
      s => {
        s.groups[0].tasks[1] = "My instructions";
      },
    ],
    [
      "a changed member name",
      s => {
        s.members[0].name = "Alex";
      },
    ],
    [
      "a changed group ID",
      s => {
        s.groups[0].id = "g_custom";
      },
    ],
    [
      "a changed member ID",
      s => {
        s.members[0].id = "m_custom";
      },
    ],
    [
      "reordered groups",
      s => {
        s.groups.reverse();
      },
    ],
    [
      "reordered members",
      s => {
        s.members.reverse();
      },
    ],
    [
      "an added task",
      s => {
        s.groups[0].tasks.push("Extra task");
      },
    ],
    [
      "a removed task",
      s => {
        s.groups[0].tasks.pop();
      },
    ],
    [
      "a removed group",
      s => {
        s.groups.pop();
      },
    ],
    [
      "an added group",
      s => {
        s.groups.push({ id: "g_extra", tasks: ["Extra"], emoji: "📌" });
      },
    ],
    [
      "a removed member",
      s => {
        s.members.pop();
      },
    ],
    [
      "an added member",
      s => {
        s.members.push({ ...s.members[0], id: "m_extra" });
      },
    ],
    [
      "a custom assignment pool",
      s => {
        s.groups[0].memberIds = ["m1", "m2"];
      },
    ],
    [
      "mixed-language text",
      s => {
        s.groups[0].tasks = [...guideEn.groups[0].tasks];
      },
    ],
  ];

  it.each(customizations)("leaves %s untouched", (_, customize) => {
    const source = structuredClone(guideJa);
    customize(source);
    const before = structuredClone(source);

    expect(isOriginalGuide(source)).toBe(false);
    expect(localizeGuide(source, "ja")).toBe(source);
    expect(localizeGuide(source, "en")).toBe(source);
    expect(source).toEqual(before);
  });

  it("does not mistake a partially edited historical guide for an original", () => {
    const source = oldEnglishGuide();
    source.groups[0].tasks[1] = guideEn.groups[0].tasks[1];
    expect(isOriginalGuide(source)).toBe(false);
    expect(localizeGuide(source, "ja")).toBe(source);
  });

  it("does not alias projected text to the source or the built-in defaults", () => {
    const source = structuredClone(guideJa);
    const beforeJa = structuredClone(guideJa);
    const beforeEn = structuredClone(guideEn);
    const projected = localizeGuide(source, "en");
    projected.groups[0].tasks[0] = "A customized task";
    projected.members[0].name = "A customized name";

    expect(source).toEqual(guideJa);
    expect(guideJa).toEqual(beforeJa);
    expect(guideEn).toEqual(beforeEn);
    expect(isOriginalGuide(projected)).toBe(false);
  });
});

describe("guide state projection and updates", () => {
  function savedState(): AppState {
    const guide = structuredClone(guideJa);
    guide.slug = "shared-guide";
    guide.editToken = "synthetic-token";
    return {
      schedules: [
        guide,
        { ...structuredClone(guideJa), id: "s_custom", name: "My roster" },
      ],
      activeScheduleId: guide.id,
    };
  }

  it("projects all guide text while preserving other schedules and selection", () => {
    const state = savedState();
    state.activeScheduleId = "s_custom";
    const before = structuredClone(state);
    const visible = localizeGuideState(state, "en");

    expect(visible.activeScheduleId).toBe("s_custom");
    expect(visible.schedules[0].name).toBe("Getting started");
    expect(visible.schedules[0].groups).toEqual(guideEn.groups);
    expect(visible.schedules[1]).toBe(state.schedules[1]);
    expect(state).toEqual(before);
    expect(localizeGuideState(state, "ja")).toBe(state);
    expect(localizeGuideState(visible, "en")).toBe(visible);
  });

  it("keeps a no-op at the original state reference", () => {
    const state = savedState();
    expect(
      applyLocalizedGuideUpdate(state, "en", visible => {
        expect(visible.schedules[0].name).toBe("Getting started");
        return visible;
      })
    ).toBe(state);
  });

  it("changes the selection without saving projected guide text", () => {
    const state = savedState();
    const next = applyLocalizedGuideUpdate(state, "en", visible => ({
      ...visible,
      activeScheduleId: "s_custom",
    }));

    expect(next.activeScheduleId).toBe("s_custom");
    expect(next.schedules[0]).toBe(state.schedules[0]);
    expect(next.schedules[1]).toBe(state.schedules[1]);
  });

  it("edits another roster without rewriting the saved guide", () => {
    const state = savedState();
    const next = applyLocalizedGuideUpdate(state, "en", visible => ({
      ...visible,
      schedules: visible.schedules.map(schedule =>
        schedule.id === "s_custom"
          ? { ...schedule, name: "Edited roster" }
          : schedule
      ),
    }));

    expect(next.schedules[1].name).toBe("Edited roster");
    expect(next.schedules[0]).toBe(state.schedules[0]);
  });

  it("preserves rotation and style updates while restoring the saved guide text", () => {
    const state = savedState();
    const next = applyLocalizedGuideUpdate(state, "en", visible => ({
      ...visible,
      schedules: visible.schedules.map(schedule =>
        schedule.id === "s_default_1"
          ? {
              ...schedule,
              rotation: 2,
              pinned: true,
              designThemeId: "mochimochi/sakura",
              members: schedule.members.map((member, index) =>
                index === 0 ? { ...member, color: "#112233" } : member
              ),
            }
          : schedule
      ),
    }));
    const guide = next.schedules[0];

    expect(guide).toMatchObject({
      name: "はじめてガイド",
      rotation: 2,
      pinned: true,
      designThemeId: "mochimochi/sakura",
      slug: "shared-guide",
      editToken: "synthetic-token",
    });
    expect(guide.groups).toEqual(guideJa.groups);
    expect(guide.members.map(member => member.name)).toEqual(
      guideJa.members.map(member => member.name)
    );
    expect(guide.members[0].color).toBe("#112233");
    expect(state.schedules[0].rotation).toBe(0);
  });

  it("keeps a real guide text edit based on the language shown to the user", () => {
    const state = savedState();
    const next = applyLocalizedGuideUpdate(state, "en", visible => ({
      ...visible,
      schedules: visible.schedules.map(schedule =>
        schedule.id === "s_default_1"
          ? {
              ...schedule,
              groups: schedule.groups.map((group, index) =>
                index === 0
                  ? {
                      ...group,
                      tasks: ["My instructions", ...group.tasks.slice(1)],
                    }
                  : group
              ),
            }
          : schedule
      ),
    }));
    const guide = next.schedules[0];

    expect(guide.name).toBe("Getting started");
    expect(guide.groups[0].tasks).toEqual([
      "My instructions",
      guideEn.groups[0].tasks[1],
    ]);
    expect(guide.members).toEqual(guideEn.members);
    expect(guide.slug).toBe("shared-guide");
    expect(isOriginalGuide(guide)).toBe(false);
    expect(localizeGuide(guide, "ja")).toBe(guide);
    expect(state.schedules[0].name).toBe("はじめてガイド");
  });

  it("lets a copied guide retain displayed content under its new ID", () => {
    const state = savedState();
    const next = applyLocalizedGuideUpdate(state, "en", visible => ({
      ...visible,
      schedules: [
        ...visible.schedules,
        { ...visible.schedules[0], id: "s_copy", name: "Guide copy" },
      ],
      activeScheduleId: "s_copy",
    }));

    expect(next.schedules[0]).toBe(state.schedules[0]);
    expect(next.schedules[2].name).toBe("Guide copy");
    expect(next.schedules[2].members).toEqual(guideEn.members);
  });

  it("passes updates through unchanged when no guide projection is needed", () => {
    const state = savedState();
    const updated = { ...state, activeScheduleId: "s_custom" };
    expect(
      applyLocalizedGuideUpdate(state, "ja", visible => {
        expect(visible).toBe(state);
        return updated;
      })
    ).toBe(updated);
  });
});
