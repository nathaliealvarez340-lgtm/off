import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  if (!await consumeRateLimit("community-like", user.id, 50, 60_000)) return NextResponse.json({ success: false, error: "Espera un momento antes de volver a interactuar." }, { status: 429 });
  const { id } = await params;
  const db = getDb();
  const post = await db.communityPost.findFirst({ where: { id, status: "published" }, select: { id: true } });
  if (!post) return NextResponse.json({ success: false, error: "Publicación no encontrada." }, { status: 404 });
  const existing = await db.communityPostLike.findUnique({ where: { postId_userId: { postId: id, userId: user.id } } });
  if (existing) await db.communityPostLike.delete({ where: { id: existing.id } });
  else await db.communityPostLike.create({ data: { postId: id, userId: user.id } });
  return NextResponse.json({ success: true, liked: !existing, likeCount: await db.communityPostLike.count({ where: { postId: id } }) });
}
