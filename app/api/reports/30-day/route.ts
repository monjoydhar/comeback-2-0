import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getThirtyDayReport } from "@/lib/reports/data";
import { renderThirtyDayPdf } from "@/lib/reports/pdf";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const report = await getThirtyDayReport(session.user.id);
    const buffer = await renderThirtyDayPdf(report);
    await db.progressReport.upsert({
      where: { userId_periodStart_periodEnd_reportType: { userId: session.user.id, periodStart: new Date(`${report.periodStart}T00:00:00.000Z`), periodEnd: new Date(`${report.periodEnd}T00:00:00.000Z`), reportType: "THIRTY_DAY" } },
      update: { fileKey: `generated:${report.periodStart}:${report.periodEnd}` },
      create: { userId: session.user.id, periodStart: new Date(`${report.periodStart}T00:00:00.000Z`), periodEnd: new Date(`${report.periodEnd}T00:00:00.000Z`), reportType: "THIRTY_DAY", fileKey: `generated:${report.periodStart}:${report.periodEnd}` },
    });
    return new NextResponse(buffer as unknown as BodyInit, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="comeback-2-0-${report.periodStart}-to-${report.periodEnd}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to generate report" }, { status: 500 });
  }
}
