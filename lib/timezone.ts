import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const DEFAULT_TIMEZONE = "Asia/Dhaka";

export function getTimezone(timezone?: string | null): string {
  return timezone?.trim() || DEFAULT_TIMEZONE;
}

/**
 * Returns today's local date in YYYY-MM-DD format
 * for the supplied timezone.
 */
export function getLocalDateString(
  date: Date = new Date(),
  timezone?: string | null,
): string {
  return formatInTimeZone(
    date,
    getTimezone(timezone),
    "yyyy-MM-dd",
  );
}

/**
 * Converts a local calendar date + local time into a UTC Date.
 *
 * Example:
 *   localDate = "2026-09-20"
 *   localTime = "09:00"
 *   timezone = "Asia/Dhaka"
 */
export function localDateTimeToUtc(
  localDate: string,
  localTime: string,
  timezone?: string | null,
): Date {
  return fromZonedTime(
    `${localDate}T${localTime}:00`,
    getTimezone(timezone),
  );
}

/**
 * Returns the weekday name for a local date.
 *
 * Example:
 *   "2026-09-20" -> "SUNDAY"
 */
export function getWeekdayFromLocalDate(
  localDate: string,
  timezone?: string | null,
): string {
  const utcDate = localDateTimeToUtc(
    localDate,
    "00:00",
    timezone,
  );

  return formatInTimeZone(
    utcDate,
    getTimezone(timezone),
    "EEEE",
  ).toUpperCase();
}

/**
 * Returns the previous local calendar date.
 */
export function getPreviousLocalDate(
  localDate: string,
): string {
  const [year, month, day] = localDate.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  date.setUTCDate(date.getUTCDate() - 1);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Returns the next local calendar date.
 */
export function getNextLocalDate(
  localDate: string,
): string {
  const [year, month, day] = localDate.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  date.setUTCDate(date.getUTCDate() + 1);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}