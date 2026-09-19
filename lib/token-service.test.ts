import assert from "node:assert/strict";
import { db } from "@/lib/db";
import { awardDailyReward } from "@/lib/token-service";

async function main() {
  const testEmail = `token-test-${Date.now()}@example.com`;

  console.log("Creating temporary test user...");

  const testUser = await db.user.create({
    data: {
      name: "Token Test User",
      email: testEmail,
      passwordHash: "test-only",
      role: "USER",
    },
  });

  try {
    console.log("Creating temporary daily log...");

    const dailyLog = await db.dailyLog.create({
      data: {
        userId: testUser.id,
        date: new Date("2099-01-01T00:00:00.000Z"),
        dayType: "TRAINING",
        completionPercent: 100,
        applicableTasks: 7,
        completedTasks: 7,
        partialTasks: 0,
        missedTasks: 0,
      },
    });

    console.log("Awarding daily reward...");

    const firstReward = await awardDailyReward({
      userId: testUser.id,
      dailyLogId: dailyLog.id,
    });

    console.log(
      `First reward: ${firstReward.amount} tokens`
    );

    assert.equal(firstReward.amount, 10);
    assert.equal(firstReward.type, "DAILY_REWARD");

    const updatedLog = await db.dailyLog.findUnique({
      where: { id: dailyLog.id },
    });

    assert.ok(updatedLog);
    assert.equal(updatedLog.tokensAwarded, true);

    console.log("Testing duplicate protection...");

    const secondReward = await awardDailyReward({
      userId: testUser.id,
      dailyLogId: dailyLog.id,
    });

    assert.equal(secondReward.id, firstReward.id);

    const transactionCount =
      await db.tokenTransaction.count({
        where: {
          userId: testUser.id,
        },
      });

    assert.equal(transactionCount, 1);

    console.log("✓ Reward amount is correct");
    console.log("✓ DailyLog.tokensAwarded is true");
    console.log("✓ Duplicate reward was prevented");
    console.log("✓ Only one token transaction exists");
    console.log("");
    console.log("Stage 3 reward test passed.");
  } finally {
    console.log("Cleaning up temporary test data...");

    await db.user.delete({
      where: {
        id: testUser.id,
      },
    });

    console.log("Temporary test data removed.");
  }
}

main()
  .catch((error) => {
    console.error("Token service test failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });