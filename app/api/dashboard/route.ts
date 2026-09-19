import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProgressSummary } from "@/lib/progress";
import { getCurrentStreak } from "@/lib/streak";
import { getLocalDateString } from "@/lib/timezone";
import { getOrCreateDailyLog } from "@/lib/daily/service";

function daysBetween(start: string, current: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [cy, cm, cd] = current.split("-").map(Number);
  return Math.floor((Date.UTC(cy, cm - 1, cd) - Date.UTC(sy, sm - 1, sd)) / 86_400_000);
}

function labelForDayType(dayType: "TRAINING" | "REST" | "FULL_REST") {
  if (dayType === "FULL_REST") return "Full Rest Day";
  if (dayType === "REST") return "Rest Day";
  return "Training Day";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        settings: {
          select: {
            timezone: true,
            challengeStartDate: true,
            walkingTargetSteps: true,
            waterTargetMl: true,
            sleepTargetHours: true,
          },
        },
      },
    });

    if (!user?.settings) return NextResponse.json({ error: "User settings not found" }, { status: 404 });

    const localDate = getLocalDateString(new Date(), user.settings.timezone);
    const startDate = user.settings.challengeStartDate.toISOString().slice(0, 10);
    const challengeDay = daysBetween(startDate, localDate) + 1;
    const [progress, streak] = await Promise.all([
      getProgressSummary(session.user.id),
      getCurrentStreak(session.user.id),
    ]);

    const base = {
      profile: { name: user.name, email: user.email, timezone: user.settings.timezone },
      date: localDate,
      challenge: { started: localDate >= startDate, startDate, comebackDay: Math.max(0, challengeDay) },
      progress: { ...progress, streak },
      targets: {
        sleep: Number(user.settings.sleepTargetHours),
        water: user.settings.waterTargetMl,
        steps: user.settings.walkingTargetSteps,
      },
    };

    if (localDate < startDate) return NextResponse.json({ ...base, daily: null });

    const daily = await getOrCreateDailyLog(session.user.id, localDate);
    return NextResponse.json({
      ...base,
      daily: { ...daily, dayTypeLabel: labelForDayType(daily.dayType) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load dashboard" }, { status: 500 });
  }
}
