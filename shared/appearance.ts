export const FONT_IDS = [
  "standard",
  "handwriting",
  "elegant",
  "print",
] as const;

export const APPEARANCE_COLOR_IDS = [
  "print",
  "blackboard",
  "orange",
  "sunflower",
  "hydrangea",
  "cherry_blossom",
  "fresh_green",
  "sky",
  "night_sky",
] as const;

export const APPEARANCE_TEXTURE_IDS = ["smooth", "textured", "soft"] as const;

export type FontId = (typeof FONT_IDS)[number];
export type AppearanceColorId = (typeof APPEARANCE_COLOR_IDS)[number];
export type AppearanceTextureId = (typeof APPEARANCE_TEXTURE_IDS)[number];

export interface ScheduleAppearance {
  font: FontId;
  color: AppearanceColorId;
  texture: AppearanceTextureId;
}
