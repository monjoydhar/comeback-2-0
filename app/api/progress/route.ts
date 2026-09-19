import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProgressSummary } from "@/lib/progress";
import { getProgressHistory } from "@/lib/progress-history";
import { getTokenHistory } from "@/lib/token-history";
import { getCurrentStreak } from "@/lib/streak";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [summary, history, tokenHistory, streak, tasks] = await Promise.all([
      getProgressSummary(session.user.id),
      getProgressHistory(session.user.id),
      getTokenHistory(session.user.id),
      getCurrentStreak(session.user.id),
      db.dailyTask.findMany({
        where: { dailyLog: { userId: session.user.id } },
        select: { type: true, numericValue: true, dailyLog: { select: { date: true } } },
        orderBy: { dailyLog: { date: "asc" } },
      }),
    ]);

    const metricHistory = tasks.reduce<Record<string, Array<{ date: string; value: number }>>>((acc, task) => {
      if (task.numericValue == null) return acc;
      const key = task.type;
      (acc[key] ??= []).push({ date: task.dailyLog.date.toISOString().slice(0, 10), value: Number(task.numericValue) });
      return acc;
    }, {});

    const earnedTokens = tokenHistory.filter((x) => x.type === "DAILY_REWARD").reduce((sum, x) => sum + x.amount, 0);
    const missedDays = history.filter((x) => x.completionPercent < 40).length;
    const partialDays = history.filter((x) => x.completionPercent >= 40 && x.completionPercent < 100).length;
    const trainingDays = history.filter((x) => x.dayType === "TRAINING").length;
    const restDays = history.filter((x) => x.dayType !== "TRAINING").length;
    const averageCompletion = history.length ? history.reduce((sum, x) => sum + x.completionPercent, 0) / history.length : 0;

    return NextResponse.json({
      ...summary,
      streak,
      averageCompletion,
      earnedTokens,
      missedDays,
      partialDays,
      trainingDays,
      restDays,
      history,
      tokenHistory,
      metricHistory,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load progress" }, { status: 500 });
  }
}
