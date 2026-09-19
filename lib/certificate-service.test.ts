import { db } from "@/lib/db";
import { unlockCertificate } from "@/lib/certificate-service";

async function main() {
  console.log("Creating temporary test user...");

  const user = await db.user.create({
    data: {
      name: "Certificate Test User",
      email: `certificate-test-${Date.now()}@example.com`,
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
    console.log("Testing below 600 tokens...");

    const locked = await unlockCertificate(user.id);

    if (locked !== null) {
      throw new Error("Certificate should remain locked below 600 tokens.");
    }

    console.log("✓ Certificate remains locked below 600");

    console.log("Creating 600 tokens...");

    await db.tokenTransaction.create({
      data: {
        userId: user.id,
        amount: 600,
        type: "DAILY_REWARD",
        reason: "Certificate unlock test",
        idempotencyKey: `certificate-test-${Date.now()}`,
      },
    });

    console.log("Testing certificate unlock...");

    const achievement = await unlockCertificate(user.id);

    if (!achievement) {
      throw new Error("Certificate should unlock at 600 tokens.");
    }

    if (achievement.type !== "CERTIFICATE_UNLOCK") {
      throw new Error("Incorrect achievement type.");
    }

    if (achievement.title !== "Comeback Complete") {
      throw new Error("Incorrect certificate title.");
    }

    console.log("✓ Certificate unlocked at 600 tokens");

    console.log("Testing duplicate protection...");

    const duplicateAchievement = await unlockCertificate(user.id);

    if (!duplicateAchievement) {
      throw new Error("Duplicate call should return the existing achievement.");
    }

    if (duplicateAchievement.id !== achievement.id) {
      throw new Error("Duplicate call created a different achievement.");
    }

    const achievementCount = await db.achievement.count({
      where: {
        userId: user.id,
        type: "CERTIFICATE_UNLOCK",
      },
    });

    if (achievementCount !== 1) {
      throw new Error(
        `Expected exactly 1 certificate achievement, found ${achievementCount}.`,
      );
    }

    console.log("✓ Duplicate certificate unlock was prevented");
    console.log("✓ Only one certificate achievement exists");

    console.log("\nStage 3 certificate test passed.");
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