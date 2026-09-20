import { db } from "@/lib/db";
import { getLocalDateString } from "@/lib/timezone";
import type { EmailEventType } from "@prisma/client";

const RESEND_API = "https://api.resend.com/emails";

export type EmailPayload = {
  userId: string;
  eventType: EmailEventType;
  relatedDate?: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
};


function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
}

async function claimEmail(input: EmailPayload) {
  const relatedDate = input.relatedDate ? new Date(`${input.relatedDate}T00:00:00.000Z`) : null;
  
const existing = await db.emailLog.findFirst({
  where: {
    userId: input.userId,
    eventType: input.eventType,
    relatedDate,
  },
});

  // A sent or currently-processing event is already claimed.
  if (existing?.status === "SENT" || existing?.status === "PENDING") return null;

  // Failed events are safely retryable on a later cron/manual attempt.
  if (existing?.status === "FAILED") {
    const claimed = await db.emailLog.updateMany({
      where: { id: existing.id, status: "FAILED" },
      data: { status: "PENDING", error: null },
    });
    return claimed.count === 1 ? { ...existing, status: "PENDING" as const, error: null } : null;
  }

  try {
    return await db.emailLog.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        relatedDate,
        status: "PENDING",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) return null;
    throw error;
  }
}

export async function sendEmailEvent(input: EmailPayload) {
  if (!hasResendConfig()) return { sent: false, skipped: true, reason: "RESEND_NOT_CONFIGURED" };

  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { email: true, name: true, settings: true },
  });
  if (!user?.settings) return { sent: false, skipped: true, reason: "USER_SETTINGS_NOT_FOUND" };

  const enabled = {
    DAILY_REMINDER: user.settings.emailDailyReminder,
    MISSED_DAY: user.settings.emailMissedDay,
    THIRTY_DAY_REPORT: user.settings.emailThirtyDayReport,
    LEVEL_UP: user.settings.emailLevelUp,
    CERTIFICATE_UNLOCK: user.settings.emailCertificateUnlock,
  }[input.eventType];
  if (!enabled) return { sent: false, skipped: true, reason: "EMAIL_DISABLED" };

  const log = await claimEmail(input);
  if (!log) return { sent: false, skipped: true, reason: "ALREADY_SENT" };

  try {
    const response = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [user.email],
        subject: input.subject,
        html: input.html,
        attachments: input.attachments,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof payload?.message === "string" ? payload.message : `Resend HTTP ${response.status}`);

    await db.emailLog.update({
      where: { id: log.id },
      data: { status: "SENT", providerId: typeof payload?.id === "string" ? payload.id : null, sentAt: new Date() },
    });
    return { sent: true, skipped: false, providerId: payload?.id ?? null };
  } catch (error) {
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown email error" },
    });
    return { sent: false, skipped: false, reason: "SEND_FAILED" };
  }
}

export function emailHtml(title: string, body: string, cta?: { label: string; href: string }) {
  const safeTitle = escapeHtml(title);
  const safeCta = cta ? { label: escapeHtml(cta.label), href: escapeHtml(cta.href) } : undefined;
  return `<!doctype html><html><body style="margin:0;background:#111;color:#FAF9F6;font-family:Arial,sans-serif"><div style="max-width:620px;margin:0 auto;padding:40px 24px"><div style="font-size:12px;letter-spacing:.2em;color:#C9A574;font-weight:700">COMEBACK 2.0</div><h1 style="font-size:28px;margin:28px 0 12px">${safeTitle}</h1><div style="color:#B9B5AE;font-size:15px;line-height:1.7">${body}</div>${safeCta ? `<p style="margin-top:28px"><a href="${safeCta.href}" style="display:inline-block;background:#C9A574;color:#111;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${safeCta.label}</a></p>` : ""}<p style="margin-top:40px;color:#6f6b65;font-size:12px">Private personal workspace · Comeback 2.0</p></div></body></html>`;
}

export function absoluteAppUrl(path: string) {
  const base = process.env.APP_URL?.trim() || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

export function localDateForUser(date: Date, timezone: string) {
  return getLocalDateString(date, timezone);
}
