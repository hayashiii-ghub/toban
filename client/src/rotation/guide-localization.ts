import type { Locale } from "@/i18n/core";
import type { AppState, Schedule } from "./types";
import { DEFAULT_APP_STATE, DEFAULT_APP_STATE_EN } from "./defaultState";

const GUIDE_JA = DEFAULT_APP_STATE.schedules[0];
const GUIDE_EN = DEFAULT_APP_STATE_EN.schedules[0];

// This English copy was seeded before the English UI polish. Recognize the
// complete historical version, rather than guessing from its title alone.
const LEGACY_GUIDE_EN: Schedule = {
  ...GUIDE_EN,
  name: "Getting Started",
  groups: GUIDE_EN.groups.map((group, index) => ({
    ...group,
    tasks: [
      ["Pick a template", "Choose any roster from the Template button"],
      ["Edit members & tasks", "Tap a name or task to change it freely"],
      ["Advance the rotation", "Use the ◀ ▶ buttons to switch who's on duty"],
      [
        "Print or share",
        "When you're done, print, save as PDF, or share by URL",
      ],
    ][index],
  })),
};

const ORIGINAL_GUIDES = [GUIDE_JA, GUIDE_EN, LEGACY_GUIDE_EN];

function sameStrings(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function matchesGuide(schedule: Schedule, guide: Schedule): boolean {
  return (
    schedule.id === "s_default_1" &&
    schedule.name === guide.name &&
    schedule.groups.length === guide.groups.length &&
    schedule.members.length === guide.members.length &&
    schedule.groups.every((group, index) => {
      const original = guide.groups[index];
      return (
        group.id === original.id &&
        sameStrings(group.tasks, original.tasks) &&
        sameStrings(group.memberIds ?? [], original.memberIds ?? [])
      );
    }) &&
    schedule.members.every((member, index) => {
      const original = guide.members[index];
      return member.id === original.id && member.name === original.name;
    })
  );
}

/** Only the original guide's known, unedited text and structure may be projected. */
export function isOriginalGuide(schedule: Schedule): boolean {
  return ORIGINAL_GUIDES.some(guide => matchesGuide(schedule, guide));
}

/**
 * A display projection, never a storage migration. Keep cloud identity, rotation,
 * appearance and other metadata untouched; customized text is never translated.
 */
export function localizeGuide(schedule: Schedule, locale: Locale): Schedule {
  const target = locale === "en" ? GUIDE_EN : GUIDE_JA;
  if (!isOriginalGuide(schedule) || matchesGuide(schedule, target)) {
    return schedule;
  }

  return {
    ...schedule,
    name: target.name,
    groups: schedule.groups.map((group, index) => ({
      ...group,
      tasks: [...target.groups[index].tasks],
    })),
    members: schedule.members.map((member, index) => ({
      ...member,
      name: target.members[index].name,
    })),
  };
}

/** Project only built-in guide text; preserve the state reference when unchanged. */
export function localizeGuideState(state: AppState, locale: Locale): AppState {
  const schedules = state.schedules.map(schedule =>
    localizeGuide(schedule, locale)
  );
  return schedules.every(
    (schedule, index) => schedule === state.schedules[index]
  )
    ? state
    : { ...state, schedules };
}

/**
 * Commands see the displayed language. Selection, rotation and other metadata
 * updates keep the original stored text; a real content edit retains the
 * displayed language as the basis of the now-customized roster.
 */
export function applyLocalizedGuideUpdate(
  state: AppState,
  locale: Locale,
  updater: (visible: AppState) => AppState
): AppState {
  const visible = localizeGuideState(state, locale);
  const next = updater(visible);
  if (next === visible) return state;
  if (visible === state) return next;

  const rawById = new Map(
    state.schedules.map(schedule => [schedule.id, schedule])
  );
  const visibleById = new Map(
    visible.schedules.map(schedule => [schedule.id, schedule])
  );
  let restored = false;
  const schedules = next.schedules.map(schedule => {
    const raw = rawById.get(schedule.id);
    const projected = visibleById.get(schedule.id);
    if (!raw || !projected || raw === projected) return schedule;
    if (schedule === projected) {
      restored = true;
      return raw;
    }
    if (!isOriginalGuide(schedule)) return schedule;

    restored = true;
    return {
      ...schedule,
      name: raw.name,
      groups: schedule.groups.map((group, index) => ({
        ...group,
        tasks: [...raw.groups[index].tasks],
      })),
      members: schedule.members.map((member, index) => ({
        ...member,
        name: raw.members[index].name,
      })),
    };
  });
  return restored ? { ...next, schedules } : next;
}
