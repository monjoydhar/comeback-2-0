export function tokensForCompletion(
  completionPercent: number
): number {
  if (
    !Number.isFinite(completionPercent) ||
    completionPercent < 0
  ) {
    throw new Error("INVALID_COMPLETION_PERCENT");
  }

  const completion = Math.min(100, completionPercent);

  if (completion < 40) {
    return 0;
  }

  if (completion < 60) {
    return 3;
  }

  if (completion < 80) {
    return 6;
  }

  if (completion < 100) {
    return 8;
  }

  return 10;
}