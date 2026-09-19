import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { GET } from "@/app/api/progress/route";

describe("GET /api/progress authentication", () => {
  it("returns 401 when the user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(undefined as never);

    const response = await GET();

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body).toEqual({
      error: "Unauthorized",
    });
  });
});