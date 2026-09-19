import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProgressSummary } from "@/lib/progress";
import { renderCertificatePdf } from "@/lib/reports/certificate-pdf";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user, progress, achievement] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
    getProgressSummary(session.user.id),
    db.achievement.findUnique({ where: { userId_type: { userId: session.user.id, type: "CERTIFICATE_UNLOCK" } } }),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!progress.certificateUnlocked || !achievement?.unlockedAt) return NextResponse.json({ error: "Certificate is not unlocked" }, { status: 403 });
  const buffer = await renderCertificatePdf({ name: user.name, unlockedAt: achievement.unlockedAt });
  return new NextResponse(buffer as unknown as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="comeback-2-0-certificate.pdf"', "Cache-Control": "private, no-store" } });
}
