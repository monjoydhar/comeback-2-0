import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettingsSchema } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, settings: true } });
  if (!user?.settings) return NextResponse.json({ error: "User settings not found" }, { status: 404 });
  return NextResponse.json({ name: user.name, email: user.email, settings: { ...user.settings, sleepTargetHours: Number(user.settings.sleepTargetHours) } });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const parsed = userSettingsSchema.safeParse(body.settings ?? body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings", details: parsed.error.flatten() }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 100) return NextResponse.json({ error: "Display name must be 1–100 characters" }, { status: 400 });

  try {
    const [user, settings] = await db.$transaction([
      db.user.update({ where: { id: session.user.id }, data: { name } }),
      db.userSettings.update({ where: { userId: session.user.id }, data: parsed.data }),
    ]);
    return NextResponse.json({ name: user.name, email: user.email, settings: { ...settings, sleepTargetHours: Number(settings.sleepTargetHours) } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to save settings" }, { status: 500 });
  }
}
