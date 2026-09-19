export type AwaitedReport = {
  user: { name: string; email: string; settings: { timezone: string } };
  periodStart: string;
  periodEnd: string;
  history: Array<{ date: string; completionPercent: number; dayType: string; completedTasks: number; partialTasks: number; missedTasks: number; finalizedAt: Date | null }>;
  tokens: Array<{ amount: number; type: string; reason: string; relatedDate: string | null }>;
  summary: { netTokens: number; remainingTokens: number; progressPercent: number; level: string; certificateUnlocked: boolean };
  streak: number;
  averageCompletion: number;
  missedDays: number;
  partialDays: number;
  completedDays: number;
  rewards: number;
  penalties: number;
};
