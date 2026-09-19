import { db } from "@/lib/db";
import { applyMissedDayPenalty } from "@/lib/penalty-service";

async function main() {
  console.log("Creating temporary test user...");

  const user = await db.user.create({
    data: {
      name: "Penalty Test User",
      email: `penalty-test-${Date.now()}@example.com`,
      passwordHash: "test-only",
      settings: {
        create: {
          timezone: "Asia/Dhaka",
          challengeStartDate: new Date("2026-09-20T00:00:00.000Z"),
          walkingTargetSteps: 4000,
          waterTargetMl: 2500,
          sleepTargetHours: 8,
          reminderHour: 20,
          workoutSchedule: {},
        },
      },
    },
  });

  try {
    console.log("Creating first missed day...");

    const firstDay = await db.dailyLog.create({
      data: {
        userId: user.id,
        date: new Date("2026-10-01T00:00:00.000Z"),
        dayType: "TRAINING",
        completionPercent: 20,
        applicableTasks: 7,
        completedTasks: 1,
        partialTasks: 0,
        missedTasks: 6,
        finalizedAt: new Date(),
      },
    });

    console.log("Creating second missed day...");

    const secondDay = await db.dailyLog.create({
      data: {
        userId: user.id,
        date: new Date("2026-10-02T00:00:00.000Z"),
        dayType: "TRAINING",
        completionPercent: 30,
        applicableTasks: 7,
        completedTasks: 2,
        partialTasks: 0,
        missedTasks: 5,
        finalizedAt: new Date(),
      },
    });

    console.log("Testing first missed day...");

    const firstPenalty = await applyMissedDayPenalty({
      userId: user.id,
      dailyLogId: firstDay.id,
    });

    if (firstPenalty !== null) {
      throw new Error("First missed day should be free.");
    }

    console.log("✓ First missed day is free");

    console.log("Testing second missed day...");

    const secondPenalty = await applyMissedDayPenalty({
      userId: user.id,
      dailyLogId: secondDay.id,
    });

    if (!secondPenalty) {
      throw new Error("Second missed day should create a penalty.");
    }

    if (secondPenalty.amount !== -5) {
      throw new Error(
        `Expected -5 tokens, received ${secondPenalty.amount}`,
      );
    }

    console.log("✓ Second missed day creates -5 tokens");

    console.log("Testing duplicate protection...");

    const duplicatePenalty = await applyMissedDayPenalty({
      userId: user.id,
      dailyLogId: secondDay.id,
    });

    if (!duplicatePenalty) {
      throw new Error("Duplicate call should return the existing penalty.");
    }

    if (duplicatePenalty.id !== secondPenalty.id) {
      throw new Error("Duplicate call created a different penalty.");
    }

    const penaltyTransactions = await db.tokenTransaction.count({
      where: {
        userId: user.id,
        type: "MISSED_DAY_PENALTY",
      },
    });

    if (penaltyTransactions !== 1) {
      throw new Error(
        `Expected exactly 1 penalty transaction, found ${penaltyTransactions}.`,
      );
    }

    console.log("✓ Duplicate penalty was prevented");
    console.log("✓ Only one penalty transaction exists");

    console.log("\nStage 3 missed-day penalty test passed.");
  } finally {
    console.log("Cleaning up temporary test data...");
    await db.user.delete({
      where: { id: user.id },
    });
    console.log("Temporary test data removed.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });