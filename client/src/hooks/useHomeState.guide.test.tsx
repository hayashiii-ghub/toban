import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { LanguageProvider, useLocale } from "@/i18n";
import { STORAGE_KEY } from "@/rotation/constants";
import {
  DEFAULT_APP_STATE,
  DEFAULT_APP_STATE_EN,
} from "@/rotation/defaultState";
import type { AppState } from "@/rotation/types";
import { createSchedule, updateSchedule, publishSchedule } from "@/lib/api";
import { clearPendingSync } from "@/lib/syncManager";
import { useHomeState } from "./useHomeState";
import { buildTobanTools } from "./useTobanTools";

vi.mock("@/lib/api", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  getScheduleForEdit: vi.fn(() => new Promise(() => {})),
  publishSchedule: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState({}, "", "/");
  localStorage.setItem("toban-lang", "en");
  vi.mocked(createSchedule).mockResolvedValue({
    slug: "guide-test",
    editToken: "synthetic-token",
  });
  vi.mocked(updateSchedule).mockResolvedValue(undefined);
  vi.mocked(publishSchedule).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  clearPendingSync("s_default_1");
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function seedGuide(cloud = false): AppState {
  const state = structuredClone(DEFAULT_APP_STATE);
  if (cloud)
    Object.assign(state.schedules[0], {
      slug: "existing-guide",
      editToken: "synthetic-token",
    });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function renderHome() {
  return renderHook(() => ({ home: useHomeState(), language: useLocale() }), {
    wrapper: LanguageProvider,
  });
}

function savedState(): AppState {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!);
}

describe("built-in guide language", () => {
  it("localizes an existing backed-up guide without saving or syncing the translation", async () => {
    vi.useFakeTimers();
    seedGuide(true);
    const { result } = renderHome();
    const saved = localStorage.getItem(STORAGE_KEY);

    expect(result.current.home.activeSchedule).toMatchObject({
      ...DEFAULT_APP_STATE_EN.schedules[0],
      slug: "existing-guide",
    });
    expect(result.current.home.getToolState()).toEqual(
      result.current.home.state
    );
    act(() => result.current.language.setLocale("ja"));
    expect(result.current.home.activeSchedule?.name).toBe("はじめてガイド");
    act(() => result.current.language.setLocale("en"));
    expect(result.current.home.activeSchedule?.groups[3].tasks).toEqual(
      DEFAULT_APP_STATE_EN.schedules[0].groups[3].tasks
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
    expect(createSchedule).not.toHaveBeenCalled();
    expect(updateSchedule).not.toHaveBeenCalled();
  });

  it.each(["edited guide", "ordinary roster"])(
    "preserves an %s when switching languages",
    kind => {
      const state = seedGuide();
      if (kind === "edited guide")
        state.schedules[0].groups[0].tasks[0] = "私の手順";
      else state.schedules[0].id = state.activeScheduleId = "my-roster";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      const { result } = renderHome();

      expect(result.current.home.activeSchedule).toEqual(state.schedules[0]);
      act(() => result.current.language.setLocale("ja"));
      act(() => result.current.language.setLocale("en"));
      expect(result.current.home.activeSchedule).toEqual(state.schedules[0]);
    }
  );

  it("gives tools localized content while persisting only explicit content edits", async () => {
    seedGuide();
    const { result } = renderHome();

    await act(async () => {
      const outcome = await result.current.home.commitToolState(state => ({
        ...state,
        schedules: state.schedules.map(s => ({ ...s, rotation: 1 })),
      }));
      expect(outcome.state.schedules[0].name).toBe("Getting started");
    });
    expect(savedState().schedules[0]).toMatchObject({
      name: "はじめてガイド",
      rotation: 1,
    });

    await act(async () => {
      await result.current.home.commitToolState(state => ({
        ...state,
        schedules: state.schedules.map(s => ({
          ...s,
          name: "My instructions",
        })),
      }));
    });
    expect(savedState().schedules[0]).toMatchObject({
      name: "My instructions",
      members: DEFAULT_APP_STATE_EN.schedules[0].members,
      groups: DEFAULT_APP_STATE_EN.schedules[0].groups,
    });
    act(() => result.current.language.setLocale("ja"));
    expect(result.current.home.activeSchedule?.name).toBe("My instructions");
    expect(result.current.home.activeSchedule?.members[0].name).toBe("Step 1");
  });

  it("syncs the stored language when a tool rotates the guide in another tab", async () => {
    vi.useFakeTimers();
    const initial = seedGuide(true);
    initial.schedules.push({
      ...structuredClone(DEFAULT_APP_STATE.schedules[0]),
      id: "team-roster",
      name: "Team cleaning",
    });
    initial.activeScheduleId = "team-roster";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    const { result } = renderHome();
    const tool = buildTobanTools(() => result.current.home).find(
      t => t.name === "advance_rotation"
    )!;
    await act(async () => {
      await tool.execute({ schedule_id: "s_default_1", direction: "forward" });
      await vi.advanceTimersByTimeAsync(3500);
    });
    expect(updateSchedule).toHaveBeenCalledWith(
      "existing-guide",
      "synthetic-token",
      expect.objectContaining({ name: "はじめてガイド", rotation: 1 }),
      undefined
    );
    expect(result.current.home.getToolState().schedules[0].name).toBe(
      "Getting started"
    );
    expect(savedState().schedules[0].name).toBe("はじめてガイド");
  });

  it("duplicates the displayed English guide without changing the saved original", () => {
    seedGuide();
    const { result } = renderHome();
    act(() => result.current.home.onDuplicateSchedule());

    expect(result.current.home.activeSchedule).toMatchObject({
      name: "Getting started (copy)",
      groups: DEFAULT_APP_STATE_EN.schedules[0].groups,
      members: DEFAULT_APP_STATE_EN.schedules[0].members,
    });
    expect(savedState().schedules[0]).toEqual(DEFAULT_APP_STATE.schedules[0]);
    act(() => result.current.language.setLocale("ja"));
    expect(result.current.home.activeSchedule?.name).toBe(
      "Getting started (copy)"
    );
  });

  it("explicitly shares the displayed language and keeps later language switches local", async () => {
    vi.useFakeTimers();
    seedGuide(true);
    const { result } = renderHome();
    await act(async () => {
      await result.current.home.handleShare();
    });

    expect(updateSchedule).toHaveBeenCalledWith(
      "existing-guide",
      "synthetic-token",
      expect.objectContaining({
        name: "Getting started",
        groups: DEFAULT_APP_STATE_EN.schedules[0].groups,
        members: DEFAULT_APP_STATE_EN.schedules[0].members,
      })
    );
    expect(publishSchedule).toHaveBeenCalledWith(
      "existing-guide",
      "synthetic-token"
    );
    expect(savedState().schedules[0].name).toBe("Getting started");
    act(() => result.current.home.setShowShare(false));
    act(() => result.current.language.setLocale("ja"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(result.current.home.activeSchedule?.name).toBe("はじめてガイド");
    expect(savedState().schedules[0].name).toBe("Getting started");
    expect(updateSchedule).toHaveBeenCalledTimes(1);
  });
});
