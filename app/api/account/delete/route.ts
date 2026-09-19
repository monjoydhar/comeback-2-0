import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { passwordSchema } from "@/lib/validation";
import { signOut } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const parsed = passwordSchema.safeParse(body?.password);
  if (!parsed.success) return NextResponse.json({ error: "Password is required" }, { status: 400 });
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(parsed.data, user.passwordHash))) return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  await db.user.delete({ where: { id: session.user.id } });
  await signOut({ redirectTo: "/login" });
  return NextResponse.json({ deleted: true });
}
