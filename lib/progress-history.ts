import { db } from "@/lib/db";

export async function getProgressHistory(userId: string, startDate?: string, endDate?: string) {
  const logs = await db.dailyLog.findMany({
    where: {
      userId,
      ...(startDate || endDate ? { date: { ...(startDate ? { gte: new Date(`${startDate}T00:00:00.000Z`) } : {}), ...(endDate ? { lte: new Date(`${endDate}T00:00:00.000Z`) } : {}) } } : {}),
    },
    orderBy: { date: "asc" },
    select: { date: true, dayType: true, completionPercent: true, applicableTasks: true, completedTasks: true, partialTasks: true, missedTasks: true, finalizedAt: true },
  });
  return logs.map((log) => ({
    date: log.date.toISOString().slice(0, 10),
    dayType: log.dayType,
    completionPercent: Number(log.completionPercent),
    applicableTasks: log.applicableTasks,
    completedTasks: log.completedTasks,
    partialTasks: log.partialTasks,
    missedTasks: log.missedTasks,
    finalizedAt: log.finalizedAt,
  }));
}
