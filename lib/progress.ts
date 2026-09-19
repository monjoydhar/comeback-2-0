import { db } from "@/lib/db";

export type UserLevel =
  | "Rookie"
  | "Grinder"
  | "Disciplined"
  | "Beast Mode"
  | "Unstoppable"
  | "Comeback Complete";

const CERTIFICATE_TARGET = 600;

export function levelFromNetTokens(netTokens: number): UserLevel {
  if (netTokens >= 500) return "Comeback Complete";
  if (netTokens >= 400) return "Unstoppable";
  if (netTokens >= 300) return "Beast Mode";
  if (netTokens >= 200) return "Disciplined";
  if (netTokens >= 100) return "Grinder";
  return "Rookie";
}

export function certificateUnlocked(netTokens: number): boolean {
  return netTokens >= CERTIFICATE_TARGET;
}

export async function getNetTokens(userId: string): Promise<number> {
  const result = await db.tokenTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  return result._sum.amount ?? 0;
}

export async function getProgressSummary(userId: string) {
  const netTokens = await getNetTokens(userId);

  const progressPercent = Math.min(
    100,
    Math.max(0, (netTokens / CERTIFICATE_TARGET) * 100),
  );

  const remainingTokens = Math.max(
    0,
    CERTIFICATE_TARGET - netTokens,
  );

  return {
    netTokens,
    remainingTokens,
    progressPercent,
    level: levelFromNetTokens(netTokens),
    certificateUnlocked: certificateUnlocked(netTokens),
  };
}