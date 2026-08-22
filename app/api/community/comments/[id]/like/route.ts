import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("community-comment-like", user.id, 60, 60_000)) return NextResponse.json({ success: false, error: "Espera un momento." }, { status: 429 });
  const { id } = await params;
  const db = getDb();
  const comment = await db.communityComment.findFirst({ where: { id, status: "PUBLISHED", post: { status: "published" } }, select: { id: true } });
  if (!comment) return NextResponse.json({ success: false, error: "Comentario no encontrado." }, { status: 404 });
  const existing = await db.communityCommentLike.findUnique({ where: { commentId_userId: { commentId: id, userId: user.id } } });
  if (existing) await db.communityCommentLike.delete({ where: { id: existing.id } });
  else await db.communityCommentLike.create({ data: { commentId: id, userId: user.id } });
  return NextResponse.json({ success: true, liked: !existing, likeCount: await db.communityCommentLike.count({ where: { commentId: id } }) });
}
