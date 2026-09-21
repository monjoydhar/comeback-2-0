import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { finalizePreviousDay } from "@/lib/daily/finalize-previous-day";
import { getOrCreateDailyLog } from "@/lib/daily/service";
import { getLocalDateString } from "@/lib/timezone";
import { levelFromNetTokens, getNetTokens } from "@/lib/progress";
import {
  sendEmailEvent,
  emailHtml,
  absoluteAppUrl,
} from "@/lib/email/service";
import { getThirtyDayReport } from "@/lib/reports/data";
import { renderThirtyDayPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function levelValue(level: string) {
  return [
    "Rookie",
    "Grinder",
    "Disciplined",
    "Beast Mode",
    "Unstoppable",
    "Comeback Complete",
  ].indexOf(level);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      settings: true,
    },
  });

  const results: Array<Record<string, unknown>> = [];

  for (const user of users) {
    if (!user.settings) continue;

    const today = getLocalDateString(
      new Date(),
      user.settings.timezone
    );

    const start = user.settings.challengeStartDate
      .toISOString()
      .slice(0, 10);

    if (today < start) continue;

    const beforeTokens = await getNetTokens(user.id);
    const beforeLevel = levelFromNetTokens(beforeTokens);

    const finalization = await finalizePreviousDay({
      userId: user.id,
    });

    if (
      finalization.finalized &&
      finalization.result &&
      !finalization.result.alreadyFinalized
    ) {
      const finalizedLog = finalization.result.dailyLog;

      /*
       * A missed day means EVERY applicable task was missed.
       *
       * NOT_APPLICABLE and PLANNED_REST tasks are excluded
       * from applicableTasks by the daily completion engine.
       */
      const isMissedDay =
        finalizedLog.applicableTasks > 0 &&
        finalizedLog.missedTasks === finalizedLog.applicableTasks;

      if (isMissedDay && user.settings.emailMissedDay) {
        await sendEmailEvent({
          userId: user.id,
          eventType: "MISSED_DAY",
          relatedDate: finalization.date,
          subject: "Yesterday was a reset, not a verdict.",
          html: emailHtml(
            "Keep the comeback moving.",
            `Yesterday was a missed day because all applicable tasks were missed. The missed-day rule was processed automatically. Today is a fresh day—focus on the next simple action.`,
            {
              label: "Open dashboard",
              href: absoluteAppUrl("/dashboard"),
            }
          ),
        });
      }

      const afterTokens = await getNetTokens(user.id);
      const afterLevel = levelFromNetTokens(afterTokens);

      if (
        levelValue(afterLevel) > levelValue(beforeLevel) &&
        user.settings.emailLevelUp
      ) {
        await sendEmailEvent({
          userId: user.id,
          eventType: "LEVEL_UP",
          relatedDate: finalization.date,
          subject: `Level up: ${afterLevel}`,
          html: emailHtml(
            `You reached ${afterLevel}.`,
            `Your net token balance is now ${afterTokens}. Keep building the next day with the same steady approach.`,
            {
              label: "View progress",
              href: absoluteAppUrl("/progress"),
            }
          ),
        });
      }

      const newlyUnlocked =
        finalization.result.certificateNewlyUnlocked === true;

      if (
        newlyUnlocked &&
        afterTokens >= 600 &&
        user.settings.emailCertificateUnlock
      ) {
        await sendEmailEvent({
          userId: user.id,
          eventType: "CERTIFICATE_UNLOCK",
          relatedDate: finalization.date,
          subject:
            "Comeback Complete — certificate unlocked",
          html: emailHtml(
            "Your certificate is unlocked.",
            `You reached 600 net tokens. Your personal Comeback Complete certificate is now available.`,
            {
              label: "Open certificate",
              href: absoluteAppUrl("/certificate"),
            }
          ),
        });
      }
    }

    const [sy, sm, sd] = start.split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);

    const challengeDay =
      Math.floor(
        (
          Date.UTC(ty, tm - 1, td) -
          Date.UTC(sy, sm - 1, sd)
        ) / 86400000
      ) + 1;

    if (
      challengeDay > 0 &&
      challengeDay % 30 === 0 &&
      user.settings.emailThirtyDayReport
    ) {
      const report = await getThirtyDayReport(
        user.id,
        today
      );

      const pdf = await renderThirtyDayPdf(report);

      await sendEmailEvent({
        userId: user.id,
        eventType: "THIRTY_DAY_REPORT",
        relatedDate: today,
        subject: `Your ${challengeDay}-day Comeback 2.0 report`,
        html: emailHtml(
          "Your progress report is ready.",
          `Your latest 30-day report is attached. It reflects the records stored in your account for the period ${report.periodStart} to ${report.periodEnd}.`,
          {
            label: "Open progress",
            href: absoluteAppUrl("/progress"),
          }
        ),
        attachments: [
          {
            filename: `comeback-2-0-${report.periodStart}-to-${report.periodEnd}.pdf`,
            content: Buffer.from(pdf).toString("base64"),
          },
        ],
      });
    }

    const localHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: user.settings.timezone,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date())
    );

    if (
      localHour === user.settings.reminderHour &&
      user.settings.emailDailyReminder
    ) {
      const todayLog = await getOrCreateDailyLog(
        user.id,
        today
      );

      const hasIncompleteApplicableTask =
        todayLog.tasks.some(
          (task) =>
            task.status !== "COMPLETED" &&
            task.status !== "NOT_APPLICABLE" &&
            task.status !== "PLANNED_REST"
        );

      if (hasIncompleteApplicableTask) {
        await sendEmailEvent({
          userId: user.id,
          eventType: "DAILY_REMINDER",
          relatedDate: today,
          subject: "Your Comeback 2.0 check-in",
          html: emailHtml(
            `Keep today's next action simple, ${user.name.split(" ")[0]}.`,
            `You still have an applicable task to finish today. Record what is real, complete the next useful action, and let the system track the rest.`,
            {
              label: "Open dashboard",
              href: absoluteAppUrl("/dashboard"),
            }
          ),
        });
      }
    }

    results.push({
      userId: user.id,
      date: today,
      finalized: finalization.finalized,
      finalizationReason:
        finalization.reason ?? null,
    });
  }

  return NextResponse.json({
    ok: true,
    processedUsers: results.length,
    results,
  });
}