import { db } from "@/lib/db";
import { finalizeDailyLog } from "@/lib/daily/finalization";

async function main() {
  console.log("Creating temporary test user...");

  const user = await db.user.create({
    data: {
      name: "Finalization Test User",
      email: `finalization-test-${Date.now()}@example.com`,
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
    /*
     * ---------------------------------------------------------
     * TEST 1: 100% completion -> +10 tokens
     * ---------------------------------------------------------
     */

    console.log("\nTest 1: 100% completion...");

    const completedLog = await db.dailyLog.create({
      data: {
        userId: user.id,
        date: new Date("2026-10-10T00:00:00.000Z"),
        dayType: "TRAINING",
        completionPercent: 100,
        applicableTasks: 7,
        completedTasks: 7,
        partialTasks: 0,
        missedTasks: 0,
      },
    });

    const completedResult = await finalizeDailyLog({
      userId: user.id,
      dailyLogId: completedLog.id,
    });

    if (completedResult.alreadyFinalized) {
      throw new Error(
        "First finalization should not be marked as duplicate.",
      );
    }

    if (!completedResult.reward) {
      throw new Error(
        "100% completion should receive a reward.",
      );
    }

    if (completedResult.reward.amount !== 10) {
      throw new Error(
        `Expected 10 tokens, received ${completedResult.reward.amount}.`,
      );
    }

    if (!completedResult.dailyLog.finalizedAt) {
      throw new Error(
        "Daily log should be finalized.",
      );
    }

    console.log("✓ 100% completion received 10 tokens");
    console.log("✓ Daily log was finalized");

    /*
     * ---------------------------------------------------------
     * TEST 2: Duplicate finalization
     * ---------------------------------------------------------
     */

    console.log("\nTest 2: Duplicate finalization...");

    const duplicate = await finalizeDailyLog({
      userId: user.id,
      dailyLogId: completedLog.id,
    });

    if (!duplicate.alreadyFinalized) {
      throw new Error(
        "Duplicate finalization was not detected.",
      );
    }

    const rewardCount = await db.tokenTransaction.count({
      where: {
        userId: user.id,
        dailyLogId: completedLog.id,
        type: "DAILY_REWARD",
      },
    });

    if (rewardCount !== 1) {
      throw new Error(
        `Expected exactly 1 reward transaction, found ${rewardCount}.`,
      );
    }

    console.log(
      "✓ Duplicate finalization did not create another reward",
    );
    console.log("✓ Only one reward transaction exists");

    /*
     * ---------------------------------------------------------
     * TEST 3: First missed day -> no penalty
     * ---------------------------------------------------------
     */

    console.log("\nTest 3: First missed day...");

    const firstMissedLog = await db.dailyLog.create({
      data: {
        userId: user.id,
        date: new Date("2026-10-11T00:00:00.000Z"),
        dayType: "TRAINING",
        completionPercent: 20,
        applicableTasks: 7,
        completedTasks: 0,
        partialTasks: 0,
        missedTasks: 7,
      },
    });

    const firstMissedResult = await finalizeDailyLog({
      userId: user.id,
      dailyLogId: firstMissedLog.id,
    });

    if (!firstMissedResult.dailyLog.finalizedAt) {
      throw new Error(
        "First missed day should be finalized.",
      );
    }

    if (firstMissedResult.penalty !== null) {
      throw new Error(
        "The first missed day should be penalty-free.",
      );
    }

    console.log("✓ First missed day finalized");
    console.log("✓ First missed day received no penalty");

    /*
     * ---------------------------------------------------------
     * TEST 4: Second missed day -> -5 tokens
     * ---------------------------------------------------------
     */

    console.log("\nTest 4: Second missed day...");

    const secondMissedLog = await db.dailyLog.create({
      data: {
        userId: user.id,
        date: new Date("2026-10-12T00:00:00.000Z"),
        dayType: "TRAINING",
        completionPercent: 10,
        applicableTasks: 7,
        completedTasks: 0,
        partialTasks: 0,
        missedTasks: 7,
      },
    });

    const secondMissedResult = await finalizeDailyLog({
      userId: user.id,
      dailyLogId: secondMissedLog.id,
    });

    if (!secondMissedResult.penalty) {
      throw new Error(
        "Second missed day should receive a penalty.",
      );
    }

    if (secondMissedResult.penalty.amount !== -5) {
      throw new Error(
        `Expected -5 penalty, received ${secondMissedResult.penalty.amount}.`,
      );
    }

    console.log("✓ Second missed day received -5 tokens");

    /*
     * ---------------------------------------------------------
     * TEST 5: Duplicate finalization of missed day
     * ---------------------------------------------------------
     */

    console.log(
      "\nTest 5: Duplicate missed-day finalization...",
    );

    const duplicateMissed = await finalizeDailyLog({
      userId: user.id,
      dailyLogId: secondMissedLog.id,
    });

    if (!duplicateMissed.alreadyFinalized) {
      throw new Error(
        "Duplicate missed-day finalization was not detected.",
      );
    }

    const penaltyCount =
      await db.tokenTransaction.count({
        where: {
          userId: user.id,
          dailyLogId: secondMissedLog.id,
          type: "MISSED_DAY_PENALTY",
        },
      });

    if (penaltyCount !== 1) {
      throw new Error(
        `Expected exactly 1 penalty transaction, found ${penaltyCount}.`,
      );
    }

    console.log(
      "✓ Duplicate missed-day finalization did not create another penalty",
    );
    console.log("✓ Only one penalty transaction exists");

    /*
     * ---------------------------------------------------------
     * FINAL RESULT
     * ---------------------------------------------------------
     */

    console.log(
      "\nStage 4 finalization integration test passed.",
    );
  } finally {
    console.log("\nCleaning up temporary test data...");

    await db.user.delete({
      where: {
        id: user.id,
      },
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