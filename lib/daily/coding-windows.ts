import { getTimezone, localDateTimeToUtc } from "@/lib/timezone";

export const CODING_WINDOWS = {
  CODING_BLOCK_1: {
    start: "09:00",
    end: "13:00",
  },
  CODING_BLOCK_2: {
    start: "14:00",
    end: "17:00",
  },
} as const;

export type CodingBlockType = keyof typeof CODING_WINDOWS;

export function isCodingBlockType(
  type: string,
): type is CodingBlockType {
  return type === "CODING_BLOCK_1" || type === "CODING_BLOCK_2";
}

/**
 * Checks whether a coding block can be completed
 * at the supplied instant for the user's local date/time.
 *
 * The comparison is done using UTC timestamps after
 * converting the configured local window into UTC.
 */
export function isWithinCodingWindow(input: {
  type: CodingBlockType;
  localDate: string;
  timezone?: string | null;
  now?: Date;
}): boolean {
  const timezone = getTimezone(input.timezone);
  const now = input.now ?? new Date();

  const window = CODING_WINDOWS[input.type];

  const startUtc = localDateTimeToUtc(
    input.localDate,
    window.start,
    timezone,
  );

  const endUtc = localDateTimeToUtc(
    input.localDate,
    window.end,
    timezone,
  );

  return now >= startUtc && now <= endUtc;
}