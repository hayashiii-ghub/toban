import type { Schedule } from "./types";
import type {
  AppearanceColorId,
  AppearanceTextureId,
  ScheduleAppearance,
} from "@shared/appearance";
import { composeThemeId, splitThemeId } from "./designThemes";
import { getSavedFontId } from "@/fonts";

const COLOR_THEME_IDS: Record<AppearanceColorId, string> = {
  print: "whiteboard",
  blackboard: "chalkboard",
  orange: "crayon",
  sunflower: "sunflower",
  hydrangea: "lavender",
  cherry_blossom: "sakura",
  fresh_green: "nature",
  sky: "ocean",
  night_sky: "nightsky",
};

const TEXTURE_THEME_IDS: Record<AppearanceTextureId, string> = {
  smooth: "sarasara",
  textured: "zarazara",
  soft: "mochimochi",
};

const THEME_COLOR_IDS = Object.fromEntries(
  Object.entries(COLOR_THEME_IDS).map(([appearance, theme]) => [
    theme,
    appearance,
  ])
) as Record<string, AppearanceColorId>;

const THEME_TEXTURE_IDS = Object.fromEntries(
  Object.entries(TEXTURE_THEME_IDS).map(([appearance, theme]) => [
    theme,
    appearance,
  ])
) as Record<string, AppearanceTextureId>;

export function getScheduleAppearance(schedule: Schedule): ScheduleAppearance {
  const { textureId, colorId } = splitThemeId(schedule.designThemeId);
  return {
    font: schedule.fontId ?? getSavedFontId(),
    color: THEME_COLOR_IDS[colorId] ?? "print",
    texture: THEME_TEXTURE_IDS[textureId] ?? "smooth",
  };
}

export function applyScheduleAppearance(
  schedule: Schedule,
  patch: Partial<ScheduleAppearance>
): Schedule {
  const current = getScheduleAppearance(schedule);
  const next = { ...current, ...patch };
  return {
    ...schedule,
    fontId: next.font,
    designThemeId: composeThemeId(
      TEXTURE_THEME_IDS[next.texture],
      COLOR_THEME_IDS[next.color]
    ),
  };
}
