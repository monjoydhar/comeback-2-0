import { type TokenTransaction } from "@prisma/client";
import { db } from "@/lib/db";

export async function applyMissedDayPenalty(input: {
  userId: string;
  dailyLogId: string;
}): Promise<TokenTransaction | null> {
  return db.$transaction(async (tx) => {
    const dailyLog = await tx.dailyLog.findFirst({
      where: {
        id: input.dailyLogId,
        userId: input.userId,
      },
    });

    if (!dailyLog) {
      throw new Error("DAILY_LOG_NOT_FOUND");
    }

    if (!dailyLog.finalizedAt) {
      throw new Error("DAILY_LOG_NOT_FINALIZED");
    }

    if (dailyLog.penaltyApplied) {
      const existingPenalty = await tx.tokenTransaction.findFirst({
        where: {
          userId: input.userId,
          dailyLogId: dailyLog.id,
          type: "MISSED_DAY_PENALTY",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return existingPenalty;
    }

    // A missed day is defined as completion below 40%.
    if (Number(dailyLog.completionPercent) >= 40) {
      await tx.dailyLog.update({
        where: { id: dailyLog.id },
        data: { penaltyApplied: true },
      });

      return null;
    }

    // Count finalized missed days up to and including this day.
    const missedDays = await tx.dailyLog.count({
      where: {
        userId: input.userId,
        finalizedAt: { not: null },
        date: { lte: dailyLog.date },
        completionPercent: { lt: 40 },
      },
    });

    // First missed day is free.
    // Every second missed day creates a -5 penalty.
    const totalPenaltyOwed = Math.floor(missedDays / 2) * 5;

    // Find how much penalty has already been recorded.
    const existingPenalty = await tx.tokenTransaction.aggregate({
      where: {
        userId: input.userId,
        type: "MISSED_DAY_PENALTY",
      },
      _sum: {
        amount: true,
      },
    });

    const alreadyApplied = Math.abs(existingPenalty._sum.amount ?? 0);
    const newlyOwed = totalPenaltyOwed - alreadyApplied;

    await tx.dailyLog.update({
      where: { id: dailyLog.id },
      data: { penaltyApplied: true },
    });

    if (newlyOwed <= 0) {
      return null;
    }

    const idempotencyKey =
      `missed-day-penalty:${input.userId}:${dailyLog.id}`;

    return tx.tokenTransaction.create({
      data: {
        userId: input.userId,
        dailyLogId: dailyLog.id,
        amount: -newlyOwed,
        type: "MISSED_DAY_PENALTY",
        reason: `Missed-day penalty after ${missedDays} missed days`,
        relatedDate: dailyLog.date,
        idempotencyKey,
      },
    });
  });
}