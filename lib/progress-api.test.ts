import { describe, expect, it } from "vitest";

import { levelFromNetTokens, certificateUnlocked } from "./progress";

describe("progress calculations", () => {
  it("starts at Rookie below 100 tokens", () => {
    expect(levelFromNetTokens(0)).toBe("Rookie");
    expect(levelFromNetTokens(99)).toBe("Rookie");
  });

  it("moves through the level thresholds", () => {
    expect(levelFromNetTokens(100)).toBe("Grinder");
    expect(levelFromNetTokens(200)).toBe("Disciplined");
    expect(levelFromNetTokens(300)).toBe("Beast Mode");
    expect(levelFromNetTokens(400)).toBe("Unstoppable");
    expect(levelFromNetTokens(500)).toBe("Comeback Complete");
  });

  it("keeps certificate locked below 600", () => {
    expect(certificateUnlocked(599)).toBe(false);
  });

  it("unlocks certificate at 600", () => {
    expect(certificateUnlocked(600)).toBe(true);
  });

  it("keeps certificate unlocked above 600", () => {
    expect(certificateUnlocked(750)).toBe(true);
  });
});