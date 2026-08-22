import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectionPairKey } from "@/lib/community";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("member-connection", user.id, 12, 60_000)) return NextResponse.json({ success: false, error: "Espera antes de enviar otra solicitud." }, { status: 429 });
  const body = await request.json().catch(() => null) as { memberId?: unknown; action?: unknown } | null;
  const memberId = typeof body?.memberId === "string" ? body.memberId : "";
  const action = typeof body?.action === "string" ? body.action : "request";
  if (!memberId || memberId === user.id) return NextResponse.json({ success: false, error: "Selecciona otro miembro." }, { status: 400 });
  const db = getDb();
  const member = await db.user.findFirst({ where: { id: memberId, role: "USER" }, select: { id: true, name: true } });
  if (!member) return NextResponse.json({ success: false, error: "Miembro no encontrado." }, { status: 404 });
  const blocked = await db.memberBlock.findFirst({ where: { OR: [{ blockerId: user.id, blockedId: memberId }, { blockerId: memberId, blockedId: user.id }] }, select: { id: true } });
  if (blocked) return NextResponse.json({ success: false, error: "Esta interacción no está disponible." }, { status: 403 });
  const pairKey = connectionPairKey(user.id, memberId);
  const existing = await db.memberConnection.findUnique({ where: { pairKey } });

  if (action === "request") {
    if (existing?.status === "CONNECTED") return NextResponse.json({ success: true, status: "CONNECTED" });
    if (existing?.status === "PENDING") return NextResponse.json({ success: true, status: "PENDING" });
    await db.$transaction([
      db.memberConnection.upsert({ where: { pairKey }, create: { pairKey, requesterId: user.id, receiverId: memberId }, update: { requesterId: user.id, receiverId: memberId, status: "PENDING" } }),
      db.notification.create({ data: { userId: memberId, type: "CONNECTION_REQUEST", title: "Nueva conexión", message: `${user.name} quiere conectar contigo.`, href: "/lounge/community?panel=requests" } }),
    ]);
    return NextResponse.json({ success: true, status: "PENDING" });
  }

  if (!existing || existing.receiverId !== user.id || existing.status !== "PENDING") return NextResponse.json({ success: false, error: "La solicitud ya no está disponible." }, { status: 404 });
  if (action === "accept") {
    await db.$transaction([
      db.memberConnection.update({ where: { id: existing.id }, data: { status: "CONNECTED" } }),
      db.notification.create({ data: { userId: existing.requesterId, type: "CONNECTION_ACCEPTED", title: "Conexión aceptada", message: `${user.name} aceptó tu solicitud de conexión.`, href: `/lounge/community/member/${user.id}` } }),
    ]);
    return NextResponse.json({ success: true, status: "CONNECTED" });
  }
  if (action === "ignore") {
    await db.memberConnection.update({ where: { id: existing.id }, data: { status: "DECLINED" } });
    return NextResponse.json({ success: true, status: "DECLINED" });
  }
  return NextResponse.json({ success: false, error: "Acción inválida." }, { status: 400 });
}
