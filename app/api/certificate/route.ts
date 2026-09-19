import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProgressSummary } from "@/lib/progress";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user, progress, achievement] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
    getProgressSummary(session.user.id),
    db.achievement.findUnique({ where: { userId_type: { userId: session.user.id, type: "CERTIFICATE_UNLOCK" } } }),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ name: user.name, ...progress, achievement });
}
