import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("community-greeting", user.id, 5, 10 * 60_000)) return NextResponse.json({ success: false, error: "Ya enviaste varios saludos. Vuelve en unos minutos." }, { status: 429 });
  const body = await request.json().catch(() => null) as { memberId?: unknown } | null;
  const memberId = typeof body?.memberId === "string" ? body.memberId : "";
  if (!memberId || memberId === user.id) return NextResponse.json({ success: false, error: "Selecciona otro miembro." }, { status: 400 });
  const db = getDb();
  const member = await db.user.findFirst({ where: { id: memberId, role: "USER" }, select: { id: true } });
  if (!member) return NextResponse.json({ success: false, error: "Miembro no encontrado." }, { status: 404 });
  const blocked = await db.memberBlock.findFirst({ where: { OR: [{ blockerId: user.id, blockedId: memberId }, { blockerId: memberId, blockedId: user.id }] }, select: { id: true } });
  if (blocked) return NextResponse.json({ success: false, error: "Esta interacción no está disponible." }, { status: 403 });
  await db.notification.create({ data: { userId: memberId, type: "GREETING", title: "Un saludo desde OFF", message: `${user.name} te mandó un saludo desde OFF.`, href: `/lounge/community/member/${user.id}` } });
  return NextResponse.json({ success: true });
}
