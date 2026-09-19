import { dayDateSchema } from "@/lib/validation";

export function parseDayDate(value: string): Date {
  const parsed = dayDateSchema.parse(value);
  const [year, month, day] = parsed.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDayDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Gets the weekday for a date in the user's timezone. Noon UTC avoids edge
 * cases where a midnight conversion crosses the previous/next calendar day.
 */
export function weekdayForDate(dateString: string, timezone: string): string {
  const date = parseDayDate(dateString);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });
  return formatter.format(new Date(date.getTime() + 12 * 60 * 60 * 1000)).toUpperCase();
}
