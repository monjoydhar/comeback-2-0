import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { GET } from "@/app/api/daily/route";

describe("GET /api/daily authentication", () => {
  it("returns 401 when the user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(undefined as never);

    const request = new Request(
      "http://localhost:3000/api/daily?date=2026-09-20",
    );

    const response = await GET(request);

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body).toEqual({
      error: "Unauthorized",
    });
  });
});