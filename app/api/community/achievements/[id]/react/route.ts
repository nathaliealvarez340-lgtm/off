import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("achievement-reaction", user.id, 20, 60_000)) return NextResponse.json({ success: false, error: "Espera un momento." }, { status: 429 });
  const { id } = await params;
  const db = getDb();
  const achievement = await db.memberAchievement.findUnique({ where: { id }, select: { id: true, userId: true, title: true } });
  if (!achievement) return NextResponse.json({ success: false, error: "Logro no encontrado." }, { status: 404 });
  const existing = await db.achievementReaction.findUnique({ where: { achievementId_userId: { achievementId: id, userId: user.id } } });
  if (existing) await db.achievementReaction.delete({ where: { id: existing.id } });
  else {
    await db.achievementReaction.create({ data: { achievementId: id, userId: user.id } });
    if (achievement.userId !== user.id) await db.notification.create({ data: { userId: achievement.userId, type: "CONGRATULATION", title: "Una felicitación desde OFF", message: `${user.name} te felicitó por tu nuevo logro.`, href: "/lounge/community?tab=achievements" } });
  }
  return NextResponse.json({ success: true, liked: !existing, likeCount: await db.achievementReaction.count({ where: { achievementId: id } }) });
}
