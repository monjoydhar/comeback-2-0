import { describe, expect, it } from "vitest";

import { getCurrentStreak } from "./streak";

describe("streak calculation", () => {
  it("returns 0 when there are no finalized qualifying days", async () => {
    expect(await getCurrentStreak("non-existent-user")).toBe(0);
  });
});