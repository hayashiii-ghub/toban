const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfLocalDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function parseIsoDateLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return startOfLocalDay(date);
}

export function addDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toLocalDayNumber(date: Date): number {
  const normalized = startOfLocalDay(date);
  return Math.floor(
    Date.UTC(
      normalized.getFullYear(),
      normalized.getMonth(),
      normalized.getDate()
    ) / MS_PER_DAY
  );
}

export function diffLocalCalendarDays(startDate: Date, endDate: Date): number {
  return toLocalDayNumber(endDate) - toLocalDayNumber(startDate);
}
