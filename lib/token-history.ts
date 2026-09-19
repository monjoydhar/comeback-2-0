import { db } from "@/lib/db";

export async function getTokenHistory(userId: string, startDate?: string, endDate?: string) {
  const transactions = await db.tokenTransaction.findMany({
    where: {
      userId,
      ...(startDate || endDate ? { relatedDate: { ...(startDate ? { gte: new Date(`${startDate}T00:00:00.000Z`) } : {}), ...(endDate ? { lte: new Date(`${endDate}T00:00:00.000Z`) } : {}) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, amount: true, type: true, reason: true, relatedDate: true, createdAt: true },
  });
  return transactions.map((transaction) => ({
    id: transaction.id,
    amount: transaction.amount,
    type: transaction.type,
    reason: transaction.reason,
    relatedDate: transaction.relatedDate ? transaction.relatedDate.toISOString().slice(0, 10) : null,
    createdAt: transaction.createdAt,
  }));
}
