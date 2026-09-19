import { db } from "@/lib/db";

function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function previousDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);

  return dateToKey(date);
}

export async function getCurrentStreak(userId: string): Promise<number> {
  const logs = await db.dailyLog.findMany({
    where: {
      userId,
      finalizedAt: { not: null },
      completionPercent: { gte: 40 },
    },
    orderBy: {
      date: "desc",
    },
    select: {
      date: true,
    },
  });

  if (logs.length === 0) {
    return 0;
  }

  const completedDates = new Set(
    logs.map((log) => dateToKey(log.date)),
  );

  let streak = 0;
  let expectedDate = dateToKey(logs[0].date);

  while (completedDates.has(expectedDate)) {
    streak += 1;
    expectedDate = previousDate(expectedDate);
  }

  return streak;
}