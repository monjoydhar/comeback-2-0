import { db } from "@/lib/db";

const CERTIFICATE_ACHIEVEMENT_TYPE = "CERTIFICATE_UNLOCK";

export async function unlockCertificate(userId: string) {
  return db.$transaction(async (tx) => {
    const tokenResult = await tx.tokenTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const netTokens = tokenResult._sum.amount ?? 0;

    if (netTokens < 600) {
      return null;
    }

    const existingAchievement = await tx.achievement.findUnique({
      where: {
        userId_type: {
          userId,
          type: CERTIFICATE_ACHIEVEMENT_TYPE,
        },
      },
    });

    if (existingAchievement) {
      return existingAchievement;
    }

    return tx.achievement.create({
      data: {
        userId,
        type: CERTIFICATE_ACHIEVEMENT_TYPE,
        title: "Comeback Complete",
        unlockedAt: new Date(),
        metadata: {
          requiredTokens: 600,
          unlockedAtNetTokens: netTokens,
        },
      },
    });
  });
}