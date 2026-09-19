import { db } from "@/lib/db";
import {
  getLocalDateString,
  getPreviousLocalDate,
} from "@/lib/timezone";
import { finalizeDailyLog } from "./finalization";
import { getOrCreateDailyLog } from "./service";

/**
 * Finalizes the previous local calendar day for a user.
 *
 * The date is calculated using the user's timezone,
 * not the server's timezone.
 */
export async function finalizePreviousDay(input: {
  userId: string;
  now?: Date;
}) {
  const settings = await db.userSettings.findUnique({
    where: {
      userId: input.userId,
    },
  });

  if (!settings) {
    throw new Error("USER_SETTINGS_NOT_FOUND");
  }

  const todayLocalDate = getLocalDateString(
    input.now ?? new Date(),
    settings.timezone,
  );

  const previousLocalDate = getPreviousLocalDate(
    todayLocalDate,
  );

  if (previousLocalDate < settings.challengeStartDate.toISOString().slice(0, 10)) {
    return {
      finalized: false,
      reason: "BEFORE_CHALLENGE_START",
      date: previousLocalDate,
    };
  }

  // Cron must finalize a day even when the user never opened the app.
  // Creating the missing daily log here prevents silent skipped days.
  const dailyLog = await getOrCreateDailyLog(input.userId, previousLocalDate);

  const result = await finalizeDailyLog({
    userId: input.userId,
    dailyLogId: dailyLog.id,
  });

  return {
    finalized: true,
    date: previousLocalDate,
    result,
  };
}