import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const data = await db.user.findUnique({ where: { id: userId }, include: { settings: true, dailyLogs: { include: { tasks: true }, orderBy: { date: "asc" } }, tokenTransactions: { orderBy: { createdAt: "asc" } }, progressReports: { orderBy: { createdAt: "asc" } }, emailLogs: { orderBy: { createdAt: "asc" } }, achievements: { orderBy: { createdAt: "asc" } } } });
  if (!data) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { passwordHash: _passwordHash, ...safe } = data;
  return new NextResponse(JSON.stringify(safe, (_, value) => typeof value === "bigint" ? value.toString() : value, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=comeBack-2-0-data.json", "Cache-Control": "private, no-store" } });
}
