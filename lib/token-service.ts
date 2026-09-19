import { type TokenTransaction } from "@prisma/client";
import { db } from "@/lib/db";
import { tokensForCompletion } from "@/lib/tokens";

export async function awardDailyReward(input: {
  userId: string;
  dailyLogId: string;
}): Promise<TokenTransaction> {
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

    const idempotencyKey =
      `daily-reward:${input.userId}:${dailyLog.id}`;

    /*
     * The conditional update acts as our first layer of
     * duplicate protection.
     *
     * Only the first request can change tokensAwarded
     * from false to true.
     */
    const claimed = await tx.dailyLog.updateMany({
      where: {
        id: dailyLog.id,
        userId: input.userId,
        tokensAwarded: false,
      },
      data: {
        tokensAwarded: true,
      },
    });

    if (claimed.count === 0) {
      /*
       * The reward was already processed.
       * Return the existing ledger entry instead of
       * creating another reward.
       */
      const existingTransaction =
        await tx.tokenTransaction.findUnique({
          where: {
            idempotencyKey,
          },
        });

      if (!existingTransaction) {
        throw new Error("REWARD_ALREADY_PROCESSED");
      }

      return existingTransaction;
    }

    const amount = tokensForCompletion(
      Number(dailyLog.completionPercent)
    );

    const transaction = await tx.tokenTransaction.create({
      data: {
        userId: input.userId,
        dailyLogId: dailyLog.id,
        amount,
        type: "DAILY_REWARD",
        reason: `Daily reward for ${Number(
          dailyLog.completionPercent
        ).toFixed(2)}% completion`,
        relatedDate: dailyLog.date,
        idempotencyKey,
      },
    });

    return transaction;
  });
}