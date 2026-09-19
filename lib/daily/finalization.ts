import { db } from "@/lib/db";
import { awardDailyReward } from "@/lib/token-service";
import { applyMissedDayPenalty } from "@/lib/penalty-service";
import { unlockCertificate } from "@/lib/certificate-service";

export async function finalizeDailyLog(input: {
  userId: string;
  dailyLogId: string;
}) {
  const log = await db.dailyLog.findFirst({
    where: {
      id: input.dailyLogId,
      userId: input.userId,
    },
    include: {
      tasks: true,
    },
  });

  if (!log) {
    throw new Error("DAILY_LOG_NOT_FOUND");
  }

  /*
   * If another request already finalized this day,
   * do not run the reward/penalty workflow again.
   */
  if (log.finalizedAt) {
    const netTokens = await db.tokenTransaction.aggregate({
      where: {
        userId: input.userId,
      },
      _sum: {
        amount: true,
      },
    });

    const certificate = await db.achievement.findUnique({
      where: {
        userId_type: {
          userId: input.userId,
          type: "CERTIFICATE_UNLOCK",
        },
      },
    });

    return {
      dailyLog: log,
      reward: null,
      penalty: null,
      certificate,
      certificateNewlyUnlocked: false,
      netTokens: netTokens._sum.amount ?? 0,
      alreadyFinalized: true,
    };
  }

  /*
   * Atomically claim finalization.
   *
   * Only the request that successfully changes finalizedAt
   * from NULL to a timestamp is allowed to continue with
   * the reward/penalty workflow.
   *
   * This protects against two requests arriving at nearly
   * the same time.
   */
  const finalizedAt = new Date();

  const claim = await db.dailyLog.updateMany({
    where: {
      id: log.id,
      userId: input.userId,
      finalizedAt: null,
    },
    data: {
      finalizedAt,
    },
  });

  if (claim.count === 0) {
    /*
     * Another request finalized the day between our initial
     * read and this atomic update.
     *
     * Return the finalized state without processing rewards
     * or penalties again.
     */
    const finalizedLog = await db.dailyLog.findFirst({
      where: {
        id: log.id,
        userId: input.userId,
      },
      include: {
        tasks: true,
      },
    });

    if (!finalizedLog) {
      throw new Error("FINALIZED_DAILY_LOG_NOT_FOUND");
    }

    const netTokens = await db.tokenTransaction.aggregate({
      where: {
        userId: input.userId,
      },
      _sum: {
        amount: true,
      },
    });

    const certificate = await db.achievement.findUnique({
      where: {
        userId_type: {
          userId: input.userId,
          type: "CERTIFICATE_UNLOCK",
        },
      },
    });

    return {
      dailyLog: finalizedLog,
      reward: null,
      penalty: null,
      certificate,
      certificateNewlyUnlocked: false,
      netTokens: netTokens._sum.amount ?? 0,
      alreadyFinalized: true,
    };
  }

  /*
   * Only the request that successfully claimed finalization
   * reaches this point.
   */
  let reward = null;
  let penalty = null;

  /*
   * A day below 40% is considered missed.
   * Otherwise the daily reward is processed.
   */
  if (Number(log.completionPercent) < 40) {
    penalty = await applyMissedDayPenalty({
      userId: input.userId,
      dailyLogId: log.id,
    });
  } else {
    reward = await awardDailyReward({
      userId: input.userId,
      dailyLogId: log.id,
    });
  }

  /*
   * Certificate unlocking is checked after reward/penalty
   * processing so the latest token balance is used.
   */
  const certificateBefore = await db.achievement.findUnique({
    where: { userId_type: { userId: input.userId, type: "CERTIFICATE_UNLOCK" } },
  });
  const certificate = await unlockCertificate(input.userId);
  const certificateNewlyUnlocked = !certificateBefore && Boolean(certificate);

  const netTokens = await db.tokenTransaction.aggregate({
    where: {
      userId: input.userId,
    },
    _sum: {
      amount: true,
    },
  });

  const finalizedLog = await db.dailyLog.findUnique({
    where: {
      id: log.id,
    },
    include: {
      tasks: true,
    },
  });

  if (!finalizedLog) {
    throw new Error("FINALIZED_DAILY_LOG_NOT_FOUND");
  }

  return {
    dailyLog: finalizedLog,
    reward,
    penalty,
    certificate,
    certificateNewlyUnlocked,
    netTokens: netTokens._sum.amount ?? 0,
    alreadyFinalized: false,
  };
}