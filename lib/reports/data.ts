import { db } from "@/lib/db";
import { getProgressHistory } from "@/lib/progress-history";
import { getTokenHistory } from "@/lib/token-history";
import { getProgressSummary } from "@/lib/progress";
import { getCurrentStreak } from "@/lib/streak";
import { getLocalDateString } from "@/lib/timezone";

export async function getThirtyDayReport(
  userId: string,
  endDate?: string
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      settings: {
        select: {
          timezone: true,
        },
      },
    },
  });

  if (!user?.settings) {
    throw new Error("USER_SETTINGS_NOT_FOUND");
  }

  const end =
    endDate ??
    getLocalDateString(new Date(), user.settings.timezone);

  const [y, m, d] = end.split("-").map(Number);

  const startDate = new Date(Date.UTC(y, m - 1, d));
  startDate.setUTCDate(startDate.getUTCDate() - 29);

  const start = startDate.toISOString().slice(0, 10);

  const [history, tokens, summary, streak] = await Promise.all([
    getProgressHistory(userId, start, end),
    getTokenHistory(userId, start, end),
    getProgressSummary(userId),
    getCurrentStreak(userId),
  ]);

  /*
   * Only finalized days are used for completed/partial/missed
   * statistics.
   *
   * An open day is still in progress and therefore must not
   * be classified as a missed or partial day yet.
   */
  const finalizedHistory = history.filter(
    (day) => day.finalizedAt !== null
  );

  const averageCompletion = finalizedHistory.length
    ? finalizedHistory.reduce(
        (sum, day) => sum + day.completionPercent,
        0
      ) / finalizedHistory.length
    : 0;

  const missedDays = finalizedHistory.filter(
    (day) => day.completionPercent < 40
  ).length;

  const partialDays = finalizedHistory.filter(
    (day) =>
      day.completionPercent >= 40 &&
      day.completionPercent < 100
  ).length;

  const completedDays = finalizedHistory.filter(
    (day) => day.completionPercent >= 100
  ).length;

  const rewards = tokens
    .filter((token) => token.type === "DAILY_REWARD")
    .reduce((sum, token) => sum + token.amount, 0);

  const penalties = tokens
    .filter((token) => token.type === "MISSED_DAY_PENALTY")
    .reduce((sum, token) => sum + token.amount, 0);

  return {
    user,
    periodStart: start,
    periodEnd: end,
    history,
    tokens,
    summary,
    streak,
    averageCompletion,
    missedDays,
    partialDays,
    completedDays,
    rewards,
    penalties,
  };
}