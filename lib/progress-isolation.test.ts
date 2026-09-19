import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/progress", () => ({
  getProgressSummary: vi.fn(),
}));

vi.mock("@/lib/progress-history", () => ({
  getProgressHistory: vi.fn(),
}));

vi.mock("@/lib/token-history", () => ({
  getTokenHistory: vi.fn(),
}));

vi.mock("@/lib/streak", () => ({
  getCurrentStreak: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getProgressSummary } from "@/lib/progress";
import { getProgressHistory } from "@/lib/progress-history";
import { getTokenHistory } from "@/lib/token-history";
import { getCurrentStreak } from "@/lib/streak";
import { GET } from "@/app/api/progress/route";

describe("GET /api/progress user isolation", () => {
  it("uses the authenticated user's ID for all progress queries", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "user-a",
      },
    } as never);

    vi.mocked(getProgressSummary).mockResolvedValue({
      netTokens: 100,
      remainingTokens: 500,
      progressPercent: 16.6667,
      level: "Grinder",
      certificateUnlocked: false,
    });

    vi.mocked(getProgressHistory).mockResolvedValue([]);
    vi.mocked(getTokenHistory).mockResolvedValue([]);
    vi.mocked(getCurrentStreak).mockResolvedValue(3);

    const response = await GET();

    expect(response.status).toBe(200);

    expect(getProgressSummary).toHaveBeenCalledWith("user-a");
    expect(getProgressHistory).toHaveBeenCalledWith("user-a");
    expect(getTokenHistory).toHaveBeenCalledWith("user-a");
    expect(getCurrentStreak).toHaveBeenCalledWith("user-a");

    expect(getProgressSummary).not.toHaveBeenCalledWith("user-b");
    expect(getProgressHistory).not.toHaveBeenCalledWith("user-b");
    expect(getTokenHistory).not.toHaveBeenCalledWith("user-b");
    expect(getCurrentStreak).not.toHaveBeenCalledWith("user-b");
  });
});