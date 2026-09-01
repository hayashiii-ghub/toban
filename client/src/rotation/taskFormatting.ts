import type { Locale } from "@/i18n/core";

/** Format a task group's names for the selected UI language. */
export function formatTaskNames(
  tasks: readonly string[],
  locale: Locale
): string {
  return tasks.join(locale === "en" ? ", " : "・");
}
