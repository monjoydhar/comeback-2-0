import assert from "node:assert/strict";
import { db } from "@/lib/db";
import {
  levelFromNetTokens,
  certificateUnlocked,
  getNetTokens,
  getProgressSummary,
} from "@/lib/progress";

async function main() {
  const testEmail = `progress-test-${Date.now()}@example.com`;

  console.log("Creating temporary test user...");

  const user = await db.user.create({
    data: {
      name: "Progress Test User",
      email: testEmail,
      passwordHash: "test-only",
      role: "USER",
    },
  });

  try {
    console.log("Testing level rules...");

    assert.equal(levelFromNetTokens(0), "Rookie");
    assert.equal(levelFromNetTokens(99), "Rookie");
    assert.equal(levelFromNetTokens(100), "Grinder");
    assert.equal(levelFromNetTokens(200), "Disciplined");
    assert.equal(levelFromNetTokens(300), "Beast Mode");
    assert.equal(levelFromNetTokens(400), "Unstoppable");
    assert.equal(levelFromNetTokens(500), "Comeback Complete");

    console.log("✓ Level rules passed");

    console.log("Testing certificate rule...");

    assert.equal(certificateUnlocked(599), false);
    assert.equal(certificateUnlocked(600), true);

    console.log("✓ Certificate rule passed");

    console.log("Creating test token transactions...");

    await db.tokenTransaction.createMany({
      data: [
        {
          userId: user.id,
          amount: 10,
          type: "DAILY_REWARD",
          reason: "Test daily reward",
          idempotencyKey: `progress-test-reward-${Date.now()}`,
        },
        {
          userId: user.id,
          amount: 8,
          type: "DAILY_REWARD",
          reason: "Test daily reward",
          idempotencyKey: `progress-test-reward-2-${Date.now()}`,
        },
        {
          userId: user.id,
          amount: -5,
          type: "MISSED_DAY_PENALTY",
          reason: "Test missed-day penalty",
          idempotencyKey: `progress-test-penalty-${Date.now()}`,
        },
      ],
    });

    const netTokens = await getNetTokens(user.id);

    console.log(`Net tokens: ${netTokens}`);

    assert.equal(netTokens, 13);

    const summary = await getProgressSummary(user.id);

    assert.equal(summary.netTokens, 13);
    assert.equal(summary.level, "Rookie");
    assert.equal(summary.certificateUnlocked, false);

    console.log("✓ Net token calculation passed");
    console.log("✓ Progress summary passed");
    console.log("");
    console.log("Stage 3 progress test passed.");
  } finally {
    console.log("Cleaning up temporary test data...");

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
    console.error("Progress test failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });