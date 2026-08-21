import { NextResponse } from "next/server";
import type { GalleryShareType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

const SHARE_TYPES = ["INTERNAL", "EXTERNAL", "COPY_LINK"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("gallery-share", user.id, 20, 60_000)) return NextResponse.json({ success: false, error: "Espera un momento antes de compartir de nuevo." }, { status: 429 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { type?: unknown; recipientId?: unknown } | null;
  const type = typeof body?.type === "string" && SHARE_TYPES.includes(body.type as (typeof SHARE_TYPES)[number]) ? body.type as GalleryShareType : null;
  const recipientId = typeof body?.recipientId === "string" ? body.recipientId : null;
  if (!type) return NextResponse.json({ success: false, error: "Tipo de share inválido." }, { status: 400 });
  const db = getDb();
  const post = await db.galleryPost.findFirst({ where: { id, status: "published" }, select: { id: true, caption: true } });
  if (!post) return NextResponse.json({ success: false, error: "Publicación no encontrada." }, { status: 404 });

  if (type === "INTERNAL") {
    if (!recipientId || recipientId === user.id) return NextResponse.json({ success: false, error: "Selecciona otro miembro." }, { status: 400 });
    const recipient = await db.user.findFirst({ where: { id: recipientId, role: "USER" }, select: { id: true } });
    if (!recipient) return NextResponse.json({ success: false, error: "Miembro no encontrado." }, { status: 404 });
    await db.$transaction([
      db.galleryPostShare.create({ data: { postId: id, senderId: user.id, recipientId: recipient.id, type } }),
      db.notification.create({ data: { userId: recipient.id, type: "GALLERY_SHARE", title: "Una publicación para ti", message: `${user.name} compartió una publicación contigo.`, href: `/off/post/${id}` } }),
    ]);
  } else {
    await db.galleryPostShare.create({ data: { postId: id, senderId: user.id, type } });
  }
  return NextResponse.json({ success: true });
}
